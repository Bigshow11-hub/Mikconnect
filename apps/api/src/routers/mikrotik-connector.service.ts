import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { RouterOSAPI } from "node-routeros";

/**
 * MikrotikConnectorService — mikconnect.
 *
 * Couche d'accès aux routeurs Mikrotik via l'API RouterOS.
 *
 * Deux modes :
 *  - MOCK (défaut en dev) : aucune connexion réseau. Valide la forme des
 *    entrées et simule une réponse crédible (modèle, latence). Permet de
 *    développer l'onboarding sans routeur physique.
 *  - REAL (MIKROTIK_MOCK=false) : utilise node-routeros pour un vrai
 *    /system/identity/get. Câblé pour la prod / staging avec routeur.
 *
 * On n'expose jamais le mot de passe en clair hors de cette fonction : il
 * transite du client au service, est utilisé pour le test, puis oublié.
 * Le stockage chiffré est fait par RoutersService (CryptoService).
 */
export interface RouterTestInput {
  host: string;
  apiUser: string;
  apiPassword: string;
  /** Port API RouterOS (8728 par défaut, 8729 TLS). */
  apiPort?: number;
  /** Active API-SSL. Le port 8729 l'active aussi implicitement. */
  apiTls?: boolean;
}

export interface RouterTestResult {
  ok: boolean;
  /** Message FR concret pour l'utilisateur (jamais de jargon routeur brut). */
  message: string;
  /** Détail technique optionnel (modèle, version ROS) — affiché en mono. */
  detail?: string;
}

/**
 * Utilisateur hotspot à pousser vers le routeur (RADIUS/Hotspot user).
 * Le code ticket devient le nom d'utilisateur ET le mot de passe hotspot.
 */
export interface HotspotUserInput {
  /** Code ticket (ex. MK-7Q3F-AA) — utilisé comme username + password. */
  code: string;
  /** Durée d'accès en minutes (limit-uptime au format RouterOS). */
  durationMinutes: number;
  /** Limite data en Mo (optionnel, limit-bytes-total). */
  dataLimitMb?: number | null;
  /** Nom du profil hotspot côté routeur (optionnel). */
  profile?: string;
}

export interface PushTicketsResult {
  ok: boolean;
  pushed: number;
  failed: number;
  message: string;
}

export interface HotspotActiveUser {
  id: string;
  server: string;
  username: string;
  address: string;
  macAddress: string;
  loginBy: string;
  uptime: string;
  sessionTimeLeft: string | null;
  idleTime: string;
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  radius: boolean;
  blocked: boolean;
}

export interface HotspotActiveUsersResult {
  ok: boolean;
  message: string;
  users: HotspotActiveUser[];
}

export interface HotspotSessionActionResult {
  ok: boolean;
  message: string;
}

const DEFAULT_API_PORT = 8728;

// Host valide : IP(v4) ou hostname/DDNS avec au moins un point.
const HOST_RE =
  /^(\d{1,3}\.){3}\d{1,3}$|^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;

@Injectable()
export class MikrotikConnectorService {
  private readonly logger = new Logger(MikrotikConnectorService.name);
  private readonly mock: boolean;
  private readonly timeoutSeconds: number;
  private readonly tlsRejectUnauthorized: boolean;

  constructor(private readonly config: ConfigService) {
    const flag = this.config.get<string>("MIKROTIK_MOCK");
    const production = this.config.get<string>("NODE_ENV") === "production";
    // En production, l'absence de configuration signifie toujours mode réel.
    // Les données simulées restent réservées au développement et aux tests.
    this.mock = flag ? flag !== "false" : !production;
    this.timeoutSeconds = Number(this.config.get<string>("MIKROTIK_API_TIMEOUT_SECONDS") ?? 10);
    this.tlsRejectUnauthorized =
      this.config.get<string>("MIKROTIK_TLS_REJECT_UNAUTHORIZED") !== "false";
  }

  async testConnection(input: RouterTestInput): Promise<RouterTestResult> {
    const host = input.host.trim();
    const apiUser = input.apiUser.trim();
    const apiTls = input.apiTls ?? input.apiPort === 8729;
    const apiPort = input.apiPort ?? (apiTls ? 8729 : DEFAULT_API_PORT);

    if (!host || !HOST_RE.test(host)) {
      throw new BadRequestException("Adresse IP ou DDNS invalide.");
    }
    if (!apiUser) {
      throw new BadRequestException("Utilisateur API requis.");
    }
    if (!input.apiPassword) {
      throw new BadRequestException("Mot de passe API requis.");
    }

    return this.mock
      ? this.mockTest(host, apiUser, apiPort)
      : this.realTest({ ...input, host, apiUser, apiPort, apiTls });
  }

