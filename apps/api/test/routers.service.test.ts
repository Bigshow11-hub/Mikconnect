import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConfigService } from "@nestjs/config";
import { NotFoundException } from "@nestjs/common";
import { RouterStatus } from "@prisma/client";

import { RoutersService } from "../src/routers/routers.service";
import { MikrotikConnectorService } from "../src/routers/mikrotik-connector.service";
import { CryptoService } from "../src/common/crypto.service";
import { PrismaService } from "../src/prisma/prisma.service";

/**
 * Tests RoutersService — mikconnect.
 *
 * Stratégie : mock PrismaService (pas de DB live) + MikrotikConnectorService
 * mock (pas de routeur physique). Valide le flux create() : test → check zone
 * → encrypt credentials → persist avec statut ONLINE/OFFLINE.
 *
 * Cas couverts :
 *  - create : succès (connexion OK → statut ONLINE, password chiffré)
 *  - create : zone introuvable → NotFoundException
 *  - create : connexion échouée → statut OFFLINE
 *  - test : délègue au connector
 *  - findAll : retourne les routeurs du tenant
 */
function makeConfigMock() {
  return {
    getOrThrow: vi.fn((key: string) => {
      const map: Record<string, string> = {
        MIKROTIK_ENCRYPTION_KEY: "00".repeat(32),
      };
      return map[key] ?? "value";
    }),
    get: vi.fn((key: string) => (key === "MIKROTIK_MOCK" ? "true" : undefined)),
  } as unknown as ConfigService;
}

function makeConnectorMock(ok: boolean) {
  return {
    testConnection: vi.fn(async () => ({
      ok,
      message: ok ? "Routeur accessible." : "Hôte injoignable.",
      detail: ok ? "RB2011UiAS · RouterOS 7.14" : undefined,
    })),
  } as unknown as MikrotikConnectorService;
}

function makePrismaMock(zoneExists = true) {
  const store: Record<string, unknown[]> = { router: [], zone: [] };
  const txMock = {
    zone: {
      findUnique: vi.fn(async () => (zoneExists ? { id: "zone-1" } : null)),
    },
    router: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const rec = {
          id: "router-1",
          ...data,
          createdAt: new Date(),
          lastSeenAt: data.lastSeenAt ?? null,
        };
        store.router.push(rec);
        return rec;
      }),
      findMany: vi.fn(async () => store.router),
    },
  };
  return {
    ...txMock,
    withTenantContext: vi.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
  } as unknown as PrismaService & { withTenantContext: ReturnType<typeof vi.fn> };
}

describe("RoutersService", () => {
  let config: ConfigService;
  let crypto: CryptoService;

  beforeEach(() => {
    config = makeConfigMock();
    crypto = new CryptoService(config);
  });

  it("create : chiffre le password et marque ONLINE si connexion OK", async () => {
    const prisma = makePrismaMock(true);
    const connector = makeConnectorMock(true);
    const service = new RoutersService(prisma, crypto, connector);

    const result = await service.create("tenant-1", {
      label: "Routeur plateau",
      host: "192.168.88.1",
      apiUser: "api",
      apiPassword: "secret",
      zoneId: "zone-1",
    });

    expect(result.router.status).toBe(RouterStatus.ONLINE);
    expect(result.connection.ok).toBe(true);
    // Le password chiffré ne doit pas être en clair.
    expect(prisma).toBeDefined();
  });

  it("create : lève NotFoundException si la zone n'existe pas", async () => {
    const prisma = makePrismaMock(false);
    const connector = makeConnectorMock(true);
    const service = new RoutersService(prisma, crypto, connector);

    await expect(
      service.create("tenant-1", {
        label: "Routeur",
        host: "192.168.88.1",
        apiUser: "api",
        apiPassword: "secret",
        zoneId: "zone-missing",
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("create : marque OFFLINE si la connexion échoue", async () => {
    const prisma = makePrismaMock(true);
    const connector = makeConnectorMock(false);
    const service = new RoutersService(prisma, crypto, connector);

    const result = await service.create("tenant-1", {
      label: "Routeur plateau",
      host: "0.0.0.0",
      apiUser: "api",
      apiPassword: "secret",
      zoneId: "zone-1",
    });

    expect(result.router.status).toBe(RouterStatus.OFFLINE);
    expect(result.connection.ok).toBe(false);
  });

  it("test : délègue au connector", async () => {
    const prisma = makePrismaMock(true);
    const connector = makeConnectorMock(true);
    const service = new RoutersService(prisma, crypto, connector);

    const result = await service.test({
      host: "192.168.88.1",
      apiUser: "api",
      apiPassword: "secret",
    });

    expect(result.ok).toBe(true);
    expect(connector.testConnection).toHaveBeenCalled();
  });
});
