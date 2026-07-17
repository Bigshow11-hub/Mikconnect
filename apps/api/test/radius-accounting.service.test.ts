import { describe, expect, it, vi } from "vitest";
import type { ConfigService } from "@nestjs/config";

import { RadiusAccountingService } from "../src/radius/radius-accounting.service";
import type { PrismaService } from "../src/prisma/prisma.service";

function makeService(options?: { tickets?: unknown[]; accounting?: unknown[] }) {
  const session = {
    upsert: vi.fn(async () => ({})),
    count: vi.fn(async () => 1),
  };
  const ticket = {
    update: vi.fn(async () => ({})),
    findMany: vi.fn(async () => options?.tickets ?? []),
  };
  const router = { findFirst: vi.fn(async () => ({ id: "router-1" })) };
  const tx = { session, ticket, router };
  const prisma = {
    radiusAccounting: {
      findMany: vi.fn(async () => options?.accounting ?? []),
    },
    radiusCredential: {
      findUnique: vi.fn(async () => ({ tenantId: "tenant-1", ticketId: "ticket-1" })),
    },
    withExplicitTenantContext: vi.fn(async (_tenantId: string, fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  } as unknown as PrismaService;
  const config = { get: vi.fn(() => "false") } as unknown as ConfigService;
  return { service: new RadiusAccountingService(prisma, config), prisma, tx };
}

describe("RadiusAccountingService", () => {
  it("ingère un interim accounting et actualise le ticket", async () => {
    const { service, tx } = makeService({
      accounting: [{
        id: 1n,
        acctSessionId: "session-1",
        acctUniqueId: "unique-1",
        username: "ABCD1234",
        nasIpAddress: "10.0.0.1",
        framedIpAddress: "10.5.50.10",
        callingStationId: "34:12:F9:8A:21:4C",
        acctStartTime: new Date("2026-07-17T08:00:00Z"),
        acctUpdateTime: new Date("2026-07-17T08:05:00Z"),
        acctStopTime: null,
        acctSessionTime: 300n,
        acctInputOctets: 1_048_576n,
        acctOutputOctets: 2_097_152n,
        acctTerminateCause: null,
      }],
    });

    await expect(service.syncAccounting()).resolves.toMatchObject({ synced: 1, ignored: 0 });
    expect(tx.session.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ dataUsedMb: 3, sessionSeconds: 300 }),
    }));
    expect(tx.ticket.update).toHaveBeenCalled();
  });

  it("signale une utilisation sans vente", async () => {
    const { service } = makeService({
      tickets: [{
        id: "ticket-1",
        soldAt: null,
        usedAt: new Date(),
        sale: null,
        agent: { id: "agent-1", user: { name: "Mariam" } },
      }],
    });

    await expect(service.reconciliation("tenant-1")).resolves.toMatchObject({
      used: 1,
      usedWithoutSale: 1,
      gapPercent: 100,
      alert: true,
      agents: [{ name: "Mariam", gaps: 1 }],
    });
  });

  it("retourne un flux conforme quand les usages sont vendus", async () => {
    const { service } = makeService({
      tickets: [{
        id: "ticket-1",
        soldAt: new Date(),
        usedAt: new Date(),
        sale: { id: "sale-1" },
        agent: null,
      }],
    });

    await expect(service.reconciliation("tenant-1")).resolves.toMatchObject({
      sold: 1,
      used: 1,
      usedWithoutSale: 0,
      gapPercent: 0,
      alert: false,
    });
  });
});
