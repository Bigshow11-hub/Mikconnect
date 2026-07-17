import { Module } from "@nestjs/common";
import { TicketsController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";
import { MikrotikConnectorService } from "../routers/mikrotik-connector.service";
import { CryptoService } from "../common/crypto.service";
import { TicketsPdfService } from "./tickets-pdf.service";

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, TicketsPdfService, MikrotikConnectorService, CryptoService],
  exports: [TicketsService],
})
export class TicketsModule {}
