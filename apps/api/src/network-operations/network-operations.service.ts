import { Injectable, NotFoundException } from "@nestjs/common";
import { Country, RouterStatus, type Prisma } from "@prisma/client";

import { CryptoService } from "../common/crypto.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  MikrotikConnectorService,
  type RouterDiagnosticsResult,
} from "../routers/mikrotik-connector.service";

type RouterRecord = {
  id: string;
  label: string;
  apiUser: string;
  apiPasswordEncrypted: string;
  apiPort: number;
  apiTls: boolean;
  host: string;
  status: RouterStatus;
  lastSeenAt: Date | null;
  zone: { id: string; name: string } | null;
};

@Injectable()
export class NetworkOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly connector: MikrotikConnectorService,
  ) {}

  async overview(tenantId: string) {
    const [tenant, routers, ticketGroups, pendingOutbox] = await this.prisma.withTenantContext(
      async (tx) =>
        Promise.all([
          tx.tenant.findUnique({
            where: { id: tenantId },
            select: { country: true },
          }),
          tx.router.findMany({
            where: { tenantId },
            select: {
              id: true,
              label: true,
              host: true,
              apiUser: true,
              apiPasswordEncrypted: true,
              apiPort: true,
              apiTls: true,
              status: true,
              lastSeenAt: true,
              zone: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "asc" },
          }),
          tx.ticket.groupBy({
            by: ["provisioningStatus"],
            where: { tenantId },
            _count: { _all: true },
          }),
          tx.outboxEvent.count({
            where: { tenantId, status: { in: ["PENDING", "FAILED", "DEAD"] } },
          }),
        ]),
    );

    if (!tenant) throw new NotFoundException("Entreprise introuvable.");
    const expectedTimezone = this.timezoneFor(tenant.country);
    const inspected = await Promise.all(
      routers.map((router) => this.inspectRouter(tenantId, router, expectedTimezone)),
    );
    const provisioning = Object.fromEntries(
      ticketGroups.map((group) => [group.provisioningStatus, group._count._all]),
    ) as Partial<Record<"PENDING" | "SYNCED" | "FAILED", number>>;

    return {
      checkedAt: new Date().toISOString(),
      expectedTimezone,
      summary: {
        routers: inspected.length,
        online: inspected.filter((router) => router.status === RouterStatus.ONLINE).length,
        pendingTickets: provisioning.PENDING ?? 0,
        failedTickets: provisioning.FAILED ?? 0,
        pendingOperations: pendingOutbox,
      },
      routers: inspected,
    };
  }

  async correctTimezone(tenantId: string, userId: string, routerId: string) {
    const record = await this.prisma.withTenantContext(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { country: true },
      });
      const router = await tx.router.findFirst({
        where: { id: routerId, tenantId },
        select: {
          id: true,
          host: true,
          apiUser: true,
          apiPasswordEncrypted: true,
          apiPort: true,
          apiTls: true,
        },
      });
      return tenant && router ? { tenant, router } : null;
    });
    if (!record) throw new NotFoundException("Routeur introuvable.");

    const timezone = this.timezoneFor(record.tenant.country);
    const result = await this.connector.setRouterTimezone(
      this.credentials(record.router),
      timezone,
    );
    await this.prisma.withTenantContext((tx) =>
      tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: result.ok ? "ROUTER_TIMEZONE_REPAIRED" : "ROUTER_TIMEZONE_REPAIR_FAILED",
          resource: "Router",
          resourceId: routerId,
          metadata: { timezone, ok: result.ok } satisfies Prisma.InputJsonValue,
        },
      }),
    );
    return { ...result, timezone };
  }

  private async inspectRouter(
    tenantId: string,
    router: RouterRecord,
    expectedTimezone: "Africa/Abidjan" | "Africa/Conakry",
  ) {
    const diagnostics = await this.connector.getRouterDiagnostics(this.credentials(router));
    const checkedAt = new Date();
    const status = diagnostics.ok ? RouterStatus.ONLINE : RouterStatus.OFFLINE;
    await this.prisma.withTenantContext((tx) =>
      tx.router.update({
        where: { id: router.id, tenantId },
        data: {
          status,
          ...(diagnostics.ok ? { lastSeenAt: checkedAt } : {}),
        },
      }),
    );

    return {
      id: router.id,
      label: router.label,
      zone: router.zone,
      status,
      lastSeenAt: diagnostics.ok
        ? checkedAt.toISOString()
        : (router.lastSeenAt?.toISOString() ?? null),
      diagnostics,
      issues: this.issuesFor(diagnostics, expectedTimezone),
    };
  }

  private issuesFor(
    diagnostics: RouterDiagnosticsResult,
    expectedTimezone: "Africa/Abidjan" | "Africa/Conakry",
  ) {
    const issues: Array<{
      code: string;
      severity: "INFO" | "WARNING" | "CRITICAL";
      title: string;
      detail: string;
      action?: "FIX_TIMEZONE";
    }> = [];
    if (!diagnostics.ok) {
      issues.push({
        code: "ROUTER_OFFLINE",
        severity: "CRITICAL",
        title: "Routeur inaccessible",
        detail: diagnostics.message,
      });
      return issues;
    }
    if (diagnostics.timezoneAutodetect || diagnostics.timezoneName !== expectedTimezone) {
      issues.push({
        code: "TIMEZONE_MISMATCH",
        severity: "WARNING",
        title: "Horloge à sécuriser",
        detail: `Le routeur utilise ${diagnostics.timezoneName ?? "un fuseau inconnu"}. Le fuseau attendu est ${expectedTimezone}.`,
        action: "FIX_TIMEZONE",
      });
    }
    if (diagnostics.scripts > 500) {
      issues.push({
        code: "SCRIPT_ACCUMULATION",
        severity: "WARNING",
        title: "Accumulation de scripts",
        detail: `${diagnostics.scripts} scripts sont présents. Un technicien doit les examiner avant tout nettoyage.`,
      });
    }
    return issues;
  }

  private timezoneFor(country: Country): "Africa/Abidjan" | "Africa/Conakry" {
    return country === Country.GN ? "Africa/Conakry" : "Africa/Abidjan";
  }

  private credentials(router: {
    host: string;
    apiUser: string;
    apiPasswordEncrypted: string;
    apiPort: number;
    apiTls: boolean;
  }) {
    return {
      host: router.host,
      apiUser: router.apiUser,
      apiPassword: this.crypto.decrypt(router.apiPasswordEncrypted),
      apiPort: router.apiPort,
      apiTls: router.apiTls,
    };
  }
}
