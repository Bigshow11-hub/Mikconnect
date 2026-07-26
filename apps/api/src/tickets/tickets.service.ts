import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from "@nestjs/common";
import { Prisma, TicketProvisioningStatus, TicketStatus, SalesChannel } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CryptoService } from "../common/crypto.service";
import {
  MikrotikConnectorService,
  type HotspotUserInput,
  type RouterTestInput,
} from "../routers/mikrotik-connector.service";
import { generateBatchReference, generateUniqueCodes } from "./ticket-code.util";
import type { GenerateBatchDto, TicketBatchFiltersDto, TicketFiltersDto } from "./dto/tickets.dto";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";

/**
 * TicketsService — mikconnect.
 *
 * Génération batch de tickets + CRUD + filtres.
 *
 * Flux generateBatch :
 *  1. Valide le plan (appartient au tenant, actif).
 *  2. Valide l'agent (optionnel, appartient au tenant, actif).
 *  3. Génère `quantity` codes uniques (CSPRNG, alphabet non ambigu).
 *  4. Persiste les tickets (statut ISSUED, expiresAt = now + duration).
 *  5. Trouve un routeur online dans le tenant et pousse les codes en
 *     hotspot users (RADIUS). Si pas de routeur online, les tickets
 *     restent ISSUED en DB — un job de retry repoussera plus tard (Phase 1.5).
 *
 * RLS isole par tenantId (PrismaService). `tenantId` est passé par le
 * contrôleur via @CurrentUser.
 */
