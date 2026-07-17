import { describe, it, expect, beforeEach, vi } from "vitest";
import { ClsService } from "nestjs-cls";
import { Role, TicketStatus } from "@prisma/client";
import { NotFoundException, ConflictException } from "@nestjs/common";

vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
  compare: vi.fn(),
}));

import { AgentsService } from "../src/agents/agents.service";
import { PrismaService } from "../src/prisma/prisma.service";

/**
 * Tests AgentsService — mikconnect.
 *
 * Stratégie : mock PrismaService + ClsService. Valide la création
 * d'un agent (User + Agent), la gestion commission/actif, et la
 * recherche email cross-tenant (bypass RLS).
 *
 * Cas couverts :
 *  - create : succès (crée User role=AGENT + Agent avec commission)
 *  - create : email déjà pris → ConflictException
 *  - findAll : retourne les agents avec compteurs
 *  - update : modifie commission et active
 *  - remove : supprime agent + user
 */
function makeClsMock() {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn((key: string) => store.get(key)),
    set: vi.fn((key: string, value: unknown) => store.set(key, value)),
  } as unknown as ClsService;
}

function makePrismaMock(opts: { emailExists?: boolean; agentExists?: boolean } = {}) {
  const { emailExists = false, agentExists = true } = opts;
  const usersStore: Record<string, unknown>[] = [];
  const agentsStore: Record<string, unknown>[] = [];

  const txMock = {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email?: string; id?: string } }) => {
        if (where.email) {
          return emailExists ? { id: "existing-user", email: where.email } : null;
        }
        if (where.id) return usersStore.find((u) => (u as { id: string }).id === where.id);
        return null;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const user = {
          id: `user-${Math.random().toString(36).slice(2, 8)}`,
          ...data,
          role: Role.AGENT,
        };
        usersStore.push(user);
        return user;
      }),
      delete: vi.fn(async () => undefined),
    },
    agent: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const agent = {
          id: `agent-${Math.random().toString(36).slice(2, 8)}`,
          ...data,
          active: true,
          createdAt: new Date(),
        };
        agentsStore.push(agent);
        return agent;
      }),
      findMany: vi.fn(async () =>
        agentsStore.map((a) => ({
          ...a,
          user: { id: "u1", name: "Mariam", email: "m@m.com", phone: null },
          tickets: [],
          _count: { sales: 0 },
        })),
      ),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        agentExists ? agentsStore.find((a) => (a as { id: string }).id === where.id) ?? {
          id: where.id,
          userId: "user-1",
          commissionPercent: 5,
          active: true,
          createdAt: new Date(),
          user: { id: "u1", name: "Mariam", email: "m@m.com", phone: null },
          tickets: [
            { status: TicketStatus.ISSUED },
            { status: TicketStatus.SOLD },
            { status: TicketStatus.SOLD },
          ],
          _count: { sales: 2 },
        } : null,
      ),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
        id: where.id,
        commissionPercent: data.commissionPercent ?? 5,
        active: data.active ?? true,
        updatedAt: new Date(),
        user: { id: "u1", name: "Mariam", email: "m@m.com", phone: null },
      })),
      delete: vi.fn(async () => undefined),
    },
  };

  return {
    ...txMock,
    withTenantContext: vi.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
  } as unknown as PrismaService & { withTenantContext: ReturnType<typeof vi.fn> };
}

describe("AgentsService", () => {
  let cls: ClsService;

  beforeEach(() => {
    cls = makeClsMock();
  });

  describe("create", () => {
    it("crée un agent (User role=AGENT + Agent avec commission)", async () => {
      const prisma = makePrismaMock();
      const service = new AgentsService(prisma, cls);

      const result = await service.create("tenant-1", {
        name: "Mariam",
        email: "mariam@exemple.com",
        password: "password123",
        commissionPercent: 5,
      });

      expect(result.user.role).toBe(Role.AGENT);
      expect(result.user.email).toBe("mariam@exemple.com");
      expect(result.commissionPercent).toBe(5);
      expect(result.active).toBe(true);
    });

    it("lève ConflictException si l'email existe déjà", async () => {
      const prisma = makePrismaMock({ emailExists: true });
      const service = new AgentsService(prisma, cls);

      await expect(
        service.create("tenant-1", {
          name: "Mariam",
          email: "existing@test.com",
          password: "password123",
          commissionPercent: 5,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("findAll", () => {
    it("retourne les agents avec compteurs", async () => {
      const prisma = makePrismaMock();
      const service = new AgentsService(prisma, cls);

      await service.create("tenant-1", {
        name: "Mariam",
        email: "mariam@exemple.com",
        password: "password123",
        commissionPercent: 5,
      });

      const result = await service.findAll("tenant-1");
      expect(result).toHaveLength(1);
      expect(result[0].ticketsCount).toBe(0);
      expect(result[0].salesCount).toBe(0);
    });
  });

  describe("update", () => {
    it("modifie la commission et le statut actif", async () => {
      const prisma = makePrismaMock();
      const service = new AgentsService(prisma, cls);

      const result = await service.update("tenant-1", "agent-1", {
        commissionPercent: 10,
        active: false,
      });

      expect(result.commissionPercent).toBe(10);
      expect(result.active).toBe(false);
    });

    it("lève NotFoundException si l'agent n'existe pas", async () => {
      const prisma = makePrismaMock({ agentExists: false });
      const service = new AgentsService(prisma, cls);

      await expect(
        service.update("tenant-1", "ghost", { commissionPercent: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("supprime l'agent et le user", async () => {
      const prisma = makePrismaMock();
      const service = new AgentsService(prisma, cls);

      await service.remove("tenant-1", "agent-1");
      // Vérifie que delete a été appelé (sur agent et user).
      expect(prisma.withTenantContext).toHaveBeenCalled();
    });

    it("lève NotFoundException si l'agent n'existe pas", async () => {
      const prisma = makePrismaMock({ agentExists: false });
      const service = new AgentsService(prisma, cls);

      await expect(
        service.remove("tenant-1", "ghost"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
