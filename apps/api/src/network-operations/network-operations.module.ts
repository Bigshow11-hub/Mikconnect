import { Module } from "@nestjs/common";

import { CryptoService } from "../common/crypto.service";
import { MikrotikConnectorService } from "../routers/mikrotik-connector.service";
import { NetworkOperationsController } from "./network-operations.controller";
import { NetworkOperationsService } from "./network-operations.service";

@Module({
  controllers: [NetworkOperationsController],
  providers: [NetworkOperationsService, MikrotikConnectorService, CryptoService],
  exports: [NetworkOperationsService],
})
export class NetworkOperationsModule {}
