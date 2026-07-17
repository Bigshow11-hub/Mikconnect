import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConfigService } from "@nestjs/config";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { TicketStatus } from "@prisma/client";

import { TicketsService } from "../src/tickets/tickets.service";
import { MikrotikConnectorService } from "../src/routers/mikrotik-connector.service";
import { CryptoService } from "../src/common/crypto.service";
import { PrismaService } from "../src/prisma/prisma.service";

/**
 * Tests TicketsService — mikconnect.
 *
 * Stratégie : mock PrismaService + MikrotikConnectorService. Valide
 * generateBatch (plan validation, génération codes, persistance, push)
 * et findAll (filtres, pagination).
 *
 * Cas couverts :
 *  - generateBatch : succès (crée N tickets, push OK)
 *  - generateBatch : plan introuvable → NotFoundException
 *  - generateBatch : plan inactif → BadRequestException
 *  - generateBatch : agent introuvable → NotFoundException
 *  - generateBatch : pas de routeur online → push échoue mais tickets créés
 *  - findAll : filtre par statut
 *  - findAll : recherche par code (q)
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
      pushed: 3,
      failed: 0,
      message: "3 tickets poussés au routeur.",
    })),
  } as unknown as MikrotikConnectorService;
}

function makePrismaMock(
  crypto: CryptoService,
  opts: {
    planExists?: boolean;
    planActive?: boolean;
    agentExists?: boolean;
    agentActive?: boolean;
    routerOnline?: boolean;
  } = {},
) {
  const {
    planExists = true,
    planActive = true,
    agentExists = true,
    agentActive = true,
    routerOnline = true,
  } = opts;

  const ticketsStore: Record<string, unknown>[] = [];
  const plan = planExists
    ? {
        id: "plan-1",
        name: "Express",
        durationMinutes: 60,
        dataLimitMb: null,
        price: 100,
        currency: "XOF",
        active: planActive,
        tenantId: "tenant-1",
      }
    : null;

  const txMock = {
    ticketBatch: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "batch-1",
        ...data,
        createdAt: new Date(),
      })),
    },
    radiusCredential: {
      createMany: vi.fn(async () => ({ count: ticketsStore.length })),
    },
    plan: {
      findUnique: vi.fn(async () => (planExists ? { ...plan, active: planActive } : null)),
    },
    agent: {
      findUnique: vi.fn(async () =>
        agentExists ? { id: "agent-1", active: agentActive } : null,
      ),
    },
    ticket: {
      createManyAndReturn: vi.fn(async ({ data }: { data: Record<string, unknown>[] }) => {
        const created = data.map((d) => ({
          id: `ticket-${Math.random().toString(36).slice(2, 8)}`,
          ...d,
          createdAt: new Date(),
        }));
        ticketsStore.push(...created);
        return created;
      }),
      findMany: vi.fn(async ({ where, take, skip }: { where?: Record<string, unknown>; take?: number; skip?: number }) => {
        let result = ticketsStore.slice();
        if (where?.status) result = result.filter((t) => t.status === where.status);
        if (where?.code?.contains) {
          const q = String(where.code.contains).toLowerCase();
          result = result.filter((t) => String(t.code).toLowerCase().includes(q));
        }
        const offset = skip ?? 0;
        const limit = take ?? 50;
        return result.slice(offset, offset + limit);
      }),
      count: vi.fn(async () => ticketsStore.length),
      groupBy: vi.fn(async () => [
        { status: TicketStatus.ISSUED, _count: ticketsStore.length },
      ]),
    },
    router: {
      findFirst: vi.fn(async () =>
        routerOnline
          ? {
              id: "router-1",
              host: "192.168.88.1",
              apiUser: "api",
              apiPasswordEncrypted: crypto.encrypt("secret"),
            }
          : null,
      ),
    },
  };

  return {
    ...txMock,
    withTenantContext: vi.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
  } as unknown as PrismaService & { withTenantContext: ReturnType<typeof vi.fn> };
}

describe("TicketsService", () => {
  let config: ConfigService;
  let crypto: CryptoService;
  let connector: MikrotikConnectorService;

  beforeEach(() => {
    config = makeConfigMock();
    crypto = new CryptoService(config);
    connector = makeConnectorMock();
  });

  describe("generateBatch", () => {
    it("crée N tickets et pousse au routeur", async () => {
      const prisma = makePrismaMock(crypto);
      const service = new TicketsService(prisma, crypto, connector);

      const result = await service.generateBatch("tenant-1", {
        planId: "plan-1",
        quantity: 3,
      });

      expect(result.tickets).toHaveLength(3);
      expect(result.tickets[0].code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
      expect(result.push.ok).toBe(true);
      expect(result.push.pushed).toBe(3);
    });

    it("lève NotFoundException si le plan n'existe pas", async () => {
      const prisma = makePrismaMock(crypto, { planExists: false });
      const service = new TicketsService(prisma, crypto, connector);

      await expect(
        service.generateBatch("tenant-1", { planId: "ghost", quantity: 5 }),
      ).rejects.toThrow(NotFoundException);
    });

    it("lève BadRequestException si le plan est inactif", async () => {
      const prisma = makePrismaMock(crypto, { planActive: false });
      const service = new TicketsService(prisma, crypto, connector);

      await expect(
        service.generateBatch("tenant-1", { planId: "plan-1", quantity: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("lève NotFoundException si l'agent n'existe pas", async () => {
      const prisma = makePrismaMock(crypto, { agentExists: false });
      const service = new TicketsService(prisma, crypto, connector);

      await expect(
        service.generateBatch("tenant-1", { planId: "plan-1", quantity: 5, agentId: "ghost" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("crée les tickets même sans routeur online (push échoue)", async () => {
      const prisma = makePrismaMock(crypto, { routerOnline: false });
      const service = new TicketsService(prisma, crypto, connector);

      const result = await service.generateBatch("tenant-1", {
        planId: "plan-1",
        quantity: 2,
      });

      expect(result.tickets).toHaveLength(2);
      expect(result.push.ok).toBe(false);
      expect(result.push.pushed).toBe(0);
    });
  });

  describe("findAll", () => {
    it("retourne les tickets avec total", async () => {
      const prisma = makePrismaMock(crypto);
      const service = new TicketsService(prisma, crypto, connector);

      // Pré-remplit quelques tickets.
      await service.generateBatch("tenant-1", { planId: "plan-1", quantity: 3 });

      const result = await service.findAll("tenant-1", {});
      expect(result.tickets.length).toBe(3);
      expect(result.total).toBe(3);
    });

    it("filtre par statut", async () => {
      const prisma = makePrismaMock(crypto);
      const service = new TicketsService(prisma, crypto, connector);

      await service.generateBatch("tenant-1", { planId: "plan-1", quantity: 3 });

      const result = await service.findAll("tenant-1", { status: TicketStatus.ISSUED });
      expect(result.tickets.length).toBe(3);
      result.tickets.forEach((t) => expect(t.status).toBe(TicketStatus.ISSUED));
    });
  });
});
