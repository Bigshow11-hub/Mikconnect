import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TicketStatus } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

const MEBIBYTE = 1024n * 1024n;
const DEFAULT_SYNC_INTERVAL_MS = 15_000;

@Injectable()
export class RadiusAccountingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RadiusAccountingService.name);
  private timer?: NodeJS.Timeout;
  private syncing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (this.config.get<string>("RADIUS_SYNC_ENABLED") === "false") return;
    const configured = Number(this.config.get<string>("RADIUS_SYNC_INTERVAL_MS"));
    const interval = Number.isFinite(configured) && configured >= 5_000
      ? configured
      : DEFAULT_SYNC_INTERVAL_MS;
    this.timer = setInterval(() => void this.syncAccounting(), interval);
    this.timer.unref();
    setTimeout(() => void this.syncAccounting(), 1_500).unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async syncAccounting() {
    if (this.syncing) return { synced: 0, ignored: 0, running: true };
    this.syncing = true;
    let synced = 0;
    let ignored = 0;

    try {
      const records = await this.prisma.radiusAccounting.findMany({
        orderBy: [{ acctUpdateTime: "desc" }, { id: "desc" }],
        take: 500,
      });

      for (const record of records) {
        const credential = await this.prisma.radiusCredential.findUnique({
          where: { username: record.username },
          select: { tenantId: true, ticketId: true },
        });
        if (!credential || !record.acctStartTime) {
          ignored += 1;
          continue;
        }

        const inputOctets = record.acctInputOctets ?? 0n;
        const outputOctets = record.acctOutputOctets ?? 0n;
        const dataUsedMb = Number((inputOctets + outputOctets + MEBIBYTE - 1n) / MEBIBYTE);
        const sessionSeconds = Number(record.acctSessionTime ?? 0n);

        await this.prisma.withExplicitTenantContext(credential.tenantId, async (tx) => {
          const router = await tx.router.findFirst({
            where: { tenantId: credential.tenantId, host: record.nasIpAddress },
            select: { id: true },
          });
          await tx.session.upsert({
            where: { acctUniqueId: record.acctUniqueId },
            create: {
              tenantId: credential.tenantId,
              ticketId: credential.ticketId,
              routerId: router?.id ?? null,
              acctUniqueId: record.acctUniqueId,
              radiusSessionId: record.acctSessionId,
              nasIpAddress: record.nasIpAddress,
              framedIpAddress: record.framedIpAddress,
              macAddress: record.callingStationId,
              startedAt: record.acctStartTime!,
              endedAt: record.acctStopTime,
              sessionSeconds,
              inputOctets,
              outputOctets,
              dataUsedMb,
              terminateCause: record.acctTerminateCause,
            },
            update: {
              routerId: router?.id ?? null,
              framedIpAddress: record.framedIpAddress,
              macAddress: record.callingStationId,
              endedAt: record.acctStopTime,
              sessionSeconds,
              inputOctets,
              outputOctets,
              dataUsedMb,
              terminateCause: record.acctTerminateCause,
            },
          });
          await tx.ticket.update({
            where: { id: credential.ticketId },
            data: { status: TicketStatus.USED, usedAt: record.acctStartTime },
          });
        });
        synced += 1;
      }
      return { synced, ignored, running: false };
    } catch (error) {
      this.logger.warn(`Synchronisation RADIUS échouée : ${error instanceof Error ? error.message : String(error)}`);
      return { synced, ignored, running: false, error: "Accounting indisponible." };
    } finally {
      this.syncing = false;
    }
  }

  async reconciliation(tenantId: string) {
    const tickets = await this.prisma.withExplicitTenantContext(tenantId, (tx) =>
      tx.ticket.findMany({
        where: { tenantId },
        select: {
          id: true,
          soldAt: true,
          usedAt: true,
          agent: { select: { id: true, user: { select: { name: true } } } },
          sale: { select: { id: true } },
        },
      }),
    );
    const activeSessions = await this.prisma.withExplicitTenantContext(tenantId, (tx) =>
      tx.session.count({ where: { tenantId, endedAt: null } }),
    );

    const sold = tickets.filter((ticket) => ticket.soldAt || ticket.sale).length;
    const used = tickets.filter((ticket) => ticket.usedAt).length;
    const usedWithoutSale = tickets.filter((ticket) => ticket.usedAt && !ticket.sale).length;
    const soldNotUsed = tickets.filter((ticket) => (ticket.soldAt || ticket.sale) && !ticket.usedAt).length;
    const gapPercent = used === 0 ? 0 : Math.round((usedWithoutSale / used) * 10_000) / 100;
    const thresholdPercent = 2;

    const agentMap = new Map<string, { id: string; name: string; used: number; gaps: number }>();
    for (const ticket of tickets) {
      if (!ticket.agent || !ticket.usedAt) continue;
      const current = agentMap.get(ticket.agent.id) ?? {
        id: ticket.agent.id,
        name: ticket.agent.user.name,
        used: 0,
        gaps: 0,
      };
      current.used += 1;
      if (!ticket.sale) current.gaps += 1;
      agentMap.set(ticket.agent.id, current);
    }

    return {
      generated: tickets.length,
      sold,
      used,
      available: tickets.filter((ticket) => !ticket.soldAt && !ticket.usedAt).length,
      soldNotUsed,
      usedWithoutSale,
      activeSessions,
      gapPercent,
      thresholdPercent,
      alert: gapPercent > thresholdPercent || usedWithoutSale > 0,
      agents: [...agentMap.values()].map((agent) => ({
        ...agent,
        gapPercent: agent.used === 0 ? 0 : Math.round((agent.gaps / agent.used) * 10_000) / 100,
      })),
      checkedAt: new Date().toISOString(),
    };
  }
}

