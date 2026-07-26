CREATE TYPE "TicketProvisioningStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED');
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'DISPATCHED', 'COMPLETED', 'FAILED', 'DEAD');

ALTER TABLE "Ticket"
  ADD COLUMN "provisioningStatus" "TicketProvisioningStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "pushedAt" TIMESTAMP(3),
  ADD COLUMN "pushAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastPushError" TEXT;

ALTER TABLE "TicketBatch"
  ADD COLUMN "reference" TEXT,
  ADD COLUMN "createdByUserId" TEXT,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelledByUserId" TEXT;

UPDATE "TicketBatch"
SET "reference" = UPPER(SUBSTRING(REPLACE("id", '-', '') FROM GREATEST(LENGTH(REPLACE("id", '-', '')) - 7, 1)));

ALTER TABLE "TicketBatch" ALTER COLUMN "reference" SET NOT NULL;

CREATE INDEX "Ticket_tenantId_provisioningStatus_idx" ON "Ticket"("tenantId", "provisioningStatus");
CREATE UNIQUE INDEX "TicketBatch_tenantId_reference_key" ON "TicketBatch"("tenantId", "reference");
CREATE UNIQUE INDEX "TicketBatch_tenantId_idempotencyKey_key" ON "TicketBatch"("tenantId", "idempotencyKey");

CREATE TABLE "OutboxEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dispatchedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OutboxEvent_type_aggregateId_key" ON "OutboxEvent"("type", "aggregateId");
CREATE INDEX "OutboxEvent_status_availableAt_idx" ON "OutboxEvent"("status", "availableAt");
CREATE INDEX "OutboxEvent_tenantId_createdAt_idx" ON "OutboxEvent"("tenantId", "createdAt");
