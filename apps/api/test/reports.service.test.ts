import { describe, expect, it, vi } from "vitest";

import { ReportsService } from "../src/reports/reports.service";
import type { PrismaService } from "../src/prisma/prisma.service";
import type { SubscriptionsService } from "../src/subscriptions/subscriptions.service";

function dependencies() {
  const tx = {
    tenant: {
      findUnique: vi.fn(async () => ({
        name: "Zone Matam",
        currency: "GNF",
        tier: "PRO",
        subscription: { status: "ACTIVE", currentPeriodEnd: null },
      })),
    },
    sale: {
      findMany: vi.fn(async () => [
        {
          amount: 5_000,
          commission: 500,
          channel: "AGENT",
          agent: { id: "a1", user: { name: "Aïcha" } },
          ticket: { plan: { id: "p1", name: "Journée" } },
        },
        {
          amount: 5_000,
          commission: 0,
          channel: "MOBILE_MONEY",
          agent: null,
          ticket: { plan: { id: "p1", name: "Journée" } },
        },
      ]),
    },
    payment: {
      findMany: vi.fn(async () => [{ amount: 5_000, status: "CONFIRMED", provider: "MTN" }]),
    },
    session: {
      findMany: vi.fn(async () => [
        {
          sessionSeconds: 3_600,
          dataUsedMb: 1_200,
          ticket: { code: "MKTEST01", plan: { dataLimitMb: 1_000 } },
        },
      ]),
    },
    ticket: { findMany: vi.fn(async () => [{ status: "SOLD" }, { status: "USED" }]) },
    auditLog: { create: vi.fn(async () => ({ id: "audit-1" })) },
  };
  const prisma = {
    withTenantContext: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  } as unknown as PrismaService;
  const subscriptions = {
    assertFeature: vi.fn(async () => undefined),
  } as unknown as SubscriptionsService;
  return { prisma, subscriptions };
}

describe("ReportsService", () => {
  it("agrège revenus, commissions, canaux et usages anormaux", async () => {
    const { prisma, subscriptions } = dependencies();
    const report = await new ReportsService(prisma, subscriptions).monthly("tenant-1", "2026-07");
    expect(report.totals).toMatchObject({
      revenue: 10_000,
      commissions: 500,
      netRevenue: 9_500,
      sales: 2,
    });
    expect(report.plans[0]).toMatchObject({ label: "Journée", sales: 2, revenue: 10_000 });
    expect(report.anomalies).toHaveLength(1);
  });

  it("produit un PDF et un CSV stables", async () => {
    const { prisma, subscriptions } = dependencies();
    const service = new ReportsService(prisma, subscriptions);
    const pdf = await service.pdf("tenant-1", "owner-1", "2026-07");
    const csv = await service.csv("tenant-1", "owner-1", "2026-07");
    expect(pdf.content.subarray(0, 4).toString()).toBe("%PDF");
    expect(csv.content).toContain('"Journée"');
    expect(subscriptions.assertFeature).toHaveBeenCalledTimes(2);
  });
});
