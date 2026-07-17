import { Module } from "@nestjs/common";

import { RadiusController } from "./radius.controller";
import { RadiusAccountingService } from "./radius-accounting.service";

@Module({
  controllers: [RadiusController],
  providers: [RadiusAccountingService],
  exports: [RadiusAccountingService],
})
export class RadiusModule {}

