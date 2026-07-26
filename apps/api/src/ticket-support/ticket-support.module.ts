import { Module } from "@nestjs/common";

import { PaymentsModule } from "../payments/payments.module";
import { TicketSupportController } from "./ticket-support.controller";
import { TicketSupportService } from "./ticket-support.service";

@Module({
  imports: [PaymentsModule],
  controllers: [TicketSupportController],
  providers: [TicketSupportService],
})
export class TicketSupportModule {}
