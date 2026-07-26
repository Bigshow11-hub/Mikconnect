import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { Role } from "@prisma/client";

import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { MonthlyReportQueryDto } from "./dto/reports.dto";
import { ReportsService } from "./reports.service";

@Controller("reports")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("monthly")
  monthly(@CurrentUser() user: AuthUser, @Query() query: MonthlyReportQueryDto) {
    return this.reports.monthly(user.tenantId, query.month);
  }

  @Get("monthly.csv")
  async csv(
    @CurrentUser() user: AuthUser,
    @Query() query: MonthlyReportQueryDto,
    @Res() response: Response,
  ) {
    const result = await this.reports.csv(user.tenantId, user.sub, query.month);
    response.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mikconnect-rapport-${result.report.period.month}.csv"`,
    });
    response.send(`\uFEFF${result.content}`);
  }

  @Get("monthly.pdf")
  async pdf(
    @CurrentUser() user: AuthUser,
    @Query() query: MonthlyReportQueryDto,
    @Res() response: Response,
  ) {
    const result = await this.reports.pdf(user.tenantId, user.sub, query.month);
    response.set({
      "Content-Type": "application/pdf",
      "Content-Length": String(result.content.length),
      "Content-Disposition": `attachment; filename="mikconnect-rapport-${result.report.period.month}.pdf"`,
    });
    response.send(result.content);
  }
}
