import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { Role, TicketStatus } from "@prisma/client";
import { ClsService } from "nestjs-cls";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateAgentDto, UpdateAgentDto } from "./dto/agents.dto";

/**
 * AgentsService — mikconnect.
 *
 * CRUD des agents d'un tenant. Un agent est un sous-compte :
 *  - un User (role=AGENT) qui peut se connecter (email + password).
 *  - un Agent (commission %, actif/inactif) lié à ce User.
 *
 * Seul l'OWNER peut créer/gérer des agents (RBAC via RolesGuard).
 * RLS isole par tenantId. `tenantId` passé via @CurrentUser.
 *
 * Commission : pourcentage appliqué sur le prix du ticket vendu par l'agent.
 * Ex : commission 5 % sur un ticket à 100 XOF → 5 XOF de commission.
 */
@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  async create(tenantId: string, dto: CreateAgentDto) {
    // Vérifie email unique (cross-tenant — bypass RLS pour la recherche).
    const existing = await this.prisma.withTenantContext(async (tx) => {
      this.cls.set("bypassRls", true);
      return tx.user.findUnique({ where: { email: dto.email }, select: { id: true } });
    });
    if (existing) throw new ConflictException("Un compte existe déjà avec cet email.");

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Crée User + Agent en une transaction.
    const created = await this.prisma.withTenantContext(async (tx) => {
      this.cls.set("bypassRls", true);
      const user = await tx.user.create({
        data: {
          tenantId,
          email: dto.email,
          passwordHash,
          role: Role.AGENT,
          name: dto.name,
          phone: dto.phone,
        },
        select: { id: true, email: true, name: true, phone: true, role: true },
      });

      const agent = await tx.agent.create({
        data: {
          tenantId,
          userId: user.id,
          commissionPercent: dto.commissionPercent,
        },
        select: {
          id: true,
          commissionPercent: true,
          active: true,
          createdAt: true,
        },
      });

      return { ...agent, user };
    });

    this.logger.log(`Agent created: ${created.user.email} (tenant=${tenantId})`);
    return created;
  }

  async findAll(tenantId: string) {
    const agents = await this.prisma.withTenantContext((tx) =>
      tx.agent.findMany({
        where: { tenantId },
        select: {
          id: true,
          commissionPercent: true,
          active: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
          tickets: { select: { status: true } },
          _count: { select: { sales: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    );
    return agents.map(({ _count, tickets, ...a }) => ({
      ...a,
      ticketsCount: tickets.length,
      availableTicketsCount: tickets.filter((ticket) => ticket.status === TicketStatus.ISSUED)
        .length,
      salesCount: _count.sales,
    }));
  }

  async findOne(tenantId: string, id: string) {
    const agent = await this.prisma.withTenantContext((tx) =>
      tx.agent.findUnique({
        where: { id, tenantId },
        select: {
          id: true,
          commissionPercent: true,
          active: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
          tickets: { select: { status: true } },
          _count: { select: { sales: true } },
        },
      }),
    );
    if (!agent) throw new NotFoundException("Agent introuvable.");
    const { _count, tickets, ...rest } = agent;
    return {
      ...rest,
      ticketsCount: tickets.length,
      availableTicketsCount: tickets.filter((ticket) => ticket.status === TicketStatus.ISSUED)
        .length,
      salesCount: _count.sales,
    };
  }

  async update(tenantId: string, id: string, dto: UpdateAgentDto) {
    const existing = await this.prisma.withTenantContext((tx) =>
      tx.agent.findUnique({ where: { id, tenantId }, select: { id: true } }),
    );
    if (!existing) throw new NotFoundException("Agent introuvable.");

    return this.prisma.withTenantContext((tx) =>
      tx.agent.update({
        where: { id },
        data: {
          ...(dto.commissionPercent !== undefined
            ? { commissionPercent: dto.commissionPercent }
            : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
        select: {
          id: true,
          commissionPercent: true,
          active: true,
          updatedAt: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      }),
    );
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.withTenantContext((tx) =>
      tx.agent.findUnique({
        where: { id, tenantId },
        select: { id: true, userId: true },
      }),
    );
    if (!existing) throw new NotFoundException("Agent introuvable.");

    // Supprime l'agent + le user (cascade). Les tickets de l'agent
    // gardent agentId via SetNull (voir schema.prisma).
    await this.prisma.withTenantContext(async (tx) => {
      this.cls.set("bypassRls", true);
      await tx.agent.delete({ where: { id } });
      await tx.user.delete({ where: { id: existing.userId } });
    });

    this.logger.log(`Agent deleted: ${id} (tenant=${tenantId})`);
  }

  async assignTickets(tenantId: string, agentId: string, ticketIds: string[]) {
    const agent = await this.prisma.withTenantContext((tx) =>
      tx.agent.findUnique({ where: { id: agentId, tenantId }, select: { id: true, active: true } }),
    );
    if (!agent) throw new NotFoundException("Agent introuvable.");
    if (!agent.active)
      throw new BadRequestException("Activez cet agent avant de lui attribuer des tickets.");

    const result = await this.prisma.withTenantContext(async (tx) => {
      const eligible = await tx.ticket.findMany({
        where: {
          tenantId,
          id: { in: ticketIds },
          status: TicketStatus.ISSUED,
          agentId: null,
        },
        select: { id: true },
      });
      if (eligible.length !== ticketIds.length) {
        throw new BadRequestException(
          "Certains tickets sont déjà affectés ou ne sont plus disponibles.",
        );
      }
      return tx.ticket.updateMany({
        where: { id: { in: ticketIds } },
        data: { agentId },
      });
    });

    return { assigned: result.count, agentId };
  }

  async myWorkspace(tenantId: string, userId: string) {
    const agent = await this.prisma.withTenantContext((tx) =>
      tx.agent.findUnique({
        where: { userId },
        select: {
          id: true,
          commissionPercent: true,
          active: true,
          user: { select: { name: true, email: true } },
          tenant: { select: { name: true, currency: true } },
          tickets: {
            select: {
              id: true,
              code: true,
              status: true,
              createdAt: true,
              soldAt: true,
              plan: { select: { name: true, price: true, currency: true, durationMinutes: true } },
            },
            orderBy: { createdAt: "desc" },
          },
          sales: {
            select: { id: true, amount: true, commission: true, createdAt: true },
            orderBy: { createdAt: "desc" },
          },
        },
      }),
    );
    if (!agent) throw new NotFoundException("Espace agent introuvable.");

    const availableTickets = agent.tickets.filter(
      (ticket) => ticket.status === TicketStatus.ISSUED,
    );
    return {
      ...agent,
      tenantId,
      availableTicketsCount: availableTickets.length,
      soldTicketsCount: agent.sales.length,
      totalAmount: agent.sales.reduce((sum, sale) => sum + sale.amount, 0),
      totalCommission: agent.sales.reduce((sum, sale) => sum + sale.commission, 0),
    };
  }
}