  // --- MOCK : simule un routeur reachable ---

  private async mockTest(
    host: string,
    apiUser: string,
    apiPort: number,
  ): Promise<RouterTestResult> {
    // Latence simulée crédible (3G / LAN local).
    await delay(600);

    // Cas d'échec simulés pour la démo : user "fail" ou host "0.0.0.0".
    if (apiUser === "fail") {
      return {
        ok: false,
        message:
          "Identifiants API refusés. Vérifiez l'utilisateur et le mot de passe dans Winbox → System → Users.",
      };
    }
    if (host === "0.0.0.0") {
      return {
        ok: false,
        message:
          "Hôte injoignable. Vérifiez l'IP ou que l'API REST est activée (Winbox → IP Services → API).",
      };
    }

    this.logger.log(`[MOCK] test OK — ${host}:${apiPort} user=${apiUser}`);
    return {
      ok: true,
      message: "Routeur accessible.",
      detail: "RB2011UiAS · RouterOS 7.14",
    };
  }

  // --- REAL : node-routeros (prod / staging) ---

  private async realTest(input: Required<RouterTestInput>): Promise<RouterTestResult> {
    const conn = await this.createConnection(input);
    try {
      await conn.connect();
      const identity = await conn.write("/system/identity/print", ["=.proplist=name"]);
      const name = (identity as Array<{ name?: string }>)[0]?.name ?? "Routeur";
      const resource = await conn.write("/system/resource/print", [
        "=.proplist=version,board-name",
      ]);
      const version = (resource as Array<{ version?: string }>)[0]?.version ?? "";
      const board = (resource as Array<{ "board-name"?: string }>)[0]?.["board-name"] ?? "";
      return {
        ok: true,
        message: "Routeur accessible.",
        detail: `${board || name}${version ? ` · RouterOS ${version}` : ""}`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`test FAILED — ${input.host}:${input.apiPort} — ${msg}`);
      return { ok: false, message: this.connectionFailureMessage(msg, input.apiTls) };
    } finally {
      await this.closeQuietly(conn);
    }
  }

  // --- Utilisateurs Hotspot actifs ---

  async getActiveHotspotUsers(credentials: RouterTestInput): Promise<HotspotActiveUsersResult> {
    return this.mock
      ? this.mockActiveHotspotUsers(credentials)
      : this.realActiveHotspotUsers(credentials);
  }

  private async mockActiveHotspotUsers(
    credentials: RouterTestInput,
  ): Promise<HotspotActiveUsersResult> {
    await delay(350);
    if (credentials.host === "0.0.0.0") {
      return {
        ok: false,
        users: [],
        message: "Routeur hors ligne. Impossible de lire les connexions actives.",
      };
    }

    const suffix = credentials.host.replace(/\D/g, "").slice(-2) || "01";
    const addressSeed = Number(suffix) % 200;
    return {
      ok: true,
      message: "Connexions actives synchronisées.",
      users: [
        {
          id: `*${suffix}A`,
          server: "hotspot-principal",
          username: `MK-${suffix}7Q-AA`,
          address: `10.5.50.${addressSeed + 10}`,
          macAddress: "34:12:F9:8A:21:4C",
          loginBy: "http-chap",
          uptime: "1h24m12s",
          sessionTimeLeft: "2h35m48s",
          idleTime: "12s",
          bytesIn: 18_450_232,
          bytesOut: 104_923_412,
          packetsIn: 45_102,
          packetsOut: 78_245,
          radius: false,
          blocked: false,
        },
        {
          id: `*${suffix}B`,
          server: "hotspot-principal",
          username: `MK-${suffix}3M-KP`,
          address: `10.5.50.${addressSeed + 11}`,
          macAddress: "A8:6B:AD:17:92:0F",
          loginBy: "mac-cookie",
          uptime: "38m04s",
          sessionTimeLeft: "21m56s",
          idleTime: "3s",
          bytesIn: 7_284_991,
          bytesOut: 36_109_028,
          packetsIn: 18_201,
          packetsOut: 29_884,
          radius: false,
          blocked: false,
        },
      ],
    };
  }

  private async realActiveHotspotUsers(
    credentials: RouterTestInput,
  ): Promise<HotspotActiveUsersResult> {
    const apiTls = credentials.apiTls ?? credentials.apiPort === 8729;
    const normalized: Required<RouterTestInput> = {
      ...credentials,
      host: credentials.host.trim(),
      apiUser: credentials.apiUser.trim(),
      apiTls,
      apiPort: credentials.apiPort ?? (apiTls ? 8729 : DEFAULT_API_PORT),
    };
    const conn = await this.createConnection(normalized);

    try {
      await conn.connect();
      const rows = await conn.write("/ip/hotspot/active/print", [
        "=.proplist=.id,server,user,address,mac-address,login-by,uptime,session-time-left,idle-time,bytes-in,bytes-out,packets-in,packets-out,radius,blocked",
      ]);
      return {
        ok: true,
        message: "Connexions actives synchronisées.",
        users: rows.map((row) => this.mapActiveUser(row as Record<string, unknown>)),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`active users FAILED — ${normalized.host}:${normalized.apiPort} — ${msg}`);
      return {
        ok: false,
        users: [],
        message: this.connectionFailureMessage(msg, normalized.apiTls),
      };
    } finally {
      await this.closeQuietly(conn);
    }
  }

