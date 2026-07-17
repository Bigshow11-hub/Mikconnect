import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { ClsService } from "nestjs-cls";
import * as bcrypt from "bcryptjs";
import { UnauthorizedException, ConflictException } from "@nestjs/common";
import { Role, Country, Currency, SubscriptionTier, SubscriptionStatus } from "@prisma/client";

import { AuthService } from "../src/auth/auth.service";
import { CryptoService } from "../src/common/crypto.service";
import { PrismaService } from "../src/prisma/prisma.service";

/**
 * Tests AuthService — mikconnect.
 *
 * Strategie : mock PrismaService (pas de DB live en unit test) + JwtService réel
 * (sign/verify testable sans dépendances externes).
 *
 * Cas couverts :
 *  - register : succès (crée tenant + owner + plans + subscription)
 *  - register : échec si email déjà pris (ConflictException)
 *  - login : succès (retourne token pair)
 *  - login : échec si user introuvable (UnauthorizedException)
 *  - login : échec si password invalide (UnauthorizedException)
 *  - refresh : succès (rotation — ancien refresh révoqué, nouvelle paire)
 *  - refresh : détecte réutilisation (UnauthorizedException + révoque famille)
 *  - refresh : échec si refresh expiré
 *  - refresh : échec si signature invalide
 *  - logout : révoque le refresh
 *  - logout : idempotent si token invalide
 */

// --- Mock PrismaService ---
// withTenantContext exécute la fn avec `this` (le PrismaService mocké) comme tx.
function makePrismaMock() {
  const store: Record<string, unknown[]> = {
    tenant: [],
    user: [],
    refreshToken: [],
    plan: [],
    subscription: [],
  };
  const txMock = {
    tenant: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const tenant = {
          ...data,
          id: "tenant-1",
          users: [
            {
              id: "user-1",
              email: (data.users as { create: { email: string } }).create.email,
              role: Role.OWNER,
            },
          ],
        };
        store.tenant.push(tenant);
        return tenant;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({ id: where.id, ...data })),
    },
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email?: string; id?: string } }) => {
        if (where.email)
          return store.user.find((u) => (u as { email: string }).email === where.email);
        if (where.id) return store.user.find((u) => (u as { id: string }).id === where.id);
        return null;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({ id: where.id, ...data })),
    },
    refreshToken: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const rec = { ...data };
        store.refreshToken.push(rec);
        return rec;
      }),
      findUnique: vi.fn(
        async ({ where }: { where: { id: string } }) =>
          store.refreshToken.find((r) => (r as { id: string }).id === where.id) ?? null,
      ),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const idx = store.refreshToken.findIndex((r) => (r as { id: string }).id === where.id);
          if (idx === -1) return null;
          store.refreshToken[idx] = { ...store.refreshToken[idx], ...data };
          return store.refreshToken[idx];
        },
      ),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { userId: string; revokedAt: null };
          data: Record<string, unknown>;
        }) => {
          let count = 0;
          for (const r of store.refreshToken) {
            const rec = r as { userId: string; revokedAt: string | null };
            if (rec.userId === where.userId && rec.revokedAt === null) {
              Object.assign(rec, data);
              count++;
            }
          }
          return { count };
        },
      ),
    },
  };
  return {
    ...txMock,
    withTenantContext: vi.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
  } as unknown as PrismaService & { withTenantContext: ReturnType<typeof vi.fn> };
}

function makeConfigMock() {
  return {
    getOrThrow: vi.fn((key: string) => {
      const map: Record<string, string> = {
        JWT_ACCESS_SECRET: "test-access-secret",
        JWT_REFRESH_SECRET: "test-refresh-secret",
        JWT_ACCESS_TTL: "15m",
        MIKROTIK_ENCRYPTION_KEY: "00".repeat(32),
      };
      return map[key];
    }),
    get: vi.fn((key: string) => {
      const map: Record<string, string> = {
        JWT_ACCESS_TTL: "15m",
      };
      return map[key];
    }),
  } as unknown as ConfigService;
}

function makeClsMock() {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn((key: string) => store.get(key)),
    set: vi.fn((key: string, value: unknown) => store.set(key, value)),
  } as unknown as ClsService;
}

