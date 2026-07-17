-- Phase 1.4 — paiement mobile money et journal SMS.

DO $$ BEGIN
  CREATE TYPE "SmsStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_providerTxId_key"
  ON "Payment"("providerTxId");

ALTER TABLE "Payment" ALTER COLUMN "saleId" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "SmsDelivery" (
  "id"                TEXT NOT NULL PRIMARY KEY,
  "tenantId"          TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "paymentId"         TEXT NOT NULL UNIQUE REFERENCES "Payment"("id") ON DELETE CASCADE,
  "phone"             TEXT NOT NULL,
  "provider"          TEXT NOT NULL,
  "status"            "SmsStatus" NOT NULL DEFAULT 'PENDING',
  "providerMessageId" TEXT,
  "attempts"          INTEGER NOT NULL DEFAULT 0,
  "errorMessage"      TEXT,
  "sentAt"            TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "SmsDelivery_tenantId_idx" ON "SmsDelivery"("tenantId");
CREATE INDEX IF NOT EXISTS "SmsDelivery_status_idx" ON "SmsDelivery"("status");

ALTER TABLE "SmsDelivery" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "SmsDelivery";
CREATE POLICY tenant_isolation ON "SmsDelivery"
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);