  private mapActiveUser(row: Record<string, unknown>): HotspotActiveUser {
    const text = (key: string) => (typeof row[key] === "string" ? row[key] : "");
    const number = (key: string) => {
      const parsed = Number(text(key));
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    };
    const yes = (key: string) => text(key) === "true" || text(key) === "yes";

    return {
      id: text(".id"),
      server: text("server"),
      username: text("user"),
      address: text("address"),
      macAddress: text("mac-address"),
      loginBy: text("login-by"),
      uptime: text("uptime"),
      sessionTimeLeft: text("session-time-left") || null,
      idleTime: text("idle-time"),
      bytesIn: number("bytes-in"),
      bytesOut: number("bytes-out"),
      packetsIn: number("packets-in"),
      packetsOut: number("packets-out"),
      radius: yes("radius"),
      blocked: yes("blocked"),
    };
  }

  async disconnectHotspotUser(
    credentials: RouterTestInput,
    sessionId: string,
  ): Promise<HotspotSessionActionResult> {
    if (this.mock) {
      await delay(220);
      this.logger.log(`[MOCK] disconnect hotspot session ${sessionId}`);
      return { ok: true, message: "La session a été déconnectée." };
    }
    return this.runSessionAction(
      credentials,
      async (connection) => {
        await connection.write("/ip/hotspot/active/remove", [`=.id=${sessionId}`]);
      },
      "La session a été déconnectée.",
    );
  }

  async blockHotspotUser(
    credentials: RouterTestInput,
    sessionId: string,
    macAddress: string,
  ): Promise<HotspotSessionActionResult> {
    if (this.mock) {
      await delay(260);
      this.logger.log(`[MOCK] block hotspot client ${macAddress}`);
      return { ok: true, message: "L’appareil a été bloqué et déconnecté." };
    }
    return this.runSessionAction(
      credentials,
      async (connection) => {
        await connection.write("/ip/hotspot/ip-binding/add", [
          `=mac-address=${macAddress}`,
          "=type=blocked",
          "=comment=Bloqué depuis mikconnect",
        ]);
        await connection.write("/ip/hotspot/active/remove", [`=.id=${sessionId}`]);
      },
      "L’appareil a été bloqué et déconnecté.",
    );
  }

