import { Injectable, type OnModuleInit, type OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ClsService } from "nestjs-cls";

const TENANT_TRANSACTION_OPTIONS = {
  maxWait: 20_000,
  timeout: 30_000,
} as const;

/**
 * PrismaService — mikconnect.
 *
 * Multi-tenant via Row-Level Security (RLS) Postgres.
 *
 * Flux RLS :
 *  1. Une requête authentifiée arrive → JwtAuthGuard décode le JWT et
 *     injecte `req.user = { id, tenantId, role }`.
 *  2. Un interceptor/middlewareClsService (nestjs-cls) propage le tenantId
 *     dans un AsyncLocalStorage tout au long de la requête.
 *  3. Avant chaque query Prisma, le `$extends` ci-dessous exécute
 *     `SET LOCAL app.tenant_id = '<tenantId>'` dans une transaction.
 *  4. Les policies RLS Postgres (`USING (tenant_id = current_setting('app.tenant_id'))`)
 *     filtrent automatiquement chaque ligne lue/écrite.
 *
 * Avantage : pas de filtre manuel `where: { tenantId }` à oublier. Si un
 * service oublie le filtre, RLS le bloque au niveau DB — defense in depth.
 *
 * Mode admin (role=ADMIN) : `SET LOCAL app.bypass_rls = 'on'` pour accéder
 * à tous les tenants (panneau admin mikconnect).
 *
 * Mode anonyme (pas de JWT, ex. page d'achat publique) : tenantId est NULL,
 * RLS bloque tout sauf les routes explicitement marquées IsPublic.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly cls: ClsService) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log("Prisma connected");
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Récupère le tenantId du contexte requête (ALS via nestjs-cls).
   * Retourne null si la requête n'est pas authentifiée.
   */
  private getTenantId(): string | null {
    return this.cls.get<string | null>("tenantId") ?? null;
  }

  /**
   * Bypass RLS pour les admins mikconnect (panneau admin).
   * Positionné par le guard RBAC quand role=ADMIN.
   */
  private shouldBypassRls(): boolean {
    return this.cls.get<boolean>("bypassRls") ?? false;
  }

  /**
   * Wrapper transactionnel qui positionne `app.tenant_id` avant la query.
   * Utilisé par le `$extends` ci-dessous pour chaque opération Prisma.
   */
  async withTenantContext<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    const tenantId = this.getTenantId();
    const bypass = this.shouldBypassRls();

    if (!tenantId && !bypass) {
      // Pas de tenant + pas de bypass : on est en contexte public.
      // La requête ne doit toucher que des tables sans RLS (ex. Plans publics
      // pour la page d'achat). On exécute sans set_config.
      return fn(this);
    }

    return this.$transaction(async (tx) => {
      if (bypass) {
        await tx.$executeRaw`SET LOCAL row_security = off`;
      } else {
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      }
      return fn(tx as unknown as PrismaClient);
    }, TENANT_TRANSACTION_OPTIONS);
  }

  /**
   * Contexte RLS explicite pour une surface publique déjà rattachée à un
   * tenant (ex. lien d'achat partagé). Le service appelant doit limiter ses
   * lectures/écritures au tenant reçu dans l'URL.
   */
  async withExplicitTenantContext<T>(
    tenantId: string,
    fn: (tx: PrismaClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      return fn(tx as unknown as PrismaClient);
    }, TENANT_TRANSACTION_OPTIONS);
  }
}
