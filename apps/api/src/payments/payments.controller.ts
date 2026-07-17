import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CinetpayWebhookDto, CreatePublicPaymentDto } from "./dto/payments.dto";
import { PaymentsService } from "./payments.service";
import { Throttle } from "@nestjs/throttler";

@Controller("payments")
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.payments.list(user.tenantId);
  }

  @Get("summary")
  summary(@CurrentUser() user: AuthUser) {
    return this.payments.summary(user.tenantId);
  }
}

@Controller("public")
export class PublicPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get("stores/:tenantId")
  store(@Param("tenantId") tenantId: string) {
    return this.payments.getStore(tenantId);
  }

  @Post("stores/:tenantId/payments")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  initiate(@Param("tenantId") tenantId: string, @Body() dto: CreatePublicPaymentDto) {
    return this.payments.initiate(tenantId, dto);
  }

  @Get("stores/:tenantId/payments/:transactionId")
  status(@Param("tenantId") tenantId: string, @Param("transactionId") transactionId: string) {
    return this.payments.getPublicStatus(tenantId, transactionId);
  }

  @Get("payments/cinetpay/webhook")
  webhookPing() {
    return { ok: true };
  }

  @Post("payments/cinetpay/webhook")
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  webhook(@Body() dto: CinetpayWebhookDto, @Headers("x-token") token?: string) {
    return this.payments.handleWebhook(dto, token);
  }
}
