import { describe, expect, it, vi } from "vitest";

import { TicketsPdfService } from "../src/tickets/tickets-pdf.service";
import type { PrismaService } from "../src/prisma/prisma.service";

function makeTicket(index: number) {
  return {
    id: `ticket-${index}`,
    code: `MK${String(index).padStart(6, "0")}`,
    expiresAt: new Date("2026-12-31T23:59:00.000Z"),
    plan: {
      name: "Journée",
      durationMinutes: 1440,
      dataLimitMb: 1024,
      price: 500,
      currency: "XOF",
    },
    agent: { user: { name: "Aïcha Traoré" } },
  };
}

function makePrisma(ticketCount: number) {
  const tickets = Array.from({ length: ticketCount }, (_, index) => makeTicket(index + 1));
  const tx = {
    tenant: {
      findUnique: vi.fn(async () => ({ name: "WiFi Conakry", zones: [{ name: "Matam" }] })),
    },
    ticket: { findMany: vi.fn(async () => tickets) },
  };
  return {
    withTenantContext: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  } as unknown as PrismaService;
}

function countPdfPages(pdf: Buffer) {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length;
}

describe("TicketsPdfService", () => {
  it("génère une feuille PDF avec QR pour un ticket accentué", async () => {
    const service = new TicketsPdfService(makePrisma(1));
    const pdf = await service.createVoucherSheet("tenant-1", "owner-1", "OWNER", ["ticket-1"]);

    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(countPdfPages(pdf)).toBe(1);
    expect(pdf.length).toBeGreaterThan(2_000);
  });

  it("pagine 200 tickets à 8 vouchers par page", async () => {
    const service = new TicketsPdfService(makePrisma(200));
    const ids = Array.from({ length: 200 }, (_, index) => `ticket-${index + 1}`);
    const pdf = await service.createVoucherSheet(
      "tenant-1",
      "owner-1",
      "OWNER",
      ids,
      "A4_STANDARD",
    );

    expect(countPdfPages(pdf)).toBe(25);
  }, 30_000);

  it("supporte un lot de 1 000 tickets en format compact", async () => {
    const service = new TicketsPdfService(makePrisma(1_000));
    const ids = Array.from({ length: 1_000 }, (_, index) => `ticket-${index + 1}`);
    const pdf = await service.createVoucherSheet("tenant-1", "owner-1", "OWNER", ids, "A4_COMPACT");

    expect(countPdfPages(pdf)).toBe(84);
    expect(pdf.length).toBeGreaterThan(100_000);
  }, 60_000);
});
