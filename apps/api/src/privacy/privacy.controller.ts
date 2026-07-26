import { Body, Controller, Get, Post, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { Role } from "@prisma/client";

import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { AnonymizeCustomerDto } from "./dto/privacy.dto";
import { PrivacyService } from "./privacy.service";

@Controller("privacy")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
export class PrivacyController {
  constructor(private readonly privacy: PrivacyService) {}

  @Get("export")
  async export(@CurrentUser() user: AuthUser, @Res() response: Response) {
    const data = await this.privacy.exportTenantData(user.tenantId, user.sub);
    response.set({
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mikconnect-donnees-${new Date().toISOString().slice(0, 10)}.json"`,
    });
    response.send(JSON.stringify(data, null, 2));
  }

  @Post("customers/anonymize")
  anonymize(@CurrentUser() user: AuthUser, @Body() dto: AnonymizeCustomerDto) {
    return this.privacy.anonymizeCustomer(user.tenantId, user.sub, dto.phone);
  }
}
