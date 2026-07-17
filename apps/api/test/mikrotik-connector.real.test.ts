import { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routerOs = vi.hoisted(() => ({
  options: [] as Array<Record<string, unknown>>,
  writes: [] as Array<{ command: string; params: string[] }>,
  connectError: null as Error | null,
  activeRows: [
    {
      ".id": "*A",
      server: "hotspot-principal",
      user: "ABCD12",
      address: "10.5.50.10",
      "mac-address": "34:12:F9:8A:21:4C",
      "login-by": "http-chap",
      uptime: "12m4s",
      "session-time-left": "47m56s",
      "idle-time": "3s",
      "bytes-in": "1024",
      "bytes-out": "4096",
      "packets-in": "12",
      "packets-out": "34",
      radius: "false",
      blocked: "false",
    },
  ],
}));

vi.mock("node-routeros", () => ({
  RouterOSAPI: class RouterOSAPIMock {
    connected = false;

    constructor(options: Record<string, unknown>) {
      routerOs.options.push(options);
    }

    async connect() {
      if (routerOs.connectError) throw routerOs.connectError;
      this.connected = true;
      return this;
    }

    async write(command: string, params: string[] = []) {
      routerOs.writes.push({ command, params });
      if (command === "/system/identity/print") return [{ name: "Zone Kaloum" }];
      if (command === "/system/resource/print") {
        return [{ version: "7.19.3", "board-name": "hAP ax2" }];
      }
      if (command === "/ip/hotspot/active/print") return routerOs.activeRows;
      return [];
    }

    async close() {
      this.connected = false;
      return this;
    }
  },
}));

import { MikrotikConnectorService } from "../src/routers/mikrotik-connector.service";

function realConnector(options?: { rejectUnauthorized?: string }) {
  return new MikrotikConnectorService(
    {
      get: vi.fn((key: string) => {
        if (key === "MIKROTIK_MOCK") return "false";
        if (key === "MIKROTIK_API_TIMEOUT_SECONDS") return "8";
        if (key === "MIKROTIK_TLS_REJECT_UNAUTHORIZED") {
          return options?.rejectUnauthorized ?? "true";
        }
        return undefined;
      }),
    } as unknown as ConfigService,
  );
}

const credentials = {
  host: "192.168.88.1",
  apiUser: "mikconnect",
  apiPassword: "not-logged",
  apiPort: 8729,
  apiTls: true,
};

describe("MikrotikConnectorService (real RouterOS command path)", () => {
  beforeEach(() => {
    routerOs.options.length = 0;
    routerOs.writes.length = 0;
    routerOs.connectError = null;
  });

  it("ouvre API-SSL et lit réellement identité + ressources", async () => {
    const result = await realConnector().testConnection(credentials);

    expect(result).toEqual({
      ok: true,
      message: "Routeur accessible.",
      detail: "hAP ax2 · RouterOS 7.19.3",
    });
    expect(routerOs.options[0]).toMatchObject({
      host: "192.168.88.1",
      port: 8729,
      user: "mikconnect",
      timeout: 8,
      tls: { rejectUnauthorized: true },
    });
    expect(routerOs.options[0]).toHaveProperty("password", "not-logged");
    expect(routerOs.writes).toEqual([
      {
        command: "/system/identity/print",
        params: ["=.proplist=name"],
      },
      {
        command: "/system/resource/print",
        params: ["=.proplist=version,board-name"],
      },
    ]);
  });

  it("lit et normalise les sessions Hotspot actives", async () => {
    const result = await realConnector().getActiveHotspotUsers(credentials);

    expect(result.ok).toBe(true);
    expect(result.users).toEqual([
      expect.objectContaining({
        id: "*A",
        username: "ABCD12",
        macAddress: "34:12:F9:8A:21:4C",
        bytesIn: 1024,
        bytesOut: 4096,
        radius: false,
        blocked: false,
      }),
    ]);
    expect(routerOs.writes[0]).toEqual({
      command: "/ip/hotspot/active/print",
      params: [
        "=.proplist=.id,server,user,address,mac-address,login-by,uptime,session-time-left,idle-time,bytes-in,bytes-out,packets-in,packets-out,radius,blocked",
      ],
    });
  });

  it("émet les commandes RouterOS exactes pour créer un ticket", async () => {
    const result = await realConnector().pushTickets(credentials, [
      {
        code: "A7K9P2",
        durationMinutes: 90,
        dataLimitMb: 512,
        profile: "1h30",
      },
    ]);

    expect(result).toMatchObject({ ok: true, pushed: 1, failed: 0 });
    expect(routerOs.writes).toContainEqual({
      command: "/ip/hotspot/user/add",
      params: [
        "=name=A7K9P2",
        "=password=A7K9P2",
        "=limit-uptime=1h30m",
        "=profile=1h30",
        `=limit-bytes-total=${512 * 1024 * 1024}`,
      ],
    });
  });

  it("émet les commandes exactes de déconnexion et blocage", async () => {
    const connector = realConnector();
    await connector.disconnectHotspotUser(credentials, "*A");
    await connector.blockHotspotUser(
      credentials,
      "*B",
      "34:12:F9:8A:21:4C",
    );

    expect(routerOs.writes).toEqual([
      {
        command: "/ip/hotspot/active/remove",
        params: ["=.id=*A"],
      },
      {
        command: "/ip/hotspot/ip-binding/add",
        params: [
          "=mac-address=34:12:F9:8A:21:4C",
          "=type=blocked",
          "=comment=Bloqué depuis mikconnect",
        ],
      },
      {
        command: "/ip/hotspot/active/remove",
        params: ["=.id=*B"],
      },
    ]);
  });

  it("traduit le refus d'authentification du client réel", async () => {
    routerOs.connectError = new Error("Username or password is invalid");

    const result = await realConnector().testConnection(credentials);

    expect(result).toEqual({
      ok: false,
      message:
        "Identifiants API refusés. Vérifiez l'utilisateur et son groupe api/read/write dans RouterOS.",
    });
  });
});
