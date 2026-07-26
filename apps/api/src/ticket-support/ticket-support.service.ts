import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PaymentStatus, SmsStatus, type Prisma } from "@prisma/client";

import { SmsService } from "../payments/sms.service";
import { PrismaService } from "../prisma/prisma.service";
import { type TicketSupportLookupDto } from "./dto/ticket-support.dto";

@Injectable()
export class TicketSupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
  ) {}

  async lookup(tenantId: string, dto: TicketSupportLookupDto) {
    const context = await this.verifiedPayment(tenantId, dto);
    const totalDataMb = context.payment.ticket.sessions.reduce(
      (sum, session) => sum + session.dataUsedMb,
      0,
    );
    const totalSeconds = context.payment.ticket.sessions.reduce(
      (sum, session) => sum + session.sessionSeconds,
      0,
    );
    return {
      tenant: context.tenant,
      ticket: {
        code: context.payment.ticket.code,
        status: context.payment.ticket.status,
        provisioningStatus: context.payment.ticket.provisioningStatus,
        expiresAt: context.payment.ticket.expiresAt?.toISOString() ?? null,
        plan: context.payment.ticket.plan,
        usage: { dataUsedMb: totalDataMb, sessionSeconds: totalSeconds },
      },
      sms: context.payment.smsDelivery
        ? {
            status: context.payment.smsDelivery.status,
            sentAt: context.payment.smsDelivery.sentAt?.toISOString() ?? null,
            attempts: context.payment.smsDelivery.attempts,
          }
        : null,
      guidance: this.guidance(
        context.payment.ticket.status,
        context.payment.ticket.provisioningStatus,
      ),
    };
  }

  async resend(tenantId: string, dto: TicketSupportLookupDto) {
    const context = await this.verifiedPayment(tenantId, dto);
    if (context.payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException("Le paiement doit être confirmé avant l'envoi du code.");
    }
    const previous = context.payment.smsDelivery;
    if (previous && previous.attempts >= 3) {
      throw new HttpException(
        "La limite de renvois est atteinte. Contactez l'exploitant avec votre référence de paiement.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (previous && Date.now() - previous.updatedAt.getTime() < 5 * 60_000) {
      throw new HttpException(
        "Attendez cinq minutes avant un nouveau renvoi.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const result = await this.sms.sendTicket({
      phone: context.payment.customerPhone!,
      code: context.payment.ticket.code,
      planName: context.payment.ticket.plan.name,
    });
    await this.prisma.withExplicitTenantContext(tenantId, async (tx) => {
      await tx.smsDelivery.upsert({
        where: { paymentId: context.payment.id },
        create: {
          tenantId,
          paymentId: context.payment.id,
          phone: context.payment.customerPhone!,
          provider: result.provider,
          providerMessageId: result.messageId,
          status: SmsStatus.SENT,
          attempts: 1,
          sentAt: new Date(),
        },
        update: {
          provider: result.provider,
          providerMessageId: result.messageId,
          status: SmsStatus.SENT,
          attempts: { increment: 1 },
          sentAt: new Date(),
          errorMessage: null,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          action: "TICKET_SUPPORT_SMS_RESENT",
          resource: "Payment",
          resourceId: context.payment.id,
          metadata: { source: "public-support" } satisfies Prisma.InputJsonValue,
        },
      });
    });
    return { ok: true, message: "Le code WiFi a été renvoyé par SMS." };
  }

  private async verifiedPayment(tenantId: string, dto: TicketSupportLookupDto) {
    const reference = dto.reference.trim().toUpperCase();
    const phone = this.normalizePhone(dto.phone);
    const context = await this.prisma.withExplicitTenantContext(tenantId, async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true },
      });
      const payment = await tx.payment.findFirst({
        where: {
          tenantId,
          OR: [{ providerTxId: reference }, { ticket: { code: reference } }],
        },
        select: {
          id: true,
          status: true,
          customerPhone: true,
          smsDelivery: {
            select: { status: true, sentAt: true, attempts: true, updatedAt: true },
          },
          ticket: {
            select: {
              code: true,
              status: true,
              provisioningStatus: true,
              expiresAt: true,
              plan: {
                select: {
                  name: true,
                  durationMinutes: true,
                  dataLimitMb: true,
                  price: true,
                  currency: true,
                },
              },
              sessions: { select: { sessionSeconds: true, dataUsedMb: true } },
            },
          },
        },
      });
      return tenant && payment ? { tenant, payment } : null;
    });
    if (
      !context ||
      !context.payment.customerPhone ||
      !this.phonesMatch(this.normalizePhone(context.payment.customerPhone), phone)
    ) {
      throw new NotFoundException(
        "Aucun ticket ne correspond à cette référence et à ce numéro de téléphone.",
      );
    }
    return context;
  }

  private guidance(status: string, provisioningStatus: string) {
    if (provisioningStatus === "FAILED") {
      return "Le ticket est enregistré mais sa synchronisation réseau a échoué. Contactez l'exploitant.";
    }
    if (provisioningStatus === "PENDING") {
      return "Le ticket est enregistré. Sa synchronisation avec le routeur est encore en attente.";
    }
    if (status === "EXPIRED" || status === "CANCELLED") {
      return "Ce ticket n'est plus utilisable. Achetez un nouveau forfait pour vous reconnecter.";
    }
    return "Votre ticket est prêt. Saisissez le code dans le portail WiFi de la zone.";
  }

  private normalizePhone(phone: string) {
    return phone.replace(/\D/g, "");
  }

  private phonesMatch(stored: string, provided: string) {
    if (stored.length < 8 || provided.length < 8) return false;
    return stored === provided || stored.endsWith(provided) || provided.endsWith(stored);
  }
}