  private async runSessionAction(
    credentials: RouterTestInput,
    action: (connection: RouterOSAPI) => Promise<void>,
    successMessage: string,
  ): Promise<HotspotSessionActionResult> {
    const apiTls = credentials.apiTls ?? credentials.apiPort === 8729;
    const normalized: Required<RouterTestInput> = {
      ...credentials,
      host: credentials.host.trim(),
      apiUser: credentials.apiUser.trim(),
      apiTls,
      apiPort: credentials.apiPort ?? (apiTls ? 8729 : DEFAULT_API_PORT),
    };
    const connection = await this.createConnection(normalized);
    try {
      await connection.connect();
      await action(connection);
      return { ok: true, message: successMessage };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`hotspot session action FAILED — ${message}`);
      return { ok: false, message: this.connectionFailureMessage(message, normalized.apiTls) };
    } finally {
      await this.closeQuietly(connection);
    }
  }

  // --- Push tickets vers le routeur (Hotspot users) ---

  /**
   * Pousse une liste d'utilisateurs hotspot vers le routeur.
   * Chaque code ticket devient un utilisateur hotspot (name=code,
   * password=code, limit-uptime=duration).
   *
   * @param credentials credentials API du routeur (déchiffrés par l'appelant).
   * @param users liste des utilisateurs à créer.
   */
  async pushTickets(
    credentials: RouterTestInput,
    users: HotspotUserInput[],
  ): Promise<PushTicketsResult> {
    if (users.length === 0) {
      return { ok: true, pushed: 0, failed: 0, message: "Aucun ticket à pousser." };
    }
    return this.mock ? this.mockPush(credentials, users) : this.realPush(credentials, users);
  }

  private async mockPush(
    credentials: RouterTestInput,
    users: HotspotUserInput[],
  ): Promise<PushTicketsResult> {
    // Latence simulée proportionnelle au nombre de tickets (push batch).
    await delay(Math.min(200 + users.length * 15, 1500));

    // Cas démo : host "0.0.0.0" simule un routeur hors ligne.
    if (credentials.host === "0.0.0.0") {
      return {
        ok: false,
        pushed: 0,
        failed: users.length,
        message: "Routeur hors ligne. Les tickets seront repoussés automatiquement.",
      };
    }

    this.logger.log(`[MOCK] push ${users.length} tickets → ${credentials.host}`);
    return {
      ok: true,
      pushed: users.length,
      failed: 0,
      message: `${users.length} ticket${users.length > 1 ? "s" : ""} poussé${users.length > 1 ? "s" : ""} au routeur.`,
    };
  }

  private async realPush(
    credentials: RouterTestInput,
    users: HotspotUserInput[],
  ): Promise<PushTicketsResult> {
    const apiTls = credentials.apiTls ?? credentials.apiPort === 8729;
    const normalized: Required<RouterTestInput> = {
      ...credentials,
      host: credentials.host.trim(),
      apiUser: credentials.apiUser.trim(),
      apiTls,
      apiPort: credentials.apiPort ?? (apiTls ? 8729 : DEFAULT_API_PORT),
    };
    const conn = await this.createConnection(normalized);

    let pushed = 0;
    let failed = 0;

    try {
      await conn.connect();
      for (const user of users) {
        try {
          // /ip/hotspot/user/add — name=code, password=code, limit-uptime.
          // limit-uptime au format RouterOS : "1h", "1d", "7d", etc.
          await conn.write("/ip/hotspot/user/add", [
            `=name=${user.code}`,
            `=password=${user.code}`,
            `=limit-uptime=${minutesToRouteros(user.durationMinutes)}`,
            ...(user.profile ? [`=profile=${user.profile}`] : []),
            ...(user.dataLimitMb ? [`=limit-bytes-total=${user.dataLimitMb * 1024 * 1024}`] : []),
          ]);
          pushed++;
        } catch (err) {
          failed++;
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`push FAILED for ${user.code} — ${msg}`);
        }
      }
      return {
        ok: failed === 0,
        pushed,
        failed,
        message:
          failed === 0
            ? `${pushed} ticket${pushed > 1 ? "s" : ""} poussé${pushed > 1 ? "s" : ""} au routeur.`
            : `${pushed} poussés, ${failed} échecs. Réessayez pour les tickets restants.`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`push connect FAILED — ${credentials.host} — ${msg}`);
      return {
        ok: false,
        pushed: 0,
        failed: users.length,
        message: "Routeur hors ligne. Les tickets seront repoussés automatiquement.",
      };
    } finally {
      await this.closeQuietly(conn);
    }
  }

  private async createConnection(input: Required<RouterTestInput>) {
    // Chargement dynamique : le mode mock ne charge jamais le client réseau.
    const { RouterOSAPI } = await import("node-routeros");
    const timeout = Number.isFinite(this.timeoutSeconds)
      ? Math.min(Math.max(this.timeoutSeconds, 3), 60)
      : 10;

    return new RouterOSAPI({
      host: input.host,
      port: input.apiPort,
      user: input.apiUser,
      password: input.apiPassword,
      timeout,
      keepalive: false,
      ...(input.apiTls ? { tls: { rejectUnauthorized: this.tlsRejectUnauthorized } } : {}),
    });
  }

  private async closeQuietly(conn: RouterOSAPI): Promise<void> {
    if (!conn.connected) return;
    try {
      await conn.close();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.debug(`RouterOS close ignored — ${msg}`);
    }
  }

  private connectionFailureMessage(message: string, tls: boolean): string {
    if (/certificate|self[- ]signed|unable to verify|ERR_TLS/i.test(message)) {
      return "Certificat API-SSL non approuvé. Installez une chaîne valide ou configurez l'autorité du routeur.";
    }
    if (
      /invalid user|invalid password|username or password is invalid|could not authenticate|authentication failed/i.test(
        message,
      )
    ) {
      return "Identifiants API refusés. Vérifiez l'utilisateur et son groupe api/read/write dans RouterOS.";
    }
    if (/timeout|ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH|SOCKTMOUT/i.test(message)) {
      return `Hôte injoignable. Vérifiez l'adresse, le port ${tls ? 8729 : 8728} et le service ${tls ? "api-ssl" : "api"}.`;
    }
    return "Connexion RouterOS impossible. Vérifiez le service API et les droits du compte mikconnect.";
  }
}

/** Convertit des minutes en format uptime RouterOS (ex. 60 → "1h", 1440 → "1d"). */
function minutesToRouteros(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes % 1440 === 0) return `${minutes / 1440}d`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  // RouterOS accepte aussi "1h30m" — on décompose.
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${m}m`;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
