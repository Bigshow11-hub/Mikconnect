import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConfigService } from "@nestjs/config";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { TicketStatus, SalesChannel } from "@prisma/client";

import { TicketsService } from "../src/tickets/tickets.service";
import { MikrotikConnectorService } from "../src/routers/mikrotik-connector.service";
import { CryptoService } from "../src/common/crypto.service";
import { PrismaService } from "../src/prisma/prisma.service";

/**
 * Tests TicketsService.sellTicket — mikconnect.
 *
 * Valide le flux de vente : ISSUED → SOLD + Sale record avec commission.
 *
 * Cas couverts :
 *  - sellTicket : succès (ISSUED → SOLD, Sale créé, commission calculée)
 *  - sellTicket : sans agent (commission = 0)
 *  - sellTicket : ticket déjà vendu → BadRequestException
 *  - sellTicket : ticket inexistant → NotFoundException
 *  - sellTicket : agent inactif → BadRequestException
 *  - agentSalesSummary : retourne ventes + totaux
 *  - allAgentsSalesSummary : résumé tous agents
 */
function makeConfigMock() {
  return {
    getOrThrow: vi.fn(() => "00".repeat(32)),
    get: vi.fn((key: string) => (key === "MIKROTIK_MOCK" ? "true" : undefined)),
  } as unknown as ConfigService;
}

function makeConnectorMock() {
  return {
    testConnection: vi.fn(async () => ({ ok: true, message: "OK" })),
    pushTickets: vi.fn(async () => ({
      ok: true,
      pushed: 1,
      failed: 0,
      message: "1 ticket poussé au routeur.",
    })),
  } as unknown as MikrotikConnectorService;
}

function makePrismaMock(opts: {
  ticketStatus?: TicketStatus;
  agentActive?: boolean;
  agentExists?: boolean;
} = {}) {
  const {
    ticketStatus = TicketStatus.ISSUED,
    agentActive = true,
    agentExists = true,
  } = opts;

  const salesStore: Record<string, unknown>[] = [];
  const plan = {
    id: "plan-1",
    name: "Express",
    durationMinutes: 60,
    dataLimitMb: null,
    price: 100,
    currency: "XOF",
    active: true,
    tenantId: "tenant-1",
  };

  const ticket = {
    id: "ticket-1",
    code: "MK-TEST-01",
    status: ticketStatus,
    planId: "plan-1",
    agentId: null,
    plan,
    createdAt: new Date(),
  };

  const agent = agentExists
    ? { id: "agent-1", commissionPercent: 5, active: agentActive }
    : null;

  const txMock = {
    plan: { findUnique: vi.fn(async () => ({ ...plan, active: true })) },
    agent: {
      findUnique: vi.fn(async () => agent),
      findMany: vi.fn(async () => [
        {
          id: "agent-1",
          commissionPercent: 5,
          active: true,
          user: { name: "Mariam" },
          sales: [{ amount: 100, commission: 5 }],
        },
      ]),
    },
    ticket: {
      createManyAndReturn: vi.fn(async ({ data }: { data: Record<string, unknown>[] }) =>
        data.map((d) => ({ id: `t-${Math.random()}`, ...d, createdAt: new Date() })),
      ),
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
      groupBy: vi.fn(async () => []),
      findUnique: vi.fn(async () => ticket),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "ticket-1",
        code: "MK-TEST-01",
        status: data.status ?? TicketStatus.SOLD,
        soldAt: data.soldAt ?? new Date(),
      })),
    },
    router: { findFirst: vi.fn(async () => null) },
    sale: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const sale = {
          id: `sale-${Math.random().toString(36).slice(2, 6)}`,
          ...data,
          createdAt: new Date(),
        };
        salesStore.push(sale);
        return sale;
      }),
      findMany: vi.fn(async () => [
        {
          id: "sale-1",
          amount: 100,
          commission: 5,
          createdAt: new Date(),
          ticket: { id: "ticket-1", code: "MK-TEST-01", plan: { name: "Express" } },
        },
      ]),
    },
  };

  return {
    ...txMock,
    withTenantContext: vi.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
  } as unknown as PrismaService & { withTenantContext: ReturnType<typeof vi.fn> };
}

