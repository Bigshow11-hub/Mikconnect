import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { parseCorsOrigins } from "../src/common/security-config";

describe("Security hardening", () => {
  it("normalise et déduplique les origines CORS autorisées", () => {
    expect(
      parseCorsOrigins("https://app.mikconnect.test, https://admin.mikconnect.test,https://app.mikconnect.test"),
    ).toEqual(["https://app.mikconnect.test", "https://admin.mikconnect.test"]);
  });

  it("refuse une origine joker avec les credentials", () => {
    expect(() => parseCorsOrigins("*")).toThrow(/ne peut pas contenir/);
  });

  it("protège RadiusCredential avec une policy RLS tenant-scoped", () => {
    const migration = readFileSync(
      resolve(process.cwd(), "prisma/migrations/0005_radius_credentials_rls/migration.sql"),
      "utf8",
    );

    expect(migration).toContain('ALTER TABLE "RadiusCredential" ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY tenant_isolation ON "RadiusCredential"');
    expect(migration).toContain("current_setting('app.tenant_id', true)");
    expect(migration).toContain("WITH CHECK");
  });
});
