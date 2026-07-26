import { Module } from "@nestjs/common";

import { CryptoService } from "../common/crypto.service";
import {
  MonitoringLinksController,
  PublicMonitoringController,
} from "./monitoring-links.controller";
import { MonitoringLinksService } from "./monitoring-links.service";

@Module({
  controllers: [MonitoringLinksController, PublicMonitoringController],
  providers: [MonitoringLinksService, CryptoService],
  exports: [MonitoringLinksService],
})
export class MonitoringLinksModule {}
