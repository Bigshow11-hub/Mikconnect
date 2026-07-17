import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { ClsService } from "nestjs-cls";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { CryptoService } from "../common/crypto.service";
import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Country, Currency, Role, SubscriptionTier, SubscriptionStatus } from "@prisma/client";
import type { JwtPayload } from "./strategies/jwt.strategy";
import { type RegisterDto, type LoginDto, type UpdateProfileDto } from "./dto/auth.dto";

/**
 * Refresh token store — mikconnect.
 *
 * Stockage en DB (table RefreshToken à ajouter au schéma) OU en mémoire pour
 * le MVP. Ici : DB via PrismaService pour survivre aux restarts.
 *
 * Rotation : chaque refresh consomme le token précédent et émet une nouvelle
 * paire (access, refresh). Le refresh utilisé est invalidé. Si un refresh
 * est réutilisé après invalidation → possible vol : on invalide toute la
 * famille (tous les refresh d'un user) et on force un re-login.
 *
 * Implémentation MVP : hash bcrypt du refresh en DB, comparaison constante.
 */

const ACCESS_TTL_DEFAULT = "15m";
const REFRESH_TTL_DAYS = 7;
const REFRESH_TTL_SECONDS = REFRESH_TTL_DAYS * 24 * 60 * 60;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** Durée de vie en secondes du refresh — pour le client. */
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly cls: ClsService,
    private readonly crypto: CryptoService,
  ) {}

  // --- Token helpers ---

  private async signAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwt.signAsync(
      { ...payload, tokenType: "access" },
      {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: this.config.get<string>("JWT_ACCESS_TTL") ?? ACCESS_TTL_DEFAULT,
      },
    );
  }

  private async signRefreshToken(payload: JwtPayload, jti: string): Promise<string> {
    return this.jwt.signAsync(
      { ...payload, tokenType: "refresh", jti },
      {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: `${REFRESH_TTL_SECONDS}s`,
      },
    );
  }

  private async issueTokenPair(user: {
    id: string;
    tenantId: string;
    role: Role;
    email: string;
  }): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      tokenType: "access",
    };

    const jti = randomBytes(16).toString("hex");
    const accessToken = await this.signAccessToken(payload);
    const refreshToken = await this.signRefreshToken(payload, jti);

    // Persiste le refresh hashé. Le bypass RLS est actif pour que le user
    // puisse écrire dans sa propre ligne (RLS sur refresh_token est sur
    // user_id, pas tenant_id — voir schema).
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.withTenantContext((tx) =>
      tx.refreshToken.create({
        data: {
          id: jti,
          userId: user.id,
          tokenHash: hash,
          expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
        },
      }),
    );

    return { accessToken, refreshToken, expiresIn: REFRESH_TTL_SECONDS };
  }

  // --- Auth flows ---

  async register(dto: RegisterDto): Promise<TokenPair> {
    const existing = await this.prisma.withTenantContext((tx) =>
      tx.user.findUnique({ where: { email: dto.email }, select: { id: true } }),
    );
    if (existing) {
      throw new ConflictException("Un compte existe déjà avec cet email");
    }

    const currency = dto.country === Country.CI ? Currency.XOF : Currency.GNF;

    // Création tenant + owner + subscription en une transaction.
    // RLS n'est pas encore actif (pas de tenantId), donc on bypass pour cette
    // transaction d'initialisation.
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const created = await this.prisma.withTenantContext(async (tx) => {
      this.cls.set("bypassRls", true);
      return tx.tenant.create({
        data: {
          name: dto.tenantName,
          country: dto.country,
          currency,
          tier: SubscriptionTier.FREE,
          users: {
            create: {
              email: dto.email,
              passwordHash,
              role: Role.OWNER,
              name: dto.name,
              phone: dto.phone,
            },
          },
          subscription: {
            create: {
              tier: SubscriptionTier.FREE,
              status: SubscriptionStatus.TRIALING,
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          },
          // Forfaits par défaut selon pays.
          plans: {
            createMany: {
              data: defaultPlans(dto.country, currency),
            },
          },
        },
        include: { users: { take: 1 } },
      });
    });

    const owner = created.users[0];
    if (!owner) {
      throw new Error("Failed to create owner user");
    }

    this.logger.log(`Tenant created: ${created.id} (${dto.tenantName}) — owner ${owner.email}`);

    return this.issueTokenPair({
      id: owner.id,
      tenantId: created.id,
      role: Role.OWNER,
      email: owner.email,
    });
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    // Recherche user cross-tenant (login par email global). RLS sur User est
    // par tenant_id, donc on bypass pour la recherche.
    const user = await this.prisma.withTenantContext(async (tx) => {
      this.cls.set("bypassRls", true);
      return tx.user.findUnique({ where: { email: dto.email } });
    });

    if (!user) {
      throw new UnauthorizedException("Email ou mot de passe invalide");
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Email ou mot de passe invalide");
    }

    return this.issueTokenPair({
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    });
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    // 1. Vérifie la signature + expiration.
    let payload: JwtPayload & { jti?: string };
    try {
      payload = await this.jwt.verifyAsync<JwtPayload & { jti: string }>(refreshToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Refresh token invalide ou expiré");
    }

    if (payload.tokenType !== "refresh" || !payload.jti) {
      throw new UnauthorizedException("Type de token invalide");
    }

    // 2. Recherche le refresh en DB. Si absent → déjà utilisé ou révoqué →
    //    possible vol : on invalide toute la famille.
    const stored = await this.prisma.withTenantContext((tx) =>
      tx.refreshToken.findUnique({ where: { id: payload.jti } }),
    );

    if (!stored || stored.revokedAt) {
      // Possible réutilisation d'un refresh volé. Révoque tous les refresh
      // actifs du user pour forcer un re-login.
      this.logger.warn(`Refresh reuse detected for user ${payload.sub} — revoking all sessions`);
      await this.prisma.withTenantContext((tx) =>
        tx.refreshToken.updateMany({
          where: { userId: payload.sub, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      );
      throw new UnauthorizedException("Refresh token invalide — reconnexion requise");
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token expiré");
    }

    // 3. Vérifie le hash (timing-safe).
    const hashOk = await bcrypt.compare(refreshToken, stored.tokenHash);
    if (!hashOk) {
      throw new UnauthorizedException("Refresh token invalide");
    }

    // 4. Rotation : révoque ce refresh, émet une nouvelle paire.
    await this.prisma.withTenantContext((tx) =>
      tx.refreshToken.update({
        where: { id: payload.jti },
        data: { revokedAt: new Date() },
      }),
    );

    return this.issueTokenPair({
      id: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role as Role,
      email: payload.email,
    });
  }

  async logout(refreshToken: string): Promise<void> {
    let payload: JwtPayload & { jti?: string };
    try {
      payload = await this.jwt.verifyAsync<JwtPayload & { jti: string }>(refreshToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
        ignoreExpiration: true,
      });
    } catch {
      // Token invalide : on considère l'utilisateur déjà déconnecté.
      return;
    }
    if (payload.tokenType !== "refresh" || !payload.jti) return;

    await this.prisma
      .withTenantContext((tx) =>
        tx.refreshToken.updateMany({
          where: { id: payload.jti!, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      )
      .catch(() => void 0);
  }

  async me(userId: string) {
    const user = await this.prisma.withTenantContext((tx) =>
      tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          tenantId: true,
          tenant: { select: { name: true, country: true, currency: true, tier: true } },
        },
      }),
    );
    if (!user) throw new NotFoundException("Utilisateur introuvable");
    return user;
  }

  async updateProfile(userId: string, tenantId: string, role: Role, dto: UpdateProfileDto) {
    if (dto.tenantName !== undefined && role !== Role.OWNER && role !== Role.ADMIN) {
      throw new ForbiddenException("Seul le propriétaire peut modifier le nom de l’espace");
    }

    await this.prisma.withTenantContext(async (tx) => {
      if (dto.name !== undefined || dto.phone !== undefined) {
        await tx.user.update({
          where: { id: userId, tenantId },
          data: {
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
          },
        });
      }

      if (dto.tenantName !== undefined) {
        await tx.tenant.update({
          where: { id: tenantId },
          data: { name: dto.tenantName.trim() },
        });
      }
    });

    return this.me(userId);
  }
}

/**
 * Forfaits par défaut à la création d'un tenant (PRD §7).
 */
function defaultPlans(country: Country, currency: Currency) {
  const isCI = country === Country.CI;
  const prices = {
    express: isCI ? 100 : 1000,
    halfDay: isCI ? 300 : 3000,
    daily: isCI ? 500 : 5000,
    weekly: isCI ? 2000 : 20000,
  };
  return [
    { name: "Express", durationMinutes: 60, price: prices.express, currency },
    { name: "Demi-journée", durationMinutes: 6 * 60, price: prices.halfDay, currency },
    { name: "Journalier", durationMinutes: 24 * 60, price: prices.daily, currency },
    { name: "Hebdo", durationMinutes: 7 * 24 * 60, price: prices.weekly, currency },
  ];
}