describe("TicketsService.sellTicket", () => {
  let config: ConfigService;
  let crypto: CryptoService;
  let connector: MikrotikConnectorService;

  beforeEach(() => {
    config = makeConfigMock();
    crypto = new CryptoService(config);
    connector = makeConnectorMock();
  });

  it("vend un ticket ISSUED → SOLD avec commission agent", async () => {
    const prisma = makePrismaMock();
    const service = new TicketsService(prisma, crypto, connector);

    const result = await service.sellTicket("tenant-1", "ticket-1", "agent-1");

    expect(result.ticket.status).toBe(TicketStatus.SOLD);
    expect(result.sale.amount).toBe(100);
    expect(result.sale.commission).toBe(5); // 5% de 100
    expect(result.sale.channel).toBe(SalesChannel.AGENT);
  });

  it("vend sans agent (commission = 0)", async () => {
    const prisma = makePrismaMock();
    const service = new TicketsService(prisma, crypto, connector);

    const result = await service.sellTicket("tenant-1", "ticket-1");

    expect(result.sale.commission).toBe(0);
  });

  it("lève BadRequestException si le ticket est déjà vendu", async () => {
    const prisma = makePrismaMock({ ticketStatus: TicketStatus.SOLD });
    const service = new TicketsService(prisma, crypto, connector);

    await expect(
      service.sellTicket("tenant-1", "ticket-1", "agent-1"),
    ).rejects.toThrow(BadRequestException);
  });

  it("lève NotFoundException si le ticket n'existe pas", async () => {
    const prisma = makePrismaMock();
    (prisma as unknown as { ticket: { findUnique: ReturnType<typeof vi.fn> } }).ticket.findUnique.mockResolvedValueOnce(null);
    const service = new TicketsService(prisma, crypto, connector);

    await expect(
      service.sellTicket("tenant-1", "ghost", "agent-1"),
    ).rejects.toThrow(NotFoundException);
  });

  it("lève BadRequestException si l'agent est inactif", async () => {
    const prisma = makePrismaMock({ agentActive: false });
    const service = new TicketsService(prisma, crypto, connector);

    await expect(
      service.sellTicket("tenant-1", "ticket-1", "agent-1"),
    ).rejects.toThrow(BadRequestException);
  });

  it("lève NotFoundException si l'agent n'existe pas", async () => {
    const prisma = makePrismaMock({ agentExists: false });
    const service = new TicketsService(prisma, crypto, connector);

    await expect(
      service.sellTicket("tenant-1", "ticket-1", "ghost"),
    ).rejects.toThrow(NotFoundException);
  });
});

describe("TicketsService.agentSalesSummary", () => {
  it("retourne les ventes avec totaux", async () => {
    const config = makeConfigMock();
    const crypto = new CryptoService(config);
    const connector = makeConnectorMock();
    const prisma = makePrismaMock();
    const service = new TicketsService(prisma, crypto, connector);

    const result = await service.agentSalesSummary("tenant-1", "agent-1");

    expect(result.salesCount).toBe(1);
    expect(result.totalAmount).toBe(100);
    expect(result.totalCommission).toBe(5);
  });

  it("lève NotFoundException si l'agent n'existe pas", async () => {
    const config = makeConfigMock();
    const crypto = new CryptoService(config);
    const connector = makeConnectorMock();
    const prisma = makePrismaMock({ agentExists: false });
    const service = new TicketsService(prisma, crypto, connector);

    await expect(
      service.agentSalesSummary("tenant-1", "ghost"),
    ).rejects.toThrow(NotFoundException);
  });
});

describe("TicketsService.allAgentsSalesSummary", () => {
  it("retourne un résumé par agent", async () => {
    const config = makeConfigMock();
    const crypto = new CryptoService(config);
    const connector = makeConnectorMock();
    const prisma = makePrismaMock();
    const service = new TicketsService(prisma, crypto, connector);

    const result = await service.allAgentsSalesSummary("tenant-1");

    expect(result).toHaveLength(1);
    expect(result[0].totalAmount).toBe(100);
    expect(result[0].totalCommission).toBe(5);
    expect(result[0].salesCount).toBe(1);
  });
});
