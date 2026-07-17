import { Module } from "@nestjs/common";
import { CinetpayService } from "./cinetpay.service";
import { PaymentsController, PublicPaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { SmsService } from "./sms.service";

@Module({
  controllers: [PaymentsController, PublicPaymentsController],
  providers: [PaymentsService, CinetpayService, SmsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
