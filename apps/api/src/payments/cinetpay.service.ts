import { createHmac, timingSafeEqual } from "node:crypto";
import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Currency } from "@prisma/client";
import type { CinetpayWebhookDto } from "./dto/payments.dto";

interface InitializeInput {
  transactionId: string;
  tenantId: string;
  amount: number;
  currency: Currency;
  description: string;
  customerPhone: string;
}

export interface CinetpayVerification {
  status: "ACCEPTED" | "REFUSED" | "CANCELLED" | "WAITING_FOR_CUSTOMER" | string;
  amount: number;
  currency: Currency;
  paymentMethod?: string;
}

@Injectable()
export class CinetpayService {
  private readonly logger = new Logger(CinetpayService.name);

  constructor(private readonly config: ConfigService) {}

  get isMock() {
    const configured = this.config.get<string>("CINETPAY_MOCK");
    if (configured) return configured !== "false";
    return this.config.get<string>("NODE_ENV") !== "production";
  }

  async initialize(input: InitializeInput) {
    const webUrl = this.config.get<string>("PUBLIC_WEB_URL", "http://localhost:3000");
    if (this.isMock) {
      this.logger.log(`Paiement CinetPay simulé: ${input.transactionId}`);
      return {
        paymentToken: `mock-${input.transactionId}`,
        paymentUrl: `${webUrl}/acheter/${input.tenantId}/confirmation?transaction_id=${input.transactionId}`,
      };
    }

    const apiKey = this.required("CINETPAY_API_KEY");
    const siteId = this.required("CINETPAY_SITE_ID");
    const baseUrl = this.config.get<string>(
      "CINETPAY_BASE_URL",
      "https://api-checkout.cinetpay.com/v2",
    );
    const apiUrl = this.config.get<string>("PUBLIC_API_URL");
    if (!apiUrl) throw new ServiceUnavailableException("PUBLIC_API_URL doit être configurée.");

    const response = await fetch(`${baseUrl}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: apiKey,
        site_id: siteId,
        transaction_id: input.transactionId,
        amount: input.amount,
        currency: input.currency,
        description: input.description.replace(/[#/$&_]/g, " "),
        notify_url: `${apiUrl}/public/payments/cinetpay/webhook`,
        return_url: `${webUrl}/acheter/${input.tenantId}/confirmation`,
        channels: "MOBILE_MONEY",
        lang: "FR",
        metadata: input.tenantId,
        customer_phone_number: input.customerPhone.replace(/\s/g, ""),
        lock_phone_number: true,
      }),
    });
    const body = (await response.json()) as {
      code?: string;
      description?: string;
      data?: { payment_token?: string; payment_url?: string };
    };
    if (
      !response.ok ||
      body.code !== "201" ||
      !body.data?.payment_url ||
      !body.data.payment_token
    ) {
      throw new BadGatewayException(body.description ?? "CinetPay a refusé l'initialisation.");
    }
    return { paymentToken: body.data.payment_token, paymentUrl: body.data.payment_url };
  }

  verifyWebhook(body: CinetpayWebhookDto, receivedToken?: string): boolean {
    if (this.isMock) return true;
    const secret = this.config.get<string>("CINETPAY_SECRET_KEY");
    if (!secret || !receivedToken) return false;
    const raw = [
      body.cpm_site_id,
      body.cpm_trans_id,
      body.cpm_trans_date,
      body.cpm_amount,
      body.cpm_currency,
      body.signature,
      body.payment_method,
      body.cel_phone_num,
      body.cpm_phone_prefixe,
      body.cpm_language,
      body.cpm_version,
      body.cpm_payment_config,
      body.cpm_page_action,
      body.cpm_custom,
      body.cpm_designation,
      body.cpm_error_message,
    ]
      .map((value) => value ?? "")
      .join("");
    const expected = createHmac("sha256", secret).update(raw).digest("hex");
    const received = Buffer.from(receivedToken.toLowerCase());
    const calculated = Buffer.from(expected);
    return received.length === calculated.length && timingSafeEqual(received, calculated);
  }

  async check(transactionId: string): Promise<CinetpayVerification> {
    if (this.isMock) {
      throw new ServiceUnavailableException(
        "La vérification simulée nécessite les données locales.",
      );
    }
    const baseUrl = this.config.get<string>(
      "CINETPAY_BASE_URL",
      "https://api-checkout.cinetpay.com/v2",
    );
    const response = await fetch(`${baseUrl}/payment/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: this.required("CINETPAY_API_KEY"),
        site_id: this.required("CINETPAY_SITE_ID"),
        transaction_id: transactionId,
      }),
    });
    const body = (await response.json()) as {
      data?: { status?: string; amount?: string; currency?: Currency; payment_method?: string };
      description?: string;
    };
    if (!response.ok || !body.data?.status || !body.data.amount || !body.data.currency) {
      throw new BadGatewayException(body.description ?? "Vérification CinetPay impossible.");
    }
    return {
      status: body.data.status,
      amount: Number(body.data.amount),
      currency: body.data.currency,
      paymentMethod: body.data.payment_method,
    };
  }

  private required(key: string) {
    const value = this.config.get<string>(key);
    if (!value) throw new ServiceUnavailableException(`${key} doit être configurée.`);
    return value;
  }
}
