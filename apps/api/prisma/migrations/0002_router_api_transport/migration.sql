-- Persiste le transport RouterOS API choisi pendant l'appairage.
-- 8728 = API TCP, 8729 = API-SSL. Les routeurs existants conservent 8728.
ALTER TABLE "Router"
  ADD COLUMN IF NOT EXISTS "apiPort" INTEGER NOT NULL DEFAULT 8728,
  ADD COLUMN IF NOT EXISTS "apiTls" BOOLEAN NOT NULL DEFAULT false;
