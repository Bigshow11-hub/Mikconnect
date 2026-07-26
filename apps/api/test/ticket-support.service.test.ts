import { describe, expect, it, vi } from "vitest";

import type { SmsService } from "../src/payments/sms.service";
import type { PrismaService } from "../src/prisma/prisma.service";
import { TicketSupportService } from "../src/ticket-support/ticket-support.service";

function dependencies() {
  const payment = {
    id: "payment-1",
    status: "SUCCESS",
    customerPhone: "+224620000000",
    smsDelivery: {
      status: "SENT",
      sentAt: new Date(Date.now() - 600_000),
      attempts: 1,
      updatedAt: new Date(Date.now() - 600_000),
    },
    ticket: {
      code: "MK-TEST-01",
      status: "SOLD",
      provisioningStatus: "SYNCED",
      expiresAt: null,
      plan: {
        name: "Journée",
        durationMinutes: 1440,
        dataLimitMb: 1000,
        price: 5000,
        currency: "GNF",
      },
      sessions: [{ sessionSeconds: 600, dataUsedMb: 75 }],
    },
  };
  const tx = {
    tenant: { findUnique: vi.fn(async () => ({ id: "tenant-1", name: "Kolia" })) },
    payment: { findFirst: vi.fn(async () => payment) },
    smsDelivery: { upsert: vi.fn(async () => ({})) },
    auditLog: { create: vi.fn(async () => ({})) },
  };
  const prisma = {
    withExplicitTenantContext: vi.fn(
      async (_tenantId: string, callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    ),
  } as unknown as PrismaService;
  const sms = {
    sendTicket: vi.fn(async () => ({ provider: "local", messageId: "sms-1" })),
  } as unknown as SmsService;
  return { tx, prisma, sms };
}

describe("TicketSupportService", () => {
  it("révèle le ticket uniquement après vérification du téléphone", async () => {
    const { prisma, sms } = dependencies();
    const result = await new TicketSupportService(prisma, sms).lookup("tenant-1", {
      reference: "mk-test-01",
      phone: "620 000 000",
    });
    expect(result.ticket.code).toBe("MK-TEST-01");
    expect(result.ticket.usage).toEqual({ dataUsedMb: 75, sessionSeconds: 600 });
  });

  it("renvoie le SMS, incrémente le suivi et journalise", async () => {
    const { tx, prisma, sms } = dependencies();
    const result = await new TicketSupportService(prisma, sms).resend("tenant-1", {
      reference: "MK-TEST-01",
      phone: "+224 620 000 000",
    });
    expect(result.ok).toBe(true);
    expect(sms.sendTicket).toHaveBeenCalledOnce();
    expect(tx.smsDelivery.upsert).toHaveBeenCalledOnce();
    expect(tx.auditLog.create).toHaveBeenCalledOnce();
  });
});
