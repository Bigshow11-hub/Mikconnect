import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { Prisma, TicketStatus, SalesChannel } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CryptoService } from "../common/crypto.service";
import {
  MikrotikConnectorService,
  type HotspotUserInput,
  type RouterTestInput,
} from "../routers/mikrotik-connector.service";
import { generateUniqueCodes } from "./ticket-code.util";
import type { GenerateBatchDto, TicketFiltersDto } from "./dto/tickets.dto";

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
  ) {}

  async generateBatch(tenantId: string, dto: GenerateBatchDto) {
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
          planId: plan.id,
          agentId: dto.agentId ?? null,
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

    return {
      batchId: batch.id,
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

  async findBatches(tenantId: string) {
    return this.prisma.withTenantContext((tx) =>
      tx.ticketBatch.findMany({
        where: { tenantId },
        select: {
          id: true,
          quantity: true,
          codeLength: true,
          createdAt: true,
          plan: { select: { id: true, name: true, durationMinutes: true } },
          agent: { select: { id: true, user: { select: { name: true } } } },
          tickets: {
            select: { id: true, status: true },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    );
  }

  async deleteBatch(tenantId: string, batchId: string) {
    const batch = await this.prisma.withTenantContext((tx) =>
      tx.ticketBatch.findFirst({
        where: { id: batchId, tenantId },
        select: { id: true, tickets: { select: { status: true } } },
      }),
    );
    if (!batch) throw new NotFoundException("Lot de tickets introuvable.");
    if (batch.tickets.some((ticket) => ticket.status !== TicketStatus.ISSUED)) {
      throw new BadRequestException(
        "Ce lot contient des tickets vendus ou utilisés et doit être conservé pour l’historique comptable.",
      );
    }

    await this.prisma.withTenantContext((tx) => tx.ticketBatch.delete({ where: { id: batch.id } }));
    return { deleted: true, id: batch.id };
  }

  /** Pousse les codes vers un routeur online du tenant. */
  private async pushToRouter(
    tenantId: string,
    plan: { durationMinutes: number; dataLimitMb: number | null },
    ticketIds: string[],
  ) {
    if (ticketIds.length === 0) {
      return { ok: true, pushed: 0, failed: 0, message: "Aucun ticket à pousser." };
    }

    // Récupère les codes des tickets persistés.
    const tickets = await this.prisma.withTenantContext((tx) =>
      tx.ticket.findMany({
        where: { id: { in: ticketIds } },
        select: { id: true, code: true },
      }),
    );

    // Trouve un routeur online du tenant (le premier créé).
    const router = await this.prisma.withTenantContext((tx) =>
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
      return {
        ok: false,
        pushed: 0,
        failed: tickets.length,
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

    return this.connector.pushTickets(credentials, users);
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
