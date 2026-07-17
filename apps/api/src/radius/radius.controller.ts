import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";

import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { RadiusAccountingService } from "./radius-accounting.service";

@Controller("radius")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
export class RadiusController {
  constructor(private readonly radius: RadiusAccountingService) {}

  @Get("reconciliation")
  reconciliation(@CurrentUser() user: AuthUser) {
    return this.radius.reconciliation(user.tenantId);
  }

  @Post("sync")
  @HttpCode(HttpStatus.OK)
  sync() {
    return this.radius.syncAccounting();
  }
}

