import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PrivacyService {
  constructor(private readonly prisma: PrismaService) {}

  async exportTenantData(tenantId: string, userId: string) {
    const data = await this.prisma.withTenantContext(async (tx) => {
      const [tenant, users, agents, payments, sessions] = await Promise.all([
        tx.tenant.findUnique({
          where: { id: tenantId },
          select: {
            id: true,
            name: true,
            country: true,
            currency: true,
            tier: true,
            createdAt: true,
          },
        }),
        tx.user.findMany({
          where: { tenantId },
          select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
        }),
        tx.agent.findMany({
          where: { tenantId },
          select: {
            id: true,
            userId: true,
            commissionPercent: true,
            active: true,
            createdAt: true,
          },
        }),
        tx.payment.findMany({
          where: { tenantId },
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            provider: true,
            customerPhone: true,
            createdAt: true,
          },
        }),
        tx.session.findMany({
          where: { tenantId },
          select: {
            id: true,
            ticketId: true,
            macAddress: true,
            startedAt: true,
            endedAt: true,
            sessionSeconds: true,
            dataUsedMb: true,
          },
        }),
      ]);
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: "PERSONAL_DATA_EXPORTED",
          resource: "Tenant",
          resourceId: tenantId,
        },
      });
      return { tenant, users, agents, payments, sessions };
    });
    return { exportedAt: new Date().toISOString(), ...data };
  }

  async anonymizeCustomer(tenantId: string, userId: string, phone: string) {
    return this.prisma.withTenantContext(async (tx) => {
      const payments = await tx.payment.updateMany({
        where: { tenantId, customerPhone: phone },
        data: { customerPhone: null },
      });
      const messages = await tx.smsDelivery.updateMany({
        where: { tenantId, phone },
        data: { phone: "ANONYMIZED", errorMessage: null },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: "CUSTOMER_PERSONAL_DATA_ANONYMIZED",
          resource: "Customer",
          metadata: { payments: payments.count, messages: messages.count },
        },
      });
      return { payments: payments.count, messages: messages.count };
    });
  }
}
