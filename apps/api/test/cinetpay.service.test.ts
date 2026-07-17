import { createHmac } from "node:crypto";
import type { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";
import { CinetpayService } from "../src/payments/cinetpay.service";
import type { CinetpayWebhookDto } from "../src/payments/dto/payments.dto";

function config(values: Record<string, string>) {
  return {
    get: vi.fn((key: string, fallback?: string) => values[key] ?? fallback),
  } as unknown as ConfigService;
}

const webhook: CinetpayWebhookDto = {
  cpm_site_id: "site-1",
  cpm_trans_id: "MK123",
  cpm_trans_date: "2026-07-15 12:00:00",
  cpm_amount: "500",
  cpm_currency: "XOF",
  signature: "provider-signature",
  payment_method: "OM",
  cel_phone_num: "0700000000",
  cpm_phone_prefixe: "225",
  cpm_language: "fr",
  cpm_version: "V4",
  cpm_payment_config: "SINGLE",
  cpm_page_action: "PAYMENT",
  cpm_custom: "tenant-1",
  cpm_designation: "Acces WiFi",
  cpm_error_message: "",
};

describe("CinetpayService", () => {
  it("génère une redirection locale en mode simulé", async () => {
    const service = new CinetpayService(config({ CINETPAY_MOCK: "true", PUBLIC_WEB_URL: "http://localhost:3000" }));
    const result = await service.initialize({
      transactionId: "MK123",
      tenantId: "tenant-1",
      amount: 500,
      currency: "XOF",
      description: "Acces WiFi",
      customerPhone: "+2250700000000",
    });
    expect(result.paymentUrl).toBe("http://localhost:3000/acheter/tenant-1/confirmation?transaction_id=MK123");
  });

  it("valide le x-token HMAC documenté par CinetPay", () => {
    const secret = "test-secret";
    const service = new CinetpayService(config({ CINETPAY_MOCK: "false", CINETPAY_SECRET_KEY: secret }));
    const raw = Object.values(webhook).join("");
    const token = createHmac("sha256", secret).update(raw).digest("hex");
    expect(service.verifyWebhook(webhook, token)).toBe(true);
  });

  it("refuse un x-token HMAC altéré", () => {
    const service = new CinetpayService(config({ CINETPAY_MOCK: "false", CINETPAY_SECRET_KEY: "test-secret" }));
    expect(service.verifyWebhook(webhook, "0".repeat(64))).toBe(false);
  });
});
