import { describe, expect, it, vi } from "vitest";

import type { CryptoService } from "../src/common/crypto.service";
import { NetworkOperationsService } from "../src/network-operations/network-operations.service";
import type { PrismaService } from "../src/prisma/prisma.service";
import type { MikrotikConnectorService } from "../src/routers/mikrotik-connector.service";

function dependencies() {
  const tx = {
    tenant: { findUnique: vi.fn(async () => ({ country: "CI" })) },
    router: {
      findMany: vi.fn(async () => [
        {
          id: "router-1",
          label: "Routeur principal",
          host: "router.example.com",
          apiUser: "mk",
          apiPasswordEncrypted: "encrypted",
          apiPort: 8729,
          apiTls: true,
          status: "ONLINE",
          lastSeenAt: null,
          zone: { id: "zone-1", name: "Kolia" },
        },
      ]),
      findFirst: vi.fn(async () => ({
        id: "router-1",
        host: "router.example.com",
        apiUser: "mk",
        apiPasswordEncrypted: "encrypted",
        apiPort: 8729,
        apiTls: true,
      })),
      update: vi.fn(async () => ({})),
    },
    ticket: {
      groupBy: vi.fn(async () => [
        { provisioningStatus: "PENDING", _count: { _all: 3 } },
        { provisioningStatus: "FAILED", _count: { _all: 1 } },
      ]),
    },
    outboxEvent: { count: vi.fn(async () => 2) },
    auditLog: { create: vi.fn(async () => ({ id: "audit-1" })) },
  };
  const prisma = {
    withTenantContext: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  } as unknown as PrismaService;
  const connector = {
    getRouterDiagnostics: vi.fn(async () => ({
      ok: true,
      message: "OK",
      timezoneName: "America/New_York",
      timezoneAutodetect: true,
      activeUsers: 2,
      hotspotUsers: 48,
      scripts: 0,
      schedulers: 0,
    })),
    setRouterTimezone: vi.fn(async () => ({ ok: true, message: "Fuseau corrigé" })),
  } as unknown as MikrotikConnectorService;
  const crypto = { decrypt: vi.fn(() => "secret") } as unknown as CryptoService;
  return { tx, prisma, connector, crypto };
}

describe("NetworkOperationsService", () => {
  it("regroupe diagnostic RouterOS et files de synchronisation", async () => {
    const { prisma, connector, crypto } = dependencies();
    const overview = await new NetworkOperationsService(prisma, crypto, connector).overview(
      "tenant-1",
    );
    expect(overview.summary).toMatchObject({
      online: 1,
      pendingTickets: 3,
      failedTickets: 1,
      pendingOperations: 2,
    });
    expect(overview.routers[0]?.issues[0]).toMatchObject({
      code: "TIMEZONE_MISMATCH",
      action: "FIX_TIMEZONE",
    });
  });

  it("applique le fuseau du pays et journalise l'intervention", async () => {
    const { tx, prisma, connector, crypto } = dependencies();
    const result = await new NetworkOperationsService(prisma, crypto, connector).correctTimezone(
      "tenant-1",
      "owner-1",
      "router-1",
    );
    expect(result.timezone).toBe("Africa/Abidjan");
    expect(connector.setRouterTimezone).toHaveBeenCalledWith(expect.any(Object), "Africa/Abidjan");
    expect(tx.auditLog.create).toHaveBeenCalledOnce();
  });
});