@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly connector: MikrotikConnectorService,
    @Optional() private readonly subscriptions?: SubscriptionsService,
  ) {}

  private withTenant<T>(
    tenantId: string,
    systemContext: boolean,
    operation: (tx: PrismaClient) => Promise<T>,
  ) {
    return systemContext
      ? this.prisma.withExplicitTenantContext(tenantId, operation)
      : this.prisma.withTenantContext(operation);
  }

  async generateBatch(
    tenantId: string,
    userId: string,
    dto: GenerateBatchDto,
    idempotencyKey?: string,
  ) {
    const normalizedKey = idempotencyKey?.trim() || undefined;
    if (normalizedKey && normalizedKey.length > 128) {
      throw new BadRequestException("La clé d'idempotence ne peut pas dépasser 128 caractères.");
    }
    if (normalizedKey) {
      const existing = await this.prisma.withTenantContext((tx) =>
        tx.ticketBatch.findFirst({
          where: { tenantId, idempotencyKey: normalizedKey },
          select: { id: true },
        }),
      );
      if (existing) return this.batchGenerationResult(tenantId, existing.id, true);
    }
    await this.subscriptions?.assertCanConsume(tenantId, "tickets", dto.quantity);
    // 1. Valide le plan.
    const plan = await this.prisma.withTenantContext((tx) =>
      tx.plan.findUnique({ where: { id: dto.planId } }),
    );
    if (!plan) throw new NotFoundException("Forfait introuvable.");
    if (!plan.active) throw new BadRequestException("Ce forfait est désactivé.");

    // 2. Valide l'agent (optionnel).
    if (dto.agentId) {
      const agent = await this.prisma.withTenantContext((tx) =>
        tx.agent.findUnique({ where: { id: dto.agentId } }),
      );
      if (!agent) throw new NotFoundException("Agent introuvable.");
      if (!agent.active) throw new BadRequestException("Cet agent est inactif.");
    }

    // 3. Génère les codes uniques.
    const codeLength = dto.codeLength ?? 8;
    const codes = generateUniqueCodes(dto.quantity, codeLength);
    const expiresAt = new Date(Date.now() + plan.durationMinutes * 60 * 1000);

    // 4. Persiste les tickets.
    const { batch, tickets } = await this.prisma.withTenantContext(async (tx) => {
      const batch = await tx.ticketBatch.create({
        data: {
          tenantId,
          reference: generateBatchReference(),
          planId: plan.id,
          agentId: dto.agentId ?? null,
          createdByUserId: userId,
          idempotencyKey: normalizedKey,
          quantity: dto.quantity,
          codeLength,
        },
      });
      const tickets = await tx.ticket.createManyAndReturn({
        data: codes.map((code) => ({
          tenantId,
          code,
          planId: plan.id,
          agentId: dto.agentId ?? null,
          batchId: batch.id,
          status: TicketStatus.ISSUED,
          expiresAt,
        })),
      });
      await tx.radiusCredential.createMany({
        data: tickets.map((ticket) => ({
          tenantId,
          ticketId: ticket.id,
          username: ticket.code,
          password: ticket.code,
          sessionTimeout: plan.durationMinutes * 60,
          dataLimitBytes:
            plan.dataLimitMb == null ? null : BigInt(plan.dataLimitMb) * 1024n * 1024n,
        })),
      });
      await tx.outboxEvent.create({
        data: {
          tenantId,
          type: "TICKET_BATCH_SYNC",
          aggregateId: batch.id,
          payload: { batchId: batch.id, tenantId },
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: "TICKET_BATCH_CREATED",
          resource: "TicketBatch",
          resourceId: batch.id,
          metadata: { reference: batch.reference, quantity: dto.quantity, planId: plan.id },
        },
      });
      return { batch, tickets };
    });

    this.logger.log(
      `Batch généré : ${tickets.length} tickets (plan=${plan.name}, tenant=${tenantId})`,
    );

    // 5. Pousse vers le routeur si disponible.
    const pushResult = await this.pushToRouter(
      tenantId,
      plan,
      tickets.map((t) => t.id),
    );
    await this.prisma.outboxEvent.update({
      where: { type_aggregateId: { type: "TICKET_BATCH_SYNC", aggregateId: batch.id } },
      data: pushResult.ok
        ? { status: "COMPLETED", completedAt: new Date(), lastError: null }
        : {
            status: "PENDING",
            availableAt: new Date(Date.now() + 30_000),
            lastError: pushResult.message,
          },
    });

    return {
      batchId: batch.id,
      reference: batch.reference,
      replayed: false,
      tickets: tickets.map((t) => ({
        id: t.id,
        code: t.code,
        planId: t.planId,
        status: t.status,
        expiresAt: t.expiresAt,
        createdAt: t.createdAt,
      })),
      push: pushResult,
    };
  }

  private async batchGenerationResult(tenantId: string, batchId: string, replayed: boolean) {
    const batch = await this.prisma.withTenantContext((tx) =>
      tx.ticketBatch.findFirst({
        where: { id: batchId, tenantId },
        select: {
          id: true,
          reference: true,
          tickets: {
            select: {
              id: true,
              code: true,
              planId: true,
              status: true,
              expiresAt: true,
              createdAt: true,
              provisioningStatus: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      }),
    );
    if (!batch) throw new NotFoundException("Lot de tickets introuvable.");
    const synced = batch.tickets.filter((ticket) => ticket.provisioningStatus === "SYNCED").length;
    const failed = batch.tickets.filter((ticket) => ticket.provisioningStatus === "FAILED").length;
    return {
      batchId: batch.id,
      reference: batch.reference,
      replayed,
      tickets: batch.tickets,
      push: {
        ok: synced === batch.tickets.length,
        pushed: synced,
        failed,
        pending: batch.tickets.length - synced - failed,
        message: "Ce lot avait déjà été créé. Aucun doublon n'a été généré.",
      },
    };
  }

  async findBatches(tenantId: string, filters: TicketBatchFiltersDto = {}) {
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;
    const where: Prisma.TicketBatchWhereInput = {
      tenantId,
      ...(filters.q ? { reference: { contains: filters.q, mode: "insensitive" } } : {}),
      ...(filters.planId ? { planId: filters.planId } : {}),
      ...(filters.agentId ? { agentId: filters.agentId } : {}),
      ...(filters.state === "ACTIVE" ? { cancelledAt: null } : {}),
      ...(filters.state === "CANCELLED" ? { cancelledAt: { not: null } } : {}),
      ...(filters.provisioningStatus
        ? { tickets: { some: { provisioningStatus: filters.provisioningStatus } } }
        : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {}),
            },
          }
        : {}),
    };
    const [batches, total] = await Promise.all([
      this.prisma.withTenantContext((tx) =>
        tx.ticketBatch.findMany({
          where,
          select: {
            id: true,
            reference: true,
            quantity: true,
            codeLength: true,
            createdAt: true,
            cancelledAt: true,
            createdByUserId: true,
            plan: { select: { id: true, name: true, durationMinutes: true } },
            agent: { select: { id: true, user: { select: { name: true } } } },
            tickets: {
              select: { id: true, status: true, provisioningStatus: true },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: filters.sort ?? "desc" },
          take: limit,
          skip: offset,
        }),
      ),
      this.prisma.withTenantContext((tx) => tx.ticketBatch.count({ where })),
    ]);
    return {
      items: batches.map((batch) => ({ ...batch, summary: summarizeBatchTickets(batch.tickets) })),
      total,
      limit,
      offset,
    };
  }

  async findBatch(tenantId: string, batchId: string, limit = 100, offset = 0) {
    const batch = await this.prisma.withTenantContext((tx) =>
      tx.ticketBatch.findFirst({
        where: { id: batchId, tenantId },
        select: {
          id: true,
          reference: true,
          quantity: true,
          codeLength: true,
          createdAt: true,
          cancelledAt: true,
          createdByUserId: true,
          cancelledByUserId: true,
          plan: true,
          agent: { select: { id: true, user: { select: { name: true } } } },
          tickets: {
            select: {
              id: true,
              code: true,
              status: true,
              provisioningStatus: true,
              pushedAt: true,
              pushAttempts: true,
              lastPushError: true,
              expiresAt: true,
            },
            orderBy: { createdAt: "asc" },
            take: Math.min(limit, 200),
            skip: offset,
          },
        },
      }),
    );
    if (!batch) throw new NotFoundException("Lot de tickets introuvable.");
    const actorIds = [batch.createdByUserId, batch.cancelledByUserId].filter(
      (value): value is string => Boolean(value),
    );
    const [actors, events] = await Promise.all([
      this.prisma.withTenantContext((tx) =>
        tx.user.findMany({
          where: { tenantId, id: { in: actorIds } },
          select: { id: true, name: true },
        }),
      ),
      this.prisma.withTenantContext((tx) =>
        tx.auditLog.findMany({
          where: { tenantId, resource: "TicketBatch", resourceId: batchId },
          select: { id: true, action: true, userId: true, metadata: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
      ),
    ]);
    const actorName = (id: string | null) => actors.find((actor) => actor.id === id)?.name ?? null;
    return {
      ...batch,
      creatorName: actorName(batch.createdByUserId),
      cancelledByName: actorName(batch.cancelledByUserId),
      events: events.map((event) => ({ ...event, actorName: actorName(event.userId) })),
      total: batch.quantity,
      limit: Math.min(limit, 200),
      offset,
    };
  }

  async cancelBatch(tenantId: string, userId: string, batchId: string) {
    return this.prisma.withTenantContext(async (tx) => {
      const batch = await tx.ticketBatch.findFirst({
        where: { id: batchId, tenantId },
        select: {
          id: true,
          reference: true,
          cancelledAt: true,
          tickets: { where: { status: TicketStatus.ISSUED }, select: { id: true } },
        },
      });
      if (!batch) throw new NotFoundException("Lot de tickets introuvable.");
      if (batch.cancelledAt) throw new BadRequestException("Ce lot a déjà été annulé.");
      const ticketIds = batch.tickets.map((ticket) => ticket.id);
      if (ticketIds.length > 0) {
        await tx.ticket.updateMany({
          where: { id: { in: ticketIds }, status: TicketStatus.ISSUED },
          data: { status: TicketStatus.CANCELLED },
        });
        await tx.radiusCredential.updateMany({
          where: { ticketId: { in: ticketIds } },
          data: { active: false },
        });
      }
      await tx.ticketBatch.update({
        where: { id: batch.id },
        data: { cancelledAt: new Date(), cancelledByUserId: userId },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: "TICKET_BATCH_CANCELLED",
          resource: "TicketBatch",
          resourceId: batch.id,
          metadata: { reference: batch.reference, cancelledTickets: ticketIds.length },
        },
      });
      return { id: batch.id, reference: batch.reference, cancelledTickets: ticketIds.length };
    });
  }

  /** Pousse les codes vers un routeur online du tenant. */
  private async pushToRouter(
    tenantId: string,
    plan: { durationMinutes: number; dataLimitMb: number | null },
    ticketIds: string[],
    systemContext = false,
  ) {
    if (ticketIds.length === 0) {
      return { ok: true, pushed: 0, failed: 0, pending: 0, message: "Aucun ticket à pousser." };
    }

    // Récupère les codes des tickets persistés.
    const tickets = await this.withTenant(tenantId, systemContext, (tx) =>
      tx.ticket.findMany({
        where: { id: { in: ticketIds } },
        select: { id: true, code: true },
      }),
    );

    // Trouve un routeur online du tenant (le premier créé).
    const router = await this.withTenant(tenantId, systemContext, (tx) =>
      tx.router.findFirst({
        where: { status: "ONLINE" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          host: true,
          apiUser: true,
          apiPasswordEncrypted: true,
          apiPort: true,
          apiTls: true,
        },
      }),
    );

    if (!router) {
      await this.withTenant(tenantId, systemContext, (tx) =>
        tx.ticket.updateMany({
          where: { id: { in: ticketIds } },
          data: {
            provisioningStatus: TicketProvisioningStatus.PENDING,
            pushAttempts: { increment: 1 },
            lastPushError: "Aucun routeur en ligne.",
          },
        }),
      );
      return {
        ok: false,
        pushed: 0,
        failed: 0,
        pending: tickets.length,
        message: "Aucun routeur en ligne. Les tickets seront repoussés automatiquement.",
      };
    }

    const credentials: RouterTestInput = {
      host: router.host,
      apiUser: router.apiUser,
      apiPassword: this.crypto.decrypt(router.apiPasswordEncrypted),
      apiPort: router.apiPort,
      apiTls: router.apiTls,
    };

    const users: HotspotUserInput[] = tickets.map((t) => ({
      code: t.code,
      durationMinutes: plan.durationMinutes,
      dataLimitMb: plan.dataLimitMb,
    }));

    const result = await this.connector.pushTickets(credentials, users);
    const pushedIds = tickets.slice(0, result.pushed).map((ticket) => ticket.id);
    const failedIds = tickets.slice(result.pushed).map((ticket) => ticket.id);
    await this.withTenant(tenantId, systemContext, async (tx) => {
      if (pushedIds.length > 0) {
        await tx.ticket.updateMany({
          where: { id: { in: pushedIds } },
          data: {
            provisioningStatus: TicketProvisioningStatus.SYNCED,
            pushedAt: new Date(),
            pushAttempts: { increment: 1 },
            lastPushError: null,
          },
        });
      }
      if (failedIds.length > 0) {
        await tx.ticket.updateMany({
          where: { id: { in: failedIds } },
          data: {
            provisioningStatus: TicketProvisioningStatus.FAILED,
            pushAttempts: { increment: 1 },
            lastPushError: result.message,
          },
        });
      }
    });
    return { ...result, pending: 0 };
  }

  async retryBatch(tenantId: string, batchId: string, userId?: string) {
    return this.retryBatchInternal(tenantId, batchId, false, userId);
  }

  async retryBatchForSystem(tenantId: string, batchId: string) {
    return this.retryBatchInternal(tenantId, batchId, true);
  }

  private async retryBatchInternal(
    tenantId: string,
    batchId: string,
    systemContext: boolean,
    userId?: string,
  ) {
    const batch = await this.withTenant(tenantId, systemContext, (tx) =>
      tx.ticketBatch.findFirst({
        where: { id: batchId, tenantId },
        select: {
          cancelledAt: true,
          plan: { select: { durationMinutes: true, dataLimitMb: true } },
          tickets: {
            where: {
              status: TicketStatus.ISSUED,
              provisioningStatus: { in: ["PENDING", "FAILED"] },
            },
            select: { id: true },
          },
        },
      }),
    );
    if (!batch) throw new NotFoundException("Lot de tickets introuvable.");
    if (batch.cancelledAt)
      throw new BadRequestException("Un lot annulé ne peut pas être synchronisé.");
    const result = await this.pushToRouter(
      tenantId,
      batch.plan,
      batch.tickets.map((ticket) => ticket.id),
      systemContext,
    );
    await this.withTenant(tenantId, systemContext, (tx) =>
      tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: result.ok ? "TICKET_BATCH_SYNCED" : "TICKET_BATCH_SYNC_RETRY_FAILED",
          resource: "TicketBatch",
          resourceId: batchId,
          metadata: {
            pushed: result.pushed,
            failed: result.failed,
            pending: result.pending,
          },
        },
      }),
    );
    return result;
  }

  async findAll(tenantId: string, filters: TicketFiltersDto) {
    const where: Prisma.TicketWhereInput = {
      tenantId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.planId ? { planId: filters.planId } : {}),
      ...(filters.agentId ? { agentId: filters.agentId } : {}),
      ...(filters.q ? { code: { contains: filters.q, mode: "insensitive" } } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {}),
            },
          }
        : {}),
    };

    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    const [tickets, total] = await Promise.all([
      this.prisma.withTenantContext((tx) =>
        tx.ticket.findMany({
          where,
          select: {
            id: true,
            code: true,
            status: true,
            createdAt: true,
            soldAt: true,
            usedAt: true,
            expiresAt: true,
            plan: { select: { id: true, name: true, price: true, currency: true } },
            agent: {
              select: { id: true, commissionPercent: true, user: { select: { name: true } } },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
      ),
      this.prisma.withTenantContext((tx) => tx.ticket.count({ where })),
    ]);

    return { tickets, total, limit, offset };
  }

  async findOne(tenantId: string, id: string) {
    const ticket = await this.prisma.withTenantContext((tx) =>
      tx.ticket.findUnique({
        where: { id, tenantId },
        select: {
          id: true,
          code: true,
          status: true,
          createdAt: true,
          soldAt: true,
          usedAt: true,
          expiresAt: true,
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              currency: true,
              durationMinutes: true,
              dataLimitMb: true,
            },
          },
          agent: {
            select: { id: true, commissionPercent: true, user: { select: { name: true } } },
          },
          sale: {
            select: { id: true, amount: true, commission: true, channel: true, createdAt: true },
          },
        },
      }),
    );
    if (!ticket) throw new NotFoundException("Ticket introuvable.");
    return ticket;
  }

  /** Compteurs agrégés pour le dashboard (Phase 1.6). */
  async stats(tenantId: string) {
    const grouped = await this.prisma.withTenantContext((tx) =>
      tx.ticket.groupBy({
        by: ["status"],
        _count: true,
        where: { tenantId },
      }),
    );
    return grouped.map((g) => ({ status: g.status, count: g._count }));
  }

  /** Vue synthétique du business, optimisée pour le premier écran mobile. */
  async overview(tenantId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfSalesTrend = startOfLocalDay(addDays(now, -13));
    const startOfUsageTrend = startOfLocalDay(addDays(now, -6));

    const [
      tenant,
      today,
      todayByChannel,
      month,
      activeTickets,
      routersOnline,
      routersTotal,
      recentSales,
      trendSales,
      recentSessions,
    ] = await this.prisma.withTenantContext((tx) =>
      Promise.all([
        tx.tenant.findUnique({ where: { id: tenantId }, select: { currency: true } }),
        tx.sale.aggregate({
          where: { tenantId, createdAt: { gte: startOfDay } },
          _sum: { amount: true },
          _count: true,
        }),
        tx.sale.groupBy({
          by: ["channel"],
          where: { tenantId, createdAt: { gte: startOfDay } },
          _count: true,
          _sum: { amount: true },
        }),
        tx.sale.aggregate({
          where: { tenantId, createdAt: { gte: startOfMonth } },
          _sum: { amount: true },
          _count: true,
        }),
        tx.ticket.count({
          where: { tenantId, status: { in: [TicketStatus.ISSUED, TicketStatus.SOLD] } },
        }),
        tx.router.count({ where: { tenantId, status: "ONLINE" } }),
        tx.router.count({ where: { tenantId } }),
        tx.sale.findMany({
          where: { tenantId },
          select: {
            id: true,
            amount: true,
            channel: true,
            createdAt: true,
            ticket: {
              select: {
                code: true,
                plan: { select: { name: true } },
                agent: { select: { user: { select: { name: true } } } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        tx.sale.findMany({
          where: { tenantId, createdAt: { gte: startOfSalesTrend } },
          select: { amount: true, channel: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        }),
        tx.session.findMany({
          where: { tenantId, startedAt: { gte: startOfUsageTrend } },
          select: { startedAt: true, endedAt: true, dataUsedMb: true },
          orderBy: { startedAt: "asc" },
        }),
      ]),
    );

    const salesTrend = buildDaySeries(startOfSalesTrend, 14).map((day) => {
      const sales = trendSales.filter((sale) => localDateKey(sale.createdAt) === day.date);
      const physical = sales.filter((sale) => sale.channel === SalesChannel.AGENT);
      const online = sales.filter((sale) => sale.channel === SalesChannel.MOBILE_MONEY);
      return {
        ...day,
        revenue: sales.reduce((sum, sale) => sum + sale.amount, 0),
        sales: sales.length,
        revenuePhysical: physical.reduce((sum, sale) => sum + sale.amount, 0),
        revenueOnline: online.reduce((sum, sale) => sum + sale.amount, 0),
        salesPhysical: physical.length,
        salesOnline: online.length,
      };
    });
    const usageTrend = buildDaySeries(startOfUsageTrend, 7).map((day) => {
      const sessions = recentSessions.filter(
        (session) => session.startedAt && localDateKey(session.startedAt) === day.date,
      );
      return {
        ...day,
        connections: sessions.length,
        dataUsedMb: sessions.reduce((sum, session) => sum + session.dataUsedMb, 0),
      };
    });

    return {
      currency: tenant?.currency ?? "XOF",
      revenueToday: today._sum.amount ?? 0,
      salesToday: today._count,
      salesTodayPhysical:
        todayByChannel.find((row) => row.channel === SalesChannel.AGENT)?._count ?? 0,
      salesTodayOnline:
        todayByChannel.find((row) => row.channel === SalesChannel.MOBILE_MONEY)?._count ?? 0,
      revenueTodayPhysical:
        todayByChannel.find((row) => row.channel === SalesChannel.AGENT)?._sum.amount ?? 0,
      revenueTodayOnline:
        todayByChannel.find((row) => row.channel === SalesChannel.MOBILE_MONEY)?._sum.amount ?? 0,
      revenueMonth: month._sum.amount ?? 0,
      salesMonth: month._count,
      activeTickets,
      routersOnline,
      routersTotal,
      connectionsToday: usageTrend.at(-1)?.connections ?? 0,
      dataUsedTodayMb: usageTrend.at(-1)?.dataUsedMb ?? 0,
      accountingSessionsActive: recentSessions.filter(
        (session) => session.startedAt && !session.endedAt,
      ).length,
      salesTrend,
      usageTrend,
      recentSales,
    };
  }

  /**
   * Vend un ticket : passe le statut ISSUED→SOLD, crée un Sale (montant +
   * commission agent), lie le sale au ticket. Si un agent vend, sa
   * commission est calculée depuis son commissionPercent.
   *
   * Règles :
   *  - seul un ticket ISSUED peut être vendu (pas un SOLD/EXPIRED/CANCELLED).
   *  - si agentId fourni : l'agent doit être actif et appartenir au tenant.
   *  - si pas d'agentId : vente directe (channel AGENT mais sans commission,
   *    propriétaire qui vend en cash sans agent).
   */
  async sellTicket(tenantId: string, ticketId: string, agentId?: string) {
    const ticket = await this.prisma.withTenantContext((tx) =>
      tx.ticket.findUnique({
        where: { id: ticketId },
        select: {
          id: true,
          code: true,
          status: true,
          planId: true,
          agentId: true,
          plan: { select: { id: true, price: true, currency: true } },
        },
      }),
    );
    if (!ticket) throw new NotFoundException("Ticket introuvable.");
    if (ticket.status !== TicketStatus.ISSUED) {
      throw new BadRequestException(`Ce ticket ne peut pas être vendu (statut: ${ticket.status}).`);
    }

    let commission = 0;
    const resolvedAgentId = agentId ?? ticket.agentId ?? null;

    if (resolvedAgentId) {
      const agent = await this.prisma.withTenantContext((tx) =>
        tx.agent.findUnique({
          where: { id: resolvedAgentId! },
          select: { id: true, commissionPercent: true, active: true },
        }),
      );
      if (!agent) throw new NotFoundException("Agent introuvable.");
      if (!agent.active) throw new BadRequestException("Cet agent est inactif.");
      commission = Math.round((ticket.plan.price * agent.commissionPercent) / 100);
    }

    const sale = await this.prisma.withTenantContext((tx) =>
      tx.sale.create({
        data: {
          tenantId,
          ticketId: ticket.id,
          agentId: resolvedAgentId,
          amount: ticket.plan.price,
          commission,
          channel: SalesChannel.AGENT,
        },
        select: {
          id: true,
          amount: true,
          commission: true,
          channel: true,
          createdAt: true,
        },
      }),
    );

    const updated = await this.prisma.withTenantContext((tx) =>
      tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: TicketStatus.SOLD,
          soldAt: new Date(),
          agentId: resolvedAgentId,
          saleId: sale.id,
        },
        select: {
          id: true,
          code: true,
          status: true,
          soldAt: true,
        },
      }),
    );

    this.logger.log(
      `Ticket sold: ${ticket.code} — ${ticket.plan.price} (commission=${commission})`,
    );

    return { ticket: updated, sale };
  }

  async sellAgentTicket(tenantId: string, userId: string, ticketId: string) {
    const agent = await this.prisma.withTenantContext((tx) =>
      tx.agent.findUnique({ where: { userId }, select: { id: true, active: true } }),
    );
    if (!agent) throw new NotFoundException("Agent introuvable.");
    if (!agent.active) throw new BadRequestException("Votre espace agent est inactif.");

    const ticket = await this.prisma.withTenantContext((tx) =>
      tx.ticket.findFirst({
        where: { id: ticketId, tenantId, agentId: agent.id, status: TicketStatus.ISSUED },
        select: { id: true },
      }),
    );
    if (!ticket) {
      throw new BadRequestException("Ce ticket ne vous est pas attribué ou n’est plus disponible.");
    }

    return this.sellTicket(tenantId, ticketId, agent.id);
  }

  /**
   * Résumé des ventes par agent (vue propriétaire) :
   *  - nombre de ventes.
   *  - montant total vendu.
   *  - commission totale due.
   */
  async agentSalesSummary(tenantId: string, agentId: string) {
    const agent = await this.prisma.withTenantContext((tx) =>
      tx.agent.findUnique({
        where: { id: agentId },
        select: { id: true, commissionPercent: true, active: true },
      }),
    );
    if (!agent) throw new NotFoundException("Agent introuvable.");

    const sales = await this.prisma.withTenantContext((tx) =>
      tx.sale.findMany({
        where: { agentId },
        select: {
          id: true,
          amount: true,
          commission: true,
          createdAt: true,
          ticket: { select: { id: true, code: true, plan: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
    );

    const totalAmount = sales.reduce((sum, s) => sum + s.amount, 0);
    const totalCommission = sales.reduce((sum, s) => sum + s.commission, 0);

    return {
      agent: {
        id: agent.id,
        commissionPercent: agent.commissionPercent,
        active: agent.active,
      },
      sales,
      totalAmount,
      totalCommission,
      salesCount: sales.length,
    };
  }

  /** Résumé des ventes pour tous les agents (vue propriétaire). */
  async allAgentsSalesSummary(_tenantId: string) {
    const agents = await this.prisma.withTenantContext((tx) =>
      tx.agent.findMany({
        select: {
          id: true,
          commissionPercent: true,
          active: true,
          user: { select: { name: true } },
          sales: { select: { amount: true, commission: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    );

    return agents.map((a) => {
      const totalAmount = a.sales.reduce((sum, s) => sum + s.amount, 0);
      const totalCommission = a.sales.reduce((sum, s) => sum + s.commission, 0);
      const { sales, ...rest } = a;
      return {
        ...rest,
        totalAmount,
        totalCommission,
        salesCount: sales.length,
      };
    });
  }
}

function summarizeBatchTickets(
  tickets: { status: TicketStatus; provisioningStatus: TicketProvisioningStatus }[],
) {
  const countStatus = (status: TicketStatus) =>
    tickets.filter((ticket) => ticket.status === status).length;
  const countProvisioning = (status: TicketProvisioningStatus) =>
    tickets.filter((ticket) => ticket.provisioningStatus === status).length;
  return {
    issued: countStatus(TicketStatus.ISSUED),
    sold: countStatus(TicketStatus.SOLD),
    used: countStatus(TicketStatus.USED),
    expired: countStatus(TicketStatus.EXPIRED),
    cancelled: countStatus(TicketStatus.CANCELLED),
    pending: countProvisioning(TicketProvisioningStatus.PENDING),
    synced: countProvisioning(TicketProvisioningStatus.SYNCED),
    failed: countProvisioning(TicketProvisioningStatus.FAILED),
  };
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDaySeries(start: Date, length: number) {
  return Array.from({ length }, (_, index) => {
    const date = addDays(start, index);
    return {
      date: localDateKey(date),
      label: new Intl.DateTimeFormat("fr-FR", {
        weekday: "short",
        day: "2-digit",
      }).format(date),
    };
  });
}
