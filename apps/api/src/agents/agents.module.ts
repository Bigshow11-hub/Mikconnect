import { Module } from "@nestjs/common";
import { AgentsController } from "./agents.controller";
import { AgentsService } from "./agents.service";
import { TicketsModule } from "../tickets/tickets.module";

@Module({
  imports: [TicketsModule],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
