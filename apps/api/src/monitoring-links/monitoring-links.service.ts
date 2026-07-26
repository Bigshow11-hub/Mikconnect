import { createHash, randomBytes } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { type Prisma } from "@prisma/client";

import { CryptoService } from "../common/crypto.service";
import { PrismaService } from "../prisma/prisma.service";
import { type CreateMonitoringLinkDto } from "./dto/monitoring-links.dto";

@Injectable()
export class MonitoringLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async list(tenantId: string) {
    const links = await this.prisma.withTenantContext((tx) =>
      tx.monitoringLink.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          tokenEncrypted: true,
          includeRevenue: true,
          includeTicketStats: true,
          includeNetwork: true,
          expiresAt: true,
          revokedAt: true,
          lastAccessedAt: true,
          createdAt: true,
          zone: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    );
    return links.map(({ tokenEncrypted, ...link }) => ({
      ...link,
      publicPath: `/monitor/${this.crypto.decrypt(tokenEncrypted)}`,
      active: !link.revokedAt && (!link.expiresAt || link.expiresAt > new Date()),
    }));
  }

  async create(tenantId: string, userId: string, dto: CreateMonitoringLinkDto) {
    this.assertScope(dto);
    const name = dto.name.trim();
    if (!name) throw new BadRequestException("Donnez un nom au lien.");
    const token = this.issueToken(tenantId);
    const expiresAt = new Date(Date.now() + dto.expiresInDays * 86_400_000);

    const link = await this.prisma.withTenantContext(async (tx) => {
      if (dto.zoneId) {
        const zone = await tx.zone.findFirst({ where: { id: dto.zoneId, tenantId } });
        if (!zone) throw new NotFoundException("Zone introuvable.");
      }
      const created = await tx.monitoringLink.create({
        data: {
          tenantId,
          zoneId: dto.zoneId,
          name,
          tokenHash: this.hash(token),
          tokenEncrypted: this.crypto.encrypt(token),
          includeRevenue: dto.includeRevenue,
          includeTicketStats: dto.includeTicketStats,
          includeNetwork: dto.includeNetwork,
          expiresAt,
          createdByUserId: userId,
        },
        select: {
          id: true,
          name: true,
          expiresAt: true,
          includeRevenue: true,
          includeTicketStats: true,
          includeNetwork: true,
          zone: { select: { id: true, name: true } },
          createdAt: true,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: "MONITORING_LINK_CREATED",
          resource: "MonitoringLink",
          resourceId: created.id,
          metadata: {
            zoneId: dto.zoneId ?? null,
            expiresAt: expiresAt.toISOString(),
          } satisfies Prisma.InputJsonValue,
        },
      });
      return created;
    });
    return { ...link, active: true, publicPath: `/monitor/${token}` };
  }

  async revoke(tenantId: string, userId: string, id: string) {
    return this.prisma.withTenantContext(async (tx) => {
      const link = await tx.monitoringLink.findFirst({ where: { id, tenantId } });
      if (!link) throw new NotFoundException("Lien introuvable.");
      const revokedAt = new Date();
      await tx.monitoringLink.update({ where: { id }, data: { revokedAt } });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: "MONITORING_LINK_REVOKED",
          resource: "MonitoringLink",
          resourceId: id,
        },
      });
      return { id, revokedAt: revokedAt.toISOString() };
    });
  }

  async rotate(tenantId: string, userId: string, id: string) {
    const token = this.issueToken(tenantId);
    const updated = await this.prisma.withTenantContext(async (tx) => {
      const link = await tx.monitoringLink.findFirst({ where: { id, tenantId } });
      if (!link) throw new NotFoundException("Lien introuvable.");
      const result = await tx.monitoringLink.update({
        where: { id },
        data: {
          tokenHash: this.hash(token),
          tokenEncrypted: this.crypto.encrypt(token),
          revokedAt: null,
          lastAccessedAt: null,
        },
        select: { id: true, name: true, expiresAt: true },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: "MONITORING_LINK_ROTATED",
          resource: "MonitoringLink",
          resourceId: id,
        },
      });
      return result;
    });
    return { ...updated, active: true, publicPath: `/monitor/${token}` };
  }

  async publicView(token: string) {
    const tenantId = token.split(".", 1)[0];
    if (!tenantId || token.length > 160) throw new NotFoundException("Lien invalide.");
    const tokenHash = this.hash(token);
    return this.prisma.withExplicitTenantContext(tenantId, async (tx) => {
      const link = await tx.monitoringLink.findFirst({
        where: { tenantId, tokenHash },
        select: {
          id: true,
          name: true,
          includeRevenue: true,
          includeTicketStats: true,
          includeNetwork: true,
          expiresAt: true,
          revokedAt: true,
          zoneId: true,
          zone: { select: { id: true, name: true } },
          tenant: { select: { name: true, currency: true } },
        },
      });
      if (!link || link.revokedAt || (link.expiresAt && link.expiresAt <= new Date())) {
        throw new NotFoundException("Ce lien est expiré ou a été révoqué.");
      }
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const [revenue, ticketStats, routers, onlineSessions] = await Promise.all([
        link.includeRevenue
          ? tx.sale.aggregate({
              where: { tenantId, createdAt: { gte: monthStart } },
              _sum: { amount: true },
              _count: { _all: true },
            })
          : null,
        link.includeTicketStats
          ? tx.ticket.groupBy({
              by: ["status"],
              where: { tenantId },
              _count: { _all: true },
            })
          : null,
        link.includeNetwork
          ? tx.router.findMany({
              where: { tenantId, ...(link.zoneId ? { zoneId: link.zoneId } : {}) },
              select: { id: true, label: true, status: true, lastSeenAt: true },
              orderBy: { label: "asc" },
            })
          : null,
        link.includeNetwork
          ? tx.session.count({
              where: {
                tenantId,
                endedAt: null,
                ...(link.zoneId ? { router: { zoneId: link.zoneId } } : {}),
              },
            })
          : null,
      ]);
      await tx.monitoringLink.update({
        where: { id: link.id },
        data: { lastAccessedAt: new Date() },
      });
      return {
        generatedAt: new Date().toISOString(),
        name: link.name,
        tenant: link.tenant,
        zone: link.zone,
        expiresAt: link.expiresAt?.toISOString() ?? null,
        revenue: revenue ? { amount: revenue._sum.amount ?? 0, sales: revenue._count._all } : null,
        ticketStats: ticketStats
          ? Object.fromEntries(ticketStats.map((group) => [group.status, group._count._all]))
          : null,
        network: routers ? { onlineSessions, routers } : null,
      };
    });
  }

  private assertScope(dto: CreateMonitoringLinkDto) {
    if (dto.zoneId && (dto.includeRevenue || dto.includeTicketStats)) {
      throw new BadRequestException(
        "Les revenus et tickets ne peuvent pas encore être attribués avec certitude à une zone. Pour un lien limité à une zone, partagez uniquement l’état réseau.",
      );
    }
    if (!dto.includeRevenue && !dto.includeTicketStats && !dto.includeNetwork) {
      throw new BadRequestException("Sélectionnez au moins une information à partager.");
    }
  }

  private issueToken(tenantId: string) {
    return `${tenantId}.${randomBytes(24).toString("base64url")}`;
  }

  private hash(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }
}
