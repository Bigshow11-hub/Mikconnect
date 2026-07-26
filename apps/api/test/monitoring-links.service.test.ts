import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { CryptoService } from "../src/common/crypto.service";
import { MonitoringLinksService } from "../src/monitoring-links/monitoring-links.service";
import type { PrismaService } from "../src/prisma/prisma.service";

function dependencies() {
  const tx = {
    zone: { findFirst: vi.fn(async () => ({ id: "zone-1" })) },
    monitoringLink: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "link-1",
        name: data.name,
        expiresAt: data.expiresAt,
        includeRevenue: data.includeRevenue,
        includeTicketStats: data.includeTicketStats,
        includeNetwork: data.includeNetwork,
        zone: null,
        createdAt: new Date(),
      })),
      findFirst: vi.fn(async () => ({
        id: "link-1",
        name: "Investisseur",
        includeRevenue: true,
        includeTicketStats: true,
        includeNetwork: true,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        zoneId: null,
        zone: null,
        tenant: { name: "Kolia", currency: "GNF" },
      })),
      update: vi.fn(async () => ({})),
    },
    sale: { aggregate: vi.fn(async () => ({ _sum: { amount: 10_000 }, _count: { _all: 2 } })) },
    ticket: { groupBy: vi.fn(async () => [{ status: "SOLD", _count: { _all: 2 } }]) },
    router: {
      findMany: vi.fn(async () => [
        { id: "r1", label: "Principal", status: "ONLINE", lastSeenAt: new Date() },
      ]),
    },
    session: { count: vi.fn(async () => 3) },
    auditLog: { create: vi.fn(async () => ({ id: "audit-1" })) },
  };
  const prisma = {
    withTenantContext: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
    withExplicitTenantContext: vi.fn(
      async (_tenantId: string, callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    ),
  } as unknown as PrismaService;
  const crypto = {
    encrypt: vi.fn((value: string) => `enc:${value}`),
    decrypt: vi.fn((value: string) => value.replace("enc:", "")),
  } as unknown as CryptoService;
  return { tx, prisma, crypto };
}

describe("MonitoringLinksService", () => {
  it("crée un token secret et retourne uniquement son chemin public", async () => {
    const { tx, prisma, crypto } = dependencies();
    const result = await new MonitoringLinksService(prisma, crypto).create("tenant-1", "owner-1", {
      name: "Investisseur",
      expiresInDays: 30,
      includeRevenue: true,
      includeTicketStats: true,
      includeNetwork: true,
    });
    expect(result.publicPath).toMatch(/^\/monitor\/tenant-1\./);
    expect(tx.monitoringLink.create).toHaveBeenCalledOnce();
    const stored = tx.monitoringLink.create.mock.calls[0]?.[0].data as Record<string, unknown>;
    expect(stored.tokenHash).not.toContain("tenant-1.");
    expect(String(stored.tokenEncrypted)).toContain("enc:tenant-1.");
  });

  it("refuse des revenus faussement attribués à une zone", async () => {
    const { prisma, crypto } = dependencies();
    await expect(
      new MonitoringLinksService(prisma, crypto).create("tenant-1", "owner-1", {
        name: "Zone",
        zoneId: "zone-1",
        expiresInDays: 7,
        includeRevenue: true,
        includeTicketStats: false,
        includeNetwork: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("agrège une vue publique sans données personnelles", async () => {
    const { prisma, crypto } = dependencies();
    const view = await new MonitoringLinksService(prisma, crypto).publicView("tenant-1.secret");
    expect(view.revenue).toEqual({ amount: 10_000, sales: 2 });
    expect(view.network?.onlineSessions).toBe(3);
    expect(JSON.stringify(view)).not.toContain("customerPhone");
  });
});
