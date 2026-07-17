import { randomUUID } from "node:crypto";
import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  async sendTicket(input: { phone: string; code: string; planName: string }) {
    const message = `mikconnect: votre code WiFi ${input.code} (${input.planName}). Gardez-le jusqu'à la fin de votre connexion.`;
    const provider = this.config.get<string>("SMS_PROVIDER", "local");
    const apiUrl = this.config.get<string>("SMS_API_URL");

    const production = this.config.get<string>("NODE_ENV") === "production";
    if (production && (provider === "local" || !apiUrl)) {
      throw new ServiceUnavailableException(
        "La passerelle SMS réelle doit être configurée en production.",
      );
    }

    if (provider === "local" || !apiUrl) {
      this.logger.log(`SMS simulé vers ${input.phone}: ${message}`);
      return { provider: "local", messageId: `local-${randomUUID()}` };
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.get<string>("SMS_API_KEY", "")}`,
      },
      body: JSON.stringify({
        to: input.phone,
        sender: this.config.get<string>("SMS_SENDER", "mikconnect"),
        message,
      }),
    });
    if (!response.ok)
      throw new BadGatewayException("La passerelle SMS n'a pas accepté le message.");
    const body = (await response.json()) as { id?: string; messageId?: string };
    return { provider, messageId: body.messageId ?? body.id ?? randomUUID() };
  }
}
