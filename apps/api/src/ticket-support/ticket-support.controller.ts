import { Body, Controller, Param, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

import { TicketSupportLookupDto } from "./dto/ticket-support.dto";
import { TicketSupportService } from "./ticket-support.service";

@Controller("public/support/:tenantId/tickets")
export class TicketSupportController {
  constructor(private readonly support: TicketSupportService) {}

  @Post("lookup")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  lookup(@Param("tenantId") tenantId: string, @Body() dto: TicketSupportLookupDto) {
    return this.support.lookup(tenantId, dto);
  }

  @Post("resend")
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  resend(@Param("tenantId") tenantId: string, @Body() dto: TicketSupportLookupDto) {
    return this.support.resend(tenantId, dto);
  }
}
