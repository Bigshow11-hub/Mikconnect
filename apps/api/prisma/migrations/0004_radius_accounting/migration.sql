ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_ticketId_key";
ALTER TABLE "Session"
  ADD COLUMN "routerId" TEXT,
  ADD COLUMN "acctUniqueId" TEXT,
  ADD COLUMN "nasIpAddress" TEXT,
  ADD COLUMN "framedIpAddress" TEXT,
  ADD COLUMN "macAddress" TEXT,
  ADD COLUMN "sessionSeconds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "inputOctets" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "outputOctets" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "terminateCause" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Session"
SET
  "acctUniqueId" = COALESCE("radiusSessionId", 'legacy-' || "id"),
  "radiusSessionId" = COALESCE("radiusSessionId", 'legacy-' || "id"),
  "startedAt" = COALESCE("startedAt", "createdAt");

ALTER TABLE "Session"
  ALTER COLUMN "acctUniqueId" SET NOT NULL,
  ALTER COLUMN "radiusSessionId" SET NOT NULL,
  ALTER COLUMN "startedAt" SET NOT NULL;

CREATE UNIQUE INDEX "Session_acctUniqueId_key" ON "Session"("acctUniqueId");
CREATE INDEX "Session_ticketId_idx" ON "Session"("ticketId");
CREATE INDEX "Session_routerId_idx" ON "Session"("routerId");
CREATE INDEX "Session_startedAt_idx" ON "Session"("startedAt");
CREATE INDEX "Session_endedAt_idx" ON "Session"("endedAt");
ALTER TABLE "Session" ADD CONSTRAINT "Session_routerId_fkey"
  FOREIGN KEY ("routerId") REFERENCES "Router"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "RadiusCredential" (
  "id" SERIAL NOT NULL,
  "tenantId" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "sessionTimeout" INTEGER NOT NULL,
  "dataLimitBytes" BIGINT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RadiusCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RadiusCredential_ticketId_key" ON "RadiusCredential"("ticketId");
CREATE UNIQUE INDEX "RadiusCredential_username_key" ON "RadiusCredential"("username");
CREATE INDEX "RadiusCredential_tenantId_idx" ON "RadiusCredential"("tenantId");
CREATE INDEX "RadiusCredential_active_idx" ON "RadiusCredential"("active");
ALTER TABLE "RadiusCredential" ADD CONSTRAINT "RadiusCredential_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RadiusCredential" ADD CONSTRAINT "RadiusCredential_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "radacct" (
  "radacctid" BIGSERIAL PRIMARY KEY,
  "acctsessionid" VARCHAR(64) NOT NULL,
  "acctuniqueid" VARCHAR(64) NOT NULL,
  "username" VARCHAR(64) NOT NULL,
  "groupname" VARCHAR(64),
  "realm" VARCHAR(64),
  "nasipaddress" INET NOT NULL,
  "nasportid" VARCHAR(32),
  "nasporttype" VARCHAR(32),
  "acctstarttime" TIMESTAMPTZ,
  "acctupdatetime" TIMESTAMPTZ,
  "acctstoptime" TIMESTAMPTZ,
  "acctinterval" INTEGER,
  "acctsessiontime" BIGINT,
  "acctauthentic" VARCHAR(32),
  "connectinfo_start" VARCHAR(128),
  "connectinfo_stop" VARCHAR(128),
  "acctinputoctets" BIGINT,
  "acctoutputoctets" BIGINT,
  "calledstationid" VARCHAR(64),
  "callingstationid" VARCHAR(64),
  "acctterminatecause" VARCHAR(32),
  "servicetype" VARCHAR(32),
  "framedprotocol" VARCHAR(32),
  "framedipaddress" INET,
  "framedipv6address" INET,
  "framedipv6prefix" INET,
  "framedinterfaceid" TEXT,
  "delegatedipv6prefix" INET,
  "class" TEXT
);

CREATE UNIQUE INDEX "radacct_acctuniqueid_key" ON "radacct"("acctuniqueid");
CREATE INDEX "radacct_username_idx" ON "radacct"("username");
CREATE INDEX "radacct_active_idx" ON "radacct"("acctstoptime") WHERE "acctstoptime" IS NULL;
CREATE INDEX "radacct_updatetime_idx" ON "radacct"("acctupdatetime");

CREATE TABLE "nasreload" (
  "nasipaddress" INET PRIMARY KEY,
  "reloadtime" TIMESTAMPTZ NOT NULL
);

CREATE VIEW "radcheck" AS
SELECT
  "id",
  "username",
  'Cleartext-Password'::TEXT AS "attribute",
  ':='::VARCHAR(2) AS "op",
  "password"::TEXT AS "value"
FROM "RadiusCredential"
WHERE "active" = true;

CREATE VIEW "radreply" AS
SELECT
  ("id" * 2) AS "id",
  "username",
  'Session-Timeout'::TEXT AS "attribute",
  ':='::VARCHAR(2) AS "op",
  "sessionTimeout"::TEXT AS "value"
FROM "RadiusCredential"
WHERE "active" = true
UNION ALL
SELECT
  ("id" * 2 + 1) AS "id",
  "username",
  'Mikrotik-Total-Limit'::TEXT AS "attribute",
  ':='::VARCHAR(2) AS "op",
  "dataLimitBytes"::TEXT AS "value"
FROM "RadiusCredential"
WHERE "active" = true AND "dataLimitBytes" IS NOT NULL;
