import { randomBytes } from "node:crypto";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  PaymentProvider,
  PaymentStatus,
  SalesChannel,
  SmsStatus,
  TicketStatus,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { generateUniqueCodes } from "../tickets/ticket-code.util";
import { CinetpayService, type CinetpayVerification } from "./cinetpay.service";
import { SmsService } from "./sms.service";
import type { CinetpayWebhookDto, CreatePublicPaymentDto } from "./dto/payments.dto";

const PROVIDERS_BY_COUNTRY = {
  CI: [PaymentProvider.ORANGE, PaymentProvider.MTN, PaymentProvider.MOOV, PaymentProvider.WAVE],
  GN: [PaymentProvider.ORANGE, PaymentProvider.MTN, PaymentProvider.SUDI],
} as const;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cinetpay: CinetpayService,
    private readonly sms: SmsService,
  ) {}

  async getStore(tenantId: string) {
    const store = await this.prisma.withExplicitTenantContext(tenantId, (tx) =>
      tx.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          country: true,
          currency: true,
          plans: {
            where: { active: true },
            select: { id: true, name: true, durationMinutes: true, dataLimitMb: true, price: true, currency: true },
            orderBy: [{ price: "asc" }, { durationMinutes: "asc" }],
          },
        },
      }),
    );
    if (!store) throw new NotFoundException("Point de vente introuvable.");
    return { ...store, providers: PROVIDERS_BY_COUNTRY[store.country] };
  }

  async initiate(tenantId: string, dto: CreatePublicPaymentDto) {
    const phone = dto.customerPhone.replace(/\s/g, "");
    const context = await this.prisma.withExplicitTenantContext(tenantId, async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, country: true, currency: true },
      });
      if (!tenant) throw new NotFoundException("Point de vente introuvable.");
      if (!(PROVIDERS_BY_COUNTRY[tenant.country] as readonly PaymentProvider[]).includes(dto.provider)) {
        throw new BadRequestException("Ce moyen de paiement n'est pas disponible dans ce pays.");
      }
      const plan = await tx.plan.findFirst({ where: { id: dto.planId, tenantId, active: true } });
      if (!plan) throw new NotFoundException("Forfait introuvable ou indisponible.");
      if (plan.price % 5 !== 0) throw new BadRequestException("Le prix du forfait doit être un multiple de 5.");

      const transactionId = this.transactionId();
      const code = generateUniqueCodes(1)[0]!;
      const ticket = await tx.ticket.create({
        data: {
          tenantId,
          planId: plan.id,
          code,
          status: TicketStatus.ISSUED,
          expiresAt: new Date(Date.now() + plan.durationMinutes * 60 * 1000),
        },
      });
      await tx.radiusCredential.create({
        data: {
          tenantId,
          ticketId: ticket.id,
          username: ticket.code,
          password: ticket.code,
          sessionTimeout: plan.durationMinutes * 60,
          dataLimitBytes: plan.dataLimitMb == null
            ? null
            : BigInt(plan.dataLimitMb) * 1024n * 1024n,
        },
      });
      const payment = await tx.payment.create({
        data: {
          tenantId,
          ticketId: ticket.id,
          provider: dto.provider,
          providerTxId: transactionId,
          amount: plan.price,
          currency: plan.currency,
          customerPhone: phone,
          status: PaymentStatus.PENDING,
        },
      });
      return { tenant, plan, payment, transactionId };
    });

    try {
      const checkout = await this.cinetpay.initialize({
        transactionId: context.transactionId,
        tenantId,
        amount: context.plan.price,
        currency: context.plan.currency,
        description: `Acces WiFi ${context.plan.name} ${context.tenant.name}`,
        customerPhone: phone,
      });
      if (this.cinetpay.isMock) {
        await this.settleAccepted(tenantId, context.transactionId, {
          status: "ACCEPTED",
          amount: context.plan.price,
          currency: context.plan.currency,
          paymentMethod: dto.provider,
        });
      }
      return {
        transactionId: context.transactionId,
        paymentUrl: checkout.paymentUrl,
        status: this.cinetpay.isMock ? PaymentStatus.SUCCESS : PaymentStatus.PENDING,
        simulated: this.cinetpay.isMock,
      };
    } catch (error) {
      await this.prisma.withExplicitTenantContext(tenantId, (tx) =>
        tx.payment.update({
          where: { id: context.payment.id },
          data: { status: PaymentStatus.FAILED },
        }),
      );
      throw error;
    }
  }

  async handleWebhook(body: CinetpayWebhookDto, token?: string) {
    if (!this.cinetpay.verifyWebhook(body, token)) throw new ForbiddenException("Signature CinetPay invalide.");
    const tenantId = body.cpm_custom;
    if (!tenantId) throw new BadRequestException("Contexte de paiement manquant.");

    const local = await this.findPublicPayment(tenantId, body.cpm_trans_id);
    if (local.status === PaymentStatus.SUCCESS) return { received: true, idempotent: true };
    const verification = await this.cinetpay.check(body.cpm_trans_id);

    if (verification.status === "ACCEPTED") {
      await this.settleAccepted(tenantId, body.cpm_trans_id, verification);
    } else if (["REFUSED", "CANCELLED"].includes(verification.status)) {
      await this.rejectPayment(tenantId, body.cpm_trans_id, verification.status === "CANCELLED");
    }
    return { received: true };
  }

  async getPublicStatus(tenantId: string, transactionId: string) {
    const payment = await this.findPublicPayment(tenantId, transactionId);
    return {
      transactionId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      planName: payment.ticket.plan.name,
      ticketCode: payment.status === PaymentStatus.SUCCESS ? payment.ticket.code : null,
      smsStatus: payment.smsDelivery?.status ?? null,
    };
  }

  async list(tenantId: string) {
    return this.prisma.withTenantContext((tx) =>
      tx.payment.findMany({
        where: { tenantId },
        select: {
          id: true, providerTxId: true, provider: true, amount: true, currency: true,
          status: true, customerPhone: true, createdAt: true,
          ticket: { select: { code: true, plan: { select: { name: true } } } },
          smsDelivery: { select: { status: true, sentAt: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    );
  }

  async summary(tenantId: string) {
    const [success, pending, failed] = await Promise.all([
      this.prisma.withTenantContext((tx) => tx.payment.aggregate({ where: { tenantId, status: PaymentStatus.SUCCESS }, _sum: { amount: true }, _count: true })),
      this.prisma.withTenantContext((tx) => tx.payment.count({ where: { tenantId, status: PaymentStatus.PENDING } })),
      this.prisma.withTenantContext((tx) => tx.payment.count({ where: { tenantId, status: { in: [PaymentStatus.FAILED, PaymentStatus.CANCELLED] } } })),
    ]);
    return { revenue: success._sum.amount ?? 0, successful: success._count, pending, failed };
  }

  private async settleAccepted(tenantId: string, transactionId: string, verification: CinetpayVerification) {
    const settled = await this.prisma.withExplicitTenantContext(tenantId, async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { tenantId, providerTxId: transactionId },
        include: { ticket: { include: { plan: true } }, smsDelivery: true },
      });
      if (!payment) throw new NotFoundException("Paiement introuvable.");
      if (payment.status === PaymentStatus.SUCCESS) return payment;
      if (payment.amount !== verification.amount || payment.currency !== verification.currency) {
        throw new BadRequestException("Le montant vérifié ne correspond pas à la commande.");
      }

      const claimed = await tx.payment.updateMany({
        where: { id: payment.id, status: { not: PaymentStatus.SUCCESS } },
        data: { status: PaymentStatus.SUCCESS },
      });
      if (claimed.count === 0) {
        return tx.payment.findUniqueOrThrow({
          where: { id: payment.id },
          include: { ticket: { include: { plan: true } }, smsDelivery: true },
        });
      }
      const sale = await tx.sale.create({
        data: {
          tenantId,
          ticketId: payment.ticketId,
          amount: payment.amount,
          commission: 0,
          channel: SalesChannel.MOBILE_MONEY,
        },
      });
      await tx.ticket.update({
        where: { id: payment.ticketId },
        data: { status: TicketStatus.SOLD, soldAt: new Date(), saleId: sale.id },
      });
      return tx.payment.update({
        where: { id: payment.id },
        data: { saleId: sale.id },
        include: { ticket: { include: { plan: true } }, smsDelivery: true },
      });
    });

    await this.deliverSms(tenantId, settled.id);
    this.logger.log(`Paiement confirmé et ticket livré: ${transactionId}`);
  }

  private async deliverSms(tenantId: string, paymentId: string) {
    const delivery = await this.prisma.withExplicitTenantContext(tenantId, async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { ticket: { include: { plan: true } }, smsDelivery: true },
      });
      if (!payment?.customerPhone) return null;
      if (payment.smsDelivery?.status === SmsStatus.SENT) return null;
      const row = payment.smsDelivery ?? await tx.smsDelivery.create({
        data: { tenantId, paymentId, phone: payment.customerPhone, provider: "pending", attempts: 0 },
      });
      return { row, phone: payment.customerPhone, code: payment.ticket.code, planName: payment.ticket.plan.name };
    });
    if (!delivery) return;

    try {
      const result = await this.sms.sendTicket(delivery);
      await this.prisma.withExplicitTenantContext(tenantId, (tx) =>
        tx.smsDelivery.update({
          where: { id: delivery.row.id },
          data: { status: SmsStatus.SENT, provider: result.provider, providerMessageId: result.messageId, attempts: { increment: 1 }, sentAt: new Date(), errorMessage: null },
        }),
      );
    } catch (error) {
      await this.prisma.withExplicitTenantContext(tenantId, (tx) =>
        tx.smsDelivery.update({
          where: { id: delivery.row.id },
          data: { status: SmsStatus.FAILED, attempts: { increment: 1 }, errorMessage: error instanceof Error ? error.message : "Erreur SMS" },
        }),
      );
    }
  }

  private async rejectPayment(tenantId: string, transactionId: string, cancelled: boolean) {
    await this.prisma.withExplicitTenantContext(tenantId, async (tx) => {
      const payment = await tx.payment.findFirst({ where: { tenantId, providerTxId: transactionId } });
      if (!payment || payment.status === PaymentStatus.SUCCESS) return;
      await tx.payment.update({ where: { id: payment.id }, data: { status: cancelled ? PaymentStatus.CANCELLED : PaymentStatus.FAILED } });
      await tx.ticket.update({ where: { id: payment.ticketId }, data: { status: TicketStatus.CANCELLED } });
    });
  }

  private async findPublicPayment(tenantId: string, transactionId: string) {
    const payment = await this.prisma.withExplicitTenantContext(tenantId, (tx) =>
      tx.payment.findFirst({
        where: { tenantId, providerTxId: transactionId },
        include: { ticket: { include: { plan: true } }, smsDelivery: true },
      }),
    );
    if (!payment) throw new NotFoundException("Paiement introuvable.");
    return payment;
  }

  private transactionId() {
    return `MK${Date.now().toString(36).toUpperCase()}${randomBytes(4).toString("hex").toUpperCase()}`;
  }
}
