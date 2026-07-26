import { HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import type { SubscriptionTier } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

type QuotaResource = "zones" | "agents" | "tickets";
type QuotaFeature = "monthlyPdf" | "accountingCsv";

const PLANS: Record<
  SubscriptionTier,
  { limits: Record<QuotaResource, number | null>; features: Record<QuotaFeature, boolean> }
> = {
  FREE: {
    limits: { zones: 1, agents: 1, tickets: 200 },
    features: { monthlyPdf: false, accountingCsv: false },
  },
  PRO: {
    limits: { zones: 5, agents: 5, tickets: 5_000 },
    features: { monthlyPdf: true, accountingCsv: false },
  },
  BUSINESS: {
    limits: { zones: null, agents: null, tickets: null },
    features: { monthlyPdf: true, accountingCsv: true },
  },
};

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async usage(tenantId: string) {
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    const tenant = await this.prisma.withTenantContext((tx) =>
      tx.tenant.findUnique({
        where: { id: tenantId },
        select: {
          tier: true,
          subscription: { select: { status: true, currentPeriodEnd: true } },
          _count: { select: { zones: true, agents: true } },
          tickets: { where: { createdAt: { gte: start } }, select: { id: true } },
        },
      }),
    );
    if (!tenant) throw new NotFoundException("Abonnement introuvable.");
    const plan = PLANS[tenant.tier];
    return {
      tier: tenant.tier,
      status: tenant.subscription?.status ?? "TRIALING",
      currentPeriodEnd: tenant.subscription?.currentPeriodEnd ?? null,
      usage: {
        zones: quotaValue(tenant._count.zones, plan.limits.zones),
        agents: quotaValue(tenant._count.agents, plan.limits.agents),
        tickets: quotaValue(tenant.tickets.length, plan.limits.tickets),
      },
      features: plan.features,
    };
  }

  async assertCanConsume(tenantId: string, resource: QuotaResource, amount = 1) {
    const subscription = await this.usage(tenantId);
    if (!["ACTIVE", "TRIALING"].includes(subscription.status)) {
      throw new HttpException(
        "Votre abonnement doit être régularisé avant cette opération.",
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    const quota = subscription.usage[resource];
    if (quota.limit !== null && quota.used + amount > quota.limit) {
      throw new HttpException(
        `Quota ${resource} atteint pour le palier ${subscription.tier}.`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  async assertFeature(tenantId: string, feature: QuotaFeature) {
    const subscription = await this.usage(tenantId);
    if (!subscription.features[feature]) {
      throw new HttpException(
        "Cette fonctionnalité nécessite un palier supérieur.",
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }
}

function quotaValue(used: number, limit: number | null) {
  return { used, limit, remaining: limit === null ? null : Math.max(0, limit - used) };
}
