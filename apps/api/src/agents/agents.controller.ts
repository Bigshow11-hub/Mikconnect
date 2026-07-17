import {
  Body,
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Role } from "@prisma/client";

import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { AgentsService } from "./agents.service";
import { TicketsService } from "../tickets/tickets.service";
import { AssignTicketsDto, CreateAgentDto, UpdateAgentDto } from "./dto/agents.dto";

/**
 * AgentsController — mikconnect.
 *
 * Routes authentifiées + RBAC (OWNER only) :
 *  POST   /agents          — crée un agent (sous-compte User + Agent).
 *  GET    /agents          — liste les agents du tenant.
 *  GET    /agents/:id      — détail d'un agent.
 *  GET    /agents/:id/sales — ventes de l'agent + commission due.
 *  PATCH  /agents/:id      — modifie commission % / actif.
 *  DELETE /agents/:id      — supprime l'agent + son user.
 */
@Controller("agents")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
export class AgentsController {
  constructor(
    private readonly agents: AgentsService,
    private readonly tickets: TicketsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAgentDto) {
    return this.agents.create(user.tenantId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.agents.findAll(user.tenantId);
  }

  @Get("me/workspace")
  @Roles(Role.AGENT)
  myWorkspace(@CurrentUser() user: AuthUser) {
    return this.agents.myWorkspace(user.tenantId, user.sub);
  }

  @Post("me/tickets/:ticketId/sell")
  @Roles(Role.AGENT)
  sellMyTicket(@CurrentUser() user: AuthUser, @Param("ticketId") ticketId: string) {
    return this.tickets.sellAgentTicket(user.tenantId, user.sub, ticketId);
  }

  @Post(":id/assign")
  assignTickets(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: AssignTicketsDto,
  ) {
    return this.agents.assignTickets(user.tenantId, id, dto.ticketIds);
  }

  @Get(":id")
  findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.agents.findOne(user.tenantId, id);
  }

  @Get(":id/sales")
  sales(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.tickets.agentSalesSummary(user.tenantId, id);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateAgentDto) {
    return this.agents.update(user.tenantId, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.agents.remove(user.tenantId, id);
  }
}
