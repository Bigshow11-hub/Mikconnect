import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CryptoService } from "../common/crypto.service";
import {
  MikrotikConnectorService,
  type RouterTestInput,
  type RouterTestResult,
} from "./mikrotik-connector.service";
import { type CreateRouterDto } from "./dto/routers.dto";
import { RouterStatus } from "@prisma/client";

/**
 * RoutersService — mikconnect.
 *
 * CRUD des routeurs d'un tenant (RLS via PrismaService isole par tenantId).
 *  - create : chiffre le mot de passe API (CryptoService AES-256-GCM) avant
 *    l'écriture, teste la connexion, et marque le statut ONLINE/OFFLINE.
 *  - test : valide la connexion sans persister (utilisé par l'onboarding
 *    avant le save final).
 *  - findAll : liste les routeurs du tenant (pour le guard d'onboarding).
 * `tenantId` est passé depuis le contrôleur (issu du JWT via @CurrentUser).
 */
@Injectable()
export class RoutersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly connector: MikrotikConnectorService,
  ) {}

  async test(input: RouterTestInput): Promise<RouterTestResult> {
    return this.connector.testConnection(input);
  }

  async create(tenantId: string, dto: CreateRouterDto) {
    // Test pré-enregistrement : on ne persiste que si la connexion passe.
    const result = await this.connector.testConnection({
      host: dto.host,
      apiUser: dto.apiUser,
      apiPassword: dto.apiPassword,
      apiPort: dto.apiPort,
      apiTls: dto.apiTls,
    });

    // Vérifie que la zone appartient bien au tenant (RLS le filtre, mais
    // on veut une 404 claire si la zone n'existe pas dans ce tenant).
    const zone = await this.prisma.withTenantContext((tx) =>
      tx.zone.findUnique({ where: { id: dto.zoneId }, select: { id: true } }),
    );
    if (!zone) throw new NotFoundException("Zone introuvable.");

    const created = await this.prisma.withTenantContext((tx) =>
      tx.router.create({
        data: {
          tenantId,
          label: dto.label,
          host: dto.host,
          apiUser: dto.apiUser,
          apiPasswordEncrypted: this.crypto.encrypt(dto.apiPassword),
          apiPort: dto.apiPort ?? (dto.apiTls ? 8729 : 8728),
          apiTls: dto.apiTls ?? dto.apiPort === 8729,
          zoneId: dto.zoneId,
          status: result.ok ? RouterStatus.ONLINE : RouterStatus.OFFLINE,
          lastSeenAt: result.ok ? new Date() : null,
        },
        select: {
          id: true,
          label: true,
          host: true,
          apiUser: true,
          apiPort: true,
          apiTls: true,
          status: true,
          zoneId: true,
          lastSeenAt: true,
          createdAt: true,
        },
      }),
    );

    return { router: created, connection: result };
  }

  async findAll(tenantId: string) {
    return this.prisma.withTenantContext((tx) =>
      tx.router.findMany({
        where: { tenantId },
        select: {
          id: true,
          label: true,
          host: true,
          apiUser: true,
          apiPort: true,
          apiTls: true,
          status: true,
          zoneId: true,
          lastSeenAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
    );
  }

  async findOne(tenantId: string, id: string) {
    return this.prisma.withTenantContext((tx) =>
      tx.router.findUnique({
        where: { id, tenantId },
        select: {
          id: true,
          label: true,
          host: true,
          apiUser: true,
          apiPort: true,
          apiTls: true,
          status: true,
          zoneId: true,
          lastSeenAt: true,
          createdAt: true,
        },
      }),
    );
  }

  /** Agrège les sessions Hotspot actives de tous les routeurs du tenant. */
  async onlineUsers(tenantId: string) {
    const routers = await this.prisma.withTenantContext((tx) =>
      tx.router.findMany({
        where: { tenantId },
        select: {
          id: true,
          label: true,
          host: true,
          apiUser: true,
          apiPasswordEncrypted: true,
          apiPort: true,
          apiTls: true,
          zone: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    );

    const routerResults = await Promise.all(
      routers.map(async (router) => this.readRouterOnlineUsers(tenantId, router)),
    );

    return {
      generatedAt: new Date().toISOString(),
      total: routerResults.reduce((sum, router) => sum + router.users.length, 0),
      routers: routerResults,
    };
  }

  /** Lit un routeur précis tout en conservant l'isolation du tenant. */
  async onlineUsersForRouter(tenantId: string, routerId: string) {
    const router = await this.prisma.withTenantContext((tx) =>
      tx.router.findFirst({
        where: { id: routerId, tenantId },
        select: {
          id: true,
          label: true,
          host: true,
          apiUser: true,
          apiPasswordEncrypted: true,
          apiPort: true,
          apiTls: true,
          zone: { select: { id: true, name: true } },
        },
      }),
    );
    if (!router) throw new NotFoundException("Routeur introuvable.");
    return this.readRouterOnlineUsers(tenantId, router);
  }

  async disconnectOnlineUser(tenantId: string, routerId: string, sessionId: string) {
    const router = await this.findRouterCredentials(tenantId, routerId);
    return this.connector.disconnectHotspotUser(this.credentials(router), sessionId);
  }

  async blockOnlineUser(tenantId: string, routerId: string, sessionId: string, macAddress: string) {
    const router = await this.findRouterCredentials(tenantId, routerId);
    return this.connector.blockHotspotUser(this.credentials(router), sessionId, macAddress);
  }

  private async findRouterCredentials(tenantId: string, routerId: string) {
    const router = await this.prisma.withTenantContext((tx) =>
      tx.router.findFirst({
        where: { id: routerId, tenantId },
        select: {
          host: true,
          apiUser: true,
          apiPasswordEncrypted: true,
          apiPort: true,
          apiTls: true,
        },
      }),
    );
    if (!router) throw new NotFoundException("Routeur introuvable.");
    return router;
  }

  private credentials(router: {
    host: string;
    apiUser: string;
    apiPasswordEncrypted: string;
    apiPort: number;
    apiTls: boolean;
  }) {
    return {
      host: router.host,
      apiUser: router.apiUser,
      apiPassword: this.crypto.decrypt(router.apiPasswordEncrypted),
      apiPort: router.apiPort,
      apiTls: router.apiTls,
    };
  }

  private async readRouterOnlineUsers(
    tenantId: string,
    router: {
      id: string;
      label: string;
      host: string;
      apiUser: string;
      apiPasswordEncrypted: string;
      apiPort: number;
      apiTls: boolean;
      zone: { id: string; name: string } | null;
    },
  ) {
    try {
      const result = await this.connector.getActiveHotspotUsers({
        host: router.host,
        apiUser: router.apiUser,
        apiPassword: this.crypto.decrypt(router.apiPasswordEncrypted),
        apiPort: router.apiPort,
        apiTls: router.apiTls,
      });
      const checkedAt = new Date();
      await this.prisma.withTenantContext((tx) =>
        tx.router.update({
          where: { id: router.id, tenantId },
          data: {
            status: result.ok ? RouterStatus.ONLINE : RouterStatus.OFFLINE,
            ...(result.ok ? { lastSeenAt: checkedAt } : {}),
          },
        }),
      );

      return {
        id: router.id,
        label: router.label,
        host: router.host,
        apiPort: router.apiPort,
        apiTls: router.apiTls,
        zone: router.zone,
        status: result.ok ? RouterStatus.ONLINE : RouterStatus.OFFLINE,
        message: result.message,
        checkedAt: checkedAt.toISOString(),
        users: result.users,
      };
    } catch {
      await this.prisma.withTenantContext((tx) =>
        tx.router.update({
          where: { id: router.id, tenantId },
          data: { status: RouterStatus.ERROR },
        }),
      );
      return {
        id: router.id,
        label: router.label,
        host: router.host,
        apiPort: router.apiPort,
        apiTls: router.apiTls,
        zone: router.zone,
        status: RouterStatus.ERROR,
        message: "Lecture du routeur impossible. Vérifiez les identifiants chiffrés.",
        checkedAt: new Date().toISOString(),
        users: [],
      };
    }
  }
}
