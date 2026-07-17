import { describe, expect, it } from "vitest";

import { assertProductionConfiguration } from "../src/common/production-config";

const validProduction = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://database.example/mikconnect",
  JWT_ACCESS_SECRET: "a-strong-production-access-secret",
  JWT_REFRESH_SECRET: "a-strong-production-refresh-secret",
  MIKROTIK_ENCRYPTION_KEY: "00".repeat(32),
  MIKROTIK_MOCK: "false",
  MIKROTIK_TLS_REJECT_UNAUTHORIZED: "true",
  CINETPAY_MOCK: "false",
  CINETPAY_API_KEY: "api-key",
  CINETPAY_SITE_ID: "site-id",
  CINETPAY_SECRET_KEY: "secret-key",
  SMS_PROVIDER: "gateway",
  SMS_API_URL: "https://sms.example/send",
  SMS_API_KEY: "sms-key",
  PUBLIC_API_URL: "https://api.mikconnect.example",
  PUBLIC_WEB_URL: "https://mikconnect.example",
  CORS_ORIGIN: "https://mikconnect.example",
} as NodeJS.ProcessEnv;

describe("assertProductionConfiguration", () => {
  it("accepte une configuration entièrement réelle", () => {
    expect(() => assertProductionConfiguration(validProduction)).not.toThrow();
  });

  it("n'impose pas les fournisseurs réels hors production", () => {
    expect(() => assertProductionConfiguration({ NODE_ENV: "test" })).not.toThrow();
  });

  it("refuse MikroTik ou CinetPay simulé en production", () => {
    expect(() =>
      assertProductionConfiguration({ ...validProduction, MIKROTIK_MOCK: "true" }),
    ).toThrow("MIKROTIK_MOCK");
    expect(() =>
      assertProductionConfiguration({ ...validProduction, CINETPAY_MOCK: "true" }),
    ).toThrow("CINETPAY_MOCK");
  });

  it("refuse les URL locales en production", () => {
    expect(() =>
      assertProductionConfiguration({
        ...validProduction,
        PUBLIC_API_URL: "http://localhost:4000",
      }),
    ).toThrow("PUBLIC_API_URL");
  });

  it("refuse la passerelle SMS locale en production", () => {
    expect(() =>
      assertProductionConfiguration({ ...validProduction, SMS_PROVIDER: "local" }),
    ).toThrow("SMS_PROVIDER");
  });
});
