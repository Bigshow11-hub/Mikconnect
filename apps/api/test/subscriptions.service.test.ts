import { describe, expect, it, vi } from "vitest";
import { HttpException } from "@nestjs/common";

import { SubscriptionsService } from "../src/subscriptions/subscriptions.service";
import type { PrismaService } from "../src/prisma/prisma.service";

function prismaFor(tier: "FREE" | "PRO" | "BUSINESS", status = "ACTIVE", tickets = 0) {
  const tx = {
    tenant: {
      findUnique: vi.fn(async () => ({
        tier,
        subscription: { status, currentPeriodEnd: null },
        _count: { zones: 1, agents: 1 },
        tickets: Array.from({ length: tickets }, (_, index) => ({ id: String(index) })),
      })),
    },
  };
  return {
    withTenantContext: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  } as unknown as PrismaService;
}

describe("SubscriptionsService", () => {
  it("calcule les consommations et limites du palier gratuit", async () => {
    const result = await new SubscriptionsService(prismaFor("FREE", "ACTIVE", 125)).usage(
      "tenant-1",
    );
    expect(result.usage.tickets).toEqual({ used: 125, limit: 200, remaining: 75 });
    expect(result.features.monthlyPdf).toBe(false);
  });

  it("refuse un lot qui dépasserait le quota mensuel", async () => {
    const service = new SubscriptionsService(prismaFor("FREE", "ACTIVE", 195));
    await expect(service.assertCanConsume("tenant-1", "tickets", 10)).rejects.toBeInstanceOf(
      HttpException,
    );
  });

  it("autorise les ressources illimitées du palier Business", async () => {
    const service = new SubscriptionsService(prismaFor("BUSINESS", "ACTIVE", 20_000));
    await expect(service.assertCanConsume("tenant-1", "tickets", 1_000)).resolves.toBeUndefined();
    await expect(service.assertFeature("tenant-1", "accountingCsv")).resolves.toBeUndefined();
  });
});
