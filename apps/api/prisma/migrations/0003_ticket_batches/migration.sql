CREATE TABLE "TicketBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "agentId" TEXT,
    "quantity" INTEGER NOT NULL,
    "codeLength" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketBatch_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Ticket" ADD COLUMN "batchId" TEXT;

CREATE INDEX "TicketBatch_tenantId_idx" ON "TicketBatch"("tenantId");
CREATE INDEX "TicketBatch_createdAt_idx" ON "TicketBatch"("createdAt");
CREATE INDEX "Ticket_batchId_idx" ON "Ticket"("batchId");

ALTER TABLE "TicketBatch" ADD CONSTRAINT "TicketBatch_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketBatch" ADD CONSTRAINT "TicketBatch_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketBatch" ADD CONSTRAINT "TicketBatch_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "TicketBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TicketBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketBatch" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "TicketBatch"
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);
