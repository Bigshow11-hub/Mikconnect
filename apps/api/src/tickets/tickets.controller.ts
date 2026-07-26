import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  Headers,
} from "@nestjs/common";
import type { Response } from "express";
import { Role } from "@prisma/client";

import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { TicketsService } from "./tickets.service";
import { TicketsPdfService } from "./tickets-pdf.service";
import {
  ExportTicketsPdfDto,
  GenerateBatchDto,
  TicketBatchFiltersDto,
  TicketBatchPdfQueryDto,
  TicketFiltersDto,
} from "./dto/tickets.dto";

/**
 * TicketsController — mikconnect.
 *
 * Routes authentifiées (RLS isole par tenantId) :
 *  POST /tickets/batch        — génère un lot de tickets + push routeur.
 *  POST /tickets/:id/sell     — vend un ticket (ISSUED→SOLD + Sale).
 *  GET  /tickets              — liste filtrée/paginée des tickets.
 *  GET  /tickets/stats        — compteurs par statut (dashboard).
 *  GET  /tickets/agent-sales  — résumé ventes par agent (vue propriétaire).
 *  GET  /tickets/:id          — détail d'un ticket.
 */
@Controller("tickets")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(
    private readonly tickets: TicketsService,
    private readonly ticketsPdf: TicketsPdfService,
  ) {}

  @Post("batch")
  @Roles(Role.OWNER)
  @HttpCode(HttpStatus.CREATED)
  generateBatch(
    @CurrentUser() user: AuthUser,
    @Body() dto: GenerateBatchDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.tickets.generateBatch(user.tenantId, user.sub, dto, idempotencyKey);
  }

  @Get()
  @Roles(Role.OWNER)
  findAll(@CurrentUser() user: AuthUser, @Query() filters: TicketFiltersDto) {
    return this.tickets.findAll(user.tenantId, filters);
  }

  @Get("stats")
  @Roles(Role.OWNER)
  stats(@CurrentUser() user: AuthUser) {
    return this.tickets.stats(user.tenantId);
  }

  @Get("batches")
  @Roles(Role.OWNER)
  findBatches(@CurrentUser() user: AuthUser, @Query() filters: TicketBatchFiltersDto) {
    return this.tickets.findBatches(user.tenantId, filters);
  }

  @Get("batches/:id/pdf")
  @Roles(Role.OWNER)
  async exportBatchPdf(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Query() query: TicketBatchPdfQueryDto,
    @Res() response: Response,
  ) {
    const result = await this.ticketsPdf.createVoucherSheetForBatch(
      user.tenantId,
      user.sub,
      id,
      query.layout,
    );
    response.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="mikconnect-lot-${result.reference}-${result.date}.pdf"`,
      "Content-Length": String(result.pdf.length),
    });
    response.send(result.pdf);
  }

  @Get("batches/:id")
  @Roles(Role.OWNER)
  findBatch(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.tickets.findBatch(user.tenantId, id, Number(limit) || 100, Number(offset) || 0);
  }

  @Post("batches/:id/cancel")
  @Roles(Role.OWNER)
  cancelBatch(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.tickets.cancelBatch(user.tenantId, user.sub, id);
  }

  @Post("batches/:id/retry")
  @Roles(Role.OWNER)
  retryBatch(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.tickets.retryBatch(user.tenantId, id, user.sub);
  }

  @Get("overview")
  @Roles(Role.OWNER)
  overview(@CurrentUser() user: AuthUser) {
    return this.tickets.overview(user.tenantId);
  }

  @Post("export-pdf")
  @Roles(Role.OWNER, Role.AGENT)
  @HttpCode(HttpStatus.OK)
  async exportPdf(
    @CurrentUser() user: AuthUser,
    @Body() dto: ExportTicketsPdfDto,
    @Res() response: Response,
  ) {
    const pdf = await this.ticketsPdf.createVoucherSheet(
      user.tenantId,
      user.sub,
      user.role,
      dto.ticketIds,
      dto.layout,
    );
    response.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="mikconnect-tickets-${new Date().toISOString().slice(0, 10)}.pdf"`,
      "Content-Length": String(pdf.length),
    });
    response.send(pdf);
  }

  @Get("agent-sales")
  @Roles(Role.OWNER)
  agentSales(@CurrentUser() user: AuthUser) {
    return this.tickets.allAgentsSalesSummary(user.tenantId);
  }

  @Get(":id")
  @Roles(Role.OWNER)
  findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.tickets.findOne(user.tenantId, id);
  }

  @Post(":id/sell")
  @Roles(Role.OWNER)
  @HttpCode(HttpStatus.OK)
  sellTicket(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body("agentId") agentId?: string,
  ) {
    return this.tickets.sellTicket(user.tenantId, id, agentId);
  }
}
