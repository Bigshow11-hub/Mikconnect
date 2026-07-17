import { Module } from "@nestjs/common";
import { RoutersController } from "./routers.controller";
import { RoutersService } from "./routers.service";
import { MikrotikConnectorService } from "./mikrotik-connector.service";
import { CryptoService } from "../common/crypto.service";

@Module({
  controllers: [RoutersController],
  providers: [RoutersService, MikrotikConnectorService, CryptoService],
  exports: [RoutersService],
})
export class RoutersModule {}