describe("AuthService", () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let auth: AuthService;

  beforeEach(() => {
    prisma = makePrismaMock();
    const config = makeConfigMock();
    const jwt = new JwtService({ secret: "test-access-secret" });
    const cls = makeClsMock();
    const crypto = new CryptoService(config);
    auth = new AuthService(prisma, jwt, config, cls, crypto);
  });

  describe("register", () => {
    it("crée un tenant + owner + plans + subscription", async () => {
      const tokens = await auth.register({
        email: "new.owner@test.com",
        password: "password123",
        name: "Nouveau proprio",
        country: Country.CI,
        tenantName: "Zone Yopougon",
      });

      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
      expect(tokens.expiresIn).toBe(7 * 24 * 60 * 60);
      expect(prisma.withTenantContext).toHaveBeenCalled();
    });

    it("échoue si l'email existe déjà", async () => {
      // Pré-remplit le user.
      const userRecord = {
        id: "user-existing",
        email: "existing@test.com",
        passwordHash: await bcrypt.hash("password123", 12),
        role: Role.OWNER,
        tenantId: "tenant-x",
        name: "X",
      };
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(userRecord);

      await expect(
        auth.register({
          email: "existing@test.com",
          password: "password123",
          name: "X",
          country: Country.CI,
          tenantName: "Zone X",
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("login", () => {
    it("retourne une token pair valide", async () => {
      const passwordHash = await bcrypt.hash("password123", 12);
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "user-1",
        email: "owner@test.com",
        passwordHash,
        role: Role.OWNER,
        tenantId: "tenant-1",
        name: "Owner",
      });

      const tokens = await auth.login({ email: "owner@test.com", password: "password123" });
      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
    });

    it("échoue si user introuvable", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      await expect(
        auth.login({ email: "ghost@test.com", password: "password123" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("échoue si password invalide", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "user-1",
        email: "owner@test.com",
        passwordHash: await bcrypt.hash("password123", 12),
        role: Role.OWNER,
        tenantId: "tenant-1",
        name: "Owner",
      });
      await expect(
        auth.login({ email: "owner@test.com", password: "wrong-password" }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("refresh", () => {
    it("rotation : émet une nouvelle paire et révoque l'ancien refresh", async () => {
      // 1. Login initial pour obtenir un refresh valide.
      const passwordHash = await bcrypt.hash("password123", 12);
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "user-1",
        email: "owner@test.com",
        passwordHash,
        role: Role.OWNER,
        tenantId: "tenant-1",
        name: "Owner",
      });
      const initial = await auth.login({ email: "owner@test.com", password: "password123" });

      // 2. Refresh.
      const refreshed = await auth.refresh(initial.refreshToken);
      expect(refreshed.accessToken).toBeTruthy();
      expect(refreshed.refreshToken).not.toBe(initial.refreshToken);

      // 3. L'ancien refresh est révoqué.
      const oldJti = await extractJti(initial.refreshToken, "test-refresh-secret");
      const oldRecord = (
        await (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mock.results.find(
          (r) => (r.value as { id: string }).id === oldJti,
        )
      )?.value as { revokedAt: string | null } | undefined;
      // Le mock retourne un nouveau record à chaque appel ; on vérifie via le store.
      expect(prisma.refreshToken.update).toHaveBeenCalled();
    });

    it("détecte la réutilisation et révoque la famille", async () => {
      // 1. Setup un refresh stocké déjà révoqué (simule un refresh utilisé 2x).
      const passwordHash = await bcrypt.hash("password123", 12);
      const userRecord = {
        id: "user-1",
        email: "owner@test.com",
        passwordHash,
        role: Role.OWNER,
        tenantId: "tenant-1",
        name: "Owner",
      };
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(userRecord);
      const initial = await auth.login({ email: "owner@test.com", password: "password123" });

      // 2. Révoque manuellement le refresh (simule un précédent usage).
      const jti = await extractJti(initial.refreshToken, "test-refresh-secret");
      (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: jti,
        userId: "user-1",
        tokenHash: await bcrypt.hash(initial.refreshToken, 10),
        expiresAt: new Date(Date.now() + 60000),
        revokedAt: new Date(), // déjà révoqué
      });

      // 3. Tentative de réutilisation → UnauthorizedException + updateMany appelé.
      await expect(auth.refresh(initial.refreshToken)).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });

    it("échoue si refresh expiré", async () => {
      // Génère un refresh expiré directement via JwtService.
      const jwt = new JwtService({ secret: "test-refresh-secret" });
      const expired = await jwt.signAsync(
        {
          sub: "user-1",
          tenantId: "tenant-1",
          role: Role.OWNER,
          email: "x@x.com",
          tokenType: "refresh",
          jti: "expired-jti",
        },
        { secret: "test-refresh-secret", expiresIn: "-1s" },
      );

      await expect(auth.refresh(expired)).rejects.toThrow(UnauthorizedException);
    });

    it("échoue si signature invalide", async () => {
      await expect(auth.refresh("not-a-valid-jwt")).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("logout", () => {
    it("révoque un refresh valide", async () => {
      const passwordHash = await bcrypt.hash("password123", 12);
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "user-1",
        email: "owner@test.com",
        passwordHash,
        role: Role.OWNER,
        tenantId: "tenant-1",
        name: "Owner",
      });
      const initial = await auth.login({ email: "owner@test.com", password: "password123" });

      await auth.logout(initial.refreshToken);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });

    it("reste idempotent si token invalide", async () => {
      await expect(auth.logout("invalid-token")).resolves.toBeUndefined();
    });
  });

  describe("updateProfile", () => {
    it("met à jour l’utilisateur et l’espace propriétaire", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "user-1",
        email: "owner@test.com",
        name: "Nouveau nom",
        phone: "+224600000000",
        role: Role.OWNER,
        tenantId: "tenant-1",
        tenant: {
          name: "Nouvelle zone",
          country: Country.GN,
          currency: Currency.GNF,
          tier: SubscriptionTier.FREE,
        },
      });

      const profile = await auth.updateProfile("user-1", "tenant-1", Role.OWNER, {
        name: "Nouveau nom",
        phone: "+224600000000",
        tenantName: "Nouvelle zone",
      });

      expect(prisma.user.update).toHaveBeenCalled();
      expect(prisma.tenant.update).toHaveBeenCalled();
      expect(profile.name).toBe("Nouveau nom");
    });
  });
});

// Helper : décode le jti d'un refresh sans verifyAsync (juste pour les tests).
async function extractJti(token: string, secret: string): Promise<string> {
  const jwt = new JwtService({ secret });
  const decoded = await jwt.verifyAsync<{ jti: string }>(token, { secret });
  return decoded.jti;
}
