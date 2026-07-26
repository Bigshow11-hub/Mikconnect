CREATE TABLE "MonitoringLink" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "zoneId" TEXT,
  "name" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "tokenEncrypted" TEXT NOT NULL,
  "includeRevenue" BOOLEAN NOT NULL DEFAULT true,
  "includeTicketStats" BOOLEAN NOT NULL DEFAULT true,
  "includeNetwork" BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "lastAccessedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MonitoringLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MonitoringLink_tokenHash_key" ON "MonitoringLink"("tokenHash");
CREATE INDEX "MonitoringLink_tenantId_createdAt_idx" ON "MonitoringLink"("tenantId", "createdAt");
CREATE INDEX "MonitoringLink_tenantId_revokedAt_idx" ON "MonitoringLink"("tenantId", "revokedAt");
CREATE INDEX "MonitoringLink_zoneId_idx" ON "MonitoringLink"("zoneId");

ALTER TABLE "MonitoringLink"
  ADD CONSTRAINT "MonitoringLink_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MonitoringLink"
  ADD CONSTRAINT "MonitoringLink_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MonitoringLink" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "MonitoringLink"
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);
