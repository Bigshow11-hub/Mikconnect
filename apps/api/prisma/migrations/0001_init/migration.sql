-- mikconnect — migration initiale (0001_init).
-- Création de toutes les tables métier + Row-Level Security par tenant_id.
--
-- RLS strategy :
--  1. Activer RLS sur chaque table métier.
--  2. Policy SELECT/INSERT/UPDATE/DELETE filtrant par current_setting('app.tenant_id').
--  3. Une policy ALLOW_BYPASS pour le role ADMIN (row_security = off côté app,
--     mais on garde une policy explicite pour les requêtes en lecture directe).
--
-- Le PrismaService positionne SET LOCAL app.tenant_id = '<id>' dans une
-- transaction avant chaque query. Si absent → la policy renvoie 0 ligne.
--
-- Tables sans RLS : RefreshToken (filtrée par user_id côté app, pas tenant),
-- Tenant (la policy filtre par id = current_setting pour qu'un tenant ne
-- voie que lui-même), AuditLog (écriture uniquement).

-- ============================================================================
-- Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Enums
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('OWNER', 'AGENT', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "Country" AS ENUM ('CI', 'GN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "Currency" AS ENUM ('XOF', 'GNF');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RouterStatus" AS ENUM ('ONLINE', 'OFFLINE', 'ERROR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TicketStatus" AS ENUM ('ISSUED', 'SOLD', 'USED', 'EXPIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SalesChannel" AS ENUM ('AGENT', 'MOBILE_MONEY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentProvider" AS ENUM ('ORANGE', 'MTN', 'MOOV', 'WAVE', 'SUDI');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO', 'BUSINESS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIALING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- Tenants & users
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Tenant" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"      TEXT NOT NULL,
  "country"   "Country" NOT NULL,
  "currency"  "Currency" NOT NULL,
  "tier"      "SubscriptionTier" NOT NULL DEFAULT 'FREE',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "User" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"     TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "email"        TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "role"         "Role" NOT NULL,
  "name"         TEXT NOT NULL,
  "phone"        TEXT,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "User"("tenantId");

CREATE TABLE IF NOT EXISTS "RefreshToken" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"   TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "tokenHash" TEXT NOT NULL,
  "issuedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "revokedAt" TIMESTAMPTZ,
  "userAgent" TEXT,
  "ip"        TEXT
);
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX IF NOT EXISTS "RefreshToken_revokedAt_idx" ON "RefreshToken"("revokedAt");

-- ============================================================================
-- Zones & routers
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Zone" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "name"      TEXT NOT NULL,
  "location"  TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Zone_tenantId_idx" ON "Zone"("tenantId");

CREATE TABLE IF NOT EXISTS "Router" (
  "id"                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"             TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "zoneId"               TEXT REFERENCES "Zone"("id") ON DELETE SET NULL,
  "label"                TEXT NOT NULL,
  "host"                 TEXT NOT NULL,
  "apiUser"              TEXT NOT NULL,
  "apiPasswordEncrypted" TEXT NOT NULL,
  "status"               "RouterStatus" NOT NULL DEFAULT 'OFFLINE',
  "lastSeenAt"           TIMESTAMPTZ,
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Router_tenantId_idx" ON "Router"("tenantId");
CREATE INDEX IF NOT EXISTS "Router_zoneId_idx" ON "Router"("zoneId");

-- ============================================================================
-- Plans, agents, tickets
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Plan" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"        TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "name"            TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "dataLimitMb"     INTEGER,
  "price"           INTEGER NOT NULL,
  "currency"        "Currency" NOT NULL,
  "active"          BOOLEAN NOT NULL DEFAULT true,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Plan_tenantId_idx" ON "Plan"("tenantId");

CREATE TABLE IF NOT EXISTS "Agent" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"          TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "userId"            TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "commissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "active"            BOOLEAN NOT NULL DEFAULT true,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Agent_tenantId_idx" ON "Agent"("tenantId");

CREATE TABLE IF NOT EXISTS "Ticket" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "code"      TEXT NOT NULL UNIQUE,
  "planId"    TEXT NOT NULL REFERENCES "Plan"("id"),
  "agentId"   TEXT REFERENCES "Agent"("id") ON DELETE SET NULL,
  "saleId"    TEXT,
  "status"    "TicketStatus" NOT NULL DEFAULT 'ISSUED',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "soldAt"    TIMESTAMPTZ,
  "usedAt"    TIMESTAMPTZ,
  "expiresAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS "Ticket_tenantId_idx" ON "Ticket"("tenantId");
CREATE INDEX IF NOT EXISTS "Ticket_status_idx" ON "Ticket"("status");
CREATE INDEX IF NOT EXISTS "Ticket_agentId_idx" ON "Ticket"("agentId");

-- ============================================================================
-- Sales, payments, sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Sale" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "ticketId"   TEXT NOT NULL UNIQUE REFERENCES "Ticket"("id") ON DELETE CASCADE,
  "agentId"    TEXT REFERENCES "Agent"("id") ON DELETE SET NULL,
  "amount"     INTEGER NOT NULL,
  "commission" INTEGER NOT NULL DEFAULT 0,
  "channel"    "SalesChannel" NOT NULL,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Sale_tenantId_idx" ON "Sale"("tenantId");
CREATE INDEX IF NOT EXISTS "Sale_agentId_idx" ON "Sale"("agentId");

CREATE TABLE IF NOT EXISTS "Payment" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "ticketId"      TEXT NOT NULL UNIQUE REFERENCES "Ticket"("id") ON DELETE CASCADE,
  "saleId"        TEXT NOT NULL UNIQUE REFERENCES "Sale"("id") ON DELETE CASCADE,
  "provider"      "PaymentProvider" NOT NULL,
  "providerTxId"  TEXT,
  "amount"        INTEGER NOT NULL,
  "currency"      "Currency" NOT NULL,
  "status"        "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "customerPhone" TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Payment_tenantId_idx" ON "Payment"("tenantId");
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");

CREATE TABLE IF NOT EXISTS "Session" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"        TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "ticketId"        TEXT NOT NULL UNIQUE REFERENCES "Ticket"("id") ON DELETE CASCADE,
  "radiusSessionId" TEXT,
  "startedAt"       TIMESTAMPTZ,
  "endedAt"         TIMESTAMPTZ,
  "dataUsedMb"      INTEGER NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Session_tenantId_idx" ON "Session"("tenantId");

-- ============================================================================
-- Subscription, audit
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Subscription" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"         TEXT NOT NULL UNIQUE REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "tier"             "SubscriptionTier" NOT NULL DEFAULT 'FREE',
  "status"           "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  "currentPeriodEnd" TIMESTAMPTZ,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "userId"     TEXT,
  "action"     TEXT NOT NULL,
  "resource"   TEXT NOT NULL,
  "resourceId" TEXT,
  "metadata"   JSONB,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- ============================================================================
-- Row-Level Security
-- ============================================================================
-- RLS sur toutes les tables métier sauf RefreshToken (filtrée par user_id côté
-- app — un refresh appartient à un user, pas à un tenant) et Tenant (policy
-- dédiée : un tenant ne voit que sa propre ligne).

ALTER TABLE "Tenant"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Zone"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Router"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Plan"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agent"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ticket"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sale"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"     ENABLE ROW LEVEL SECURITY;

-- Tenant : ne voit que sa propre ligne (id = tenant_id courant).
CREATE POLICY tenant_isolation ON "Tenant"
  FOR ALL
  USING (id = current_setting('app.tenant_id', true)::text);

-- Pour toutes les autres tables tenant-scoped : USING (tenant_id = ...) + WITH CHECK.
-- WITH CHECK garantit qu'un tenant ne peut pas INSERER/UPDATER une ligne pour un autre tenant.
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'User', 'Zone', 'Router', 'Plan', 'Agent', 'Ticket',
    'Sale', 'Payment', 'Session', 'Subscription', 'AuditLog'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING ("tenantId" = current_setting(''app.tenant_id'', true)::text) WITH CHECK ("tenantId" = current_setting(''app.tenant_id'', true)::text)',
      t || '_rls', t
    );
  END LOOP;
END $$;

-- ============================================================================
-- Prisma migration metadata (si lancé via prisma migrate deploy)
-- ============================================================================
-- Note : cette migration est versionnée manuellement. Si l'équipe adopte
-- `prisma migrate dev`, le schema migration_history sera créé automatiquement.
