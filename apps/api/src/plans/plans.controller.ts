import { Controller, Get, UseGuards } from "@nestjs/common";

import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { PlansService } from "./plans.service";

/**
 * PlansController — mikconnect.
 *
 * Routes authentifiées (RLS isole par tenantId) :
 *  GET /plans — liste les forfaits actifs du tenant (pour génération tickets).
 */
@Controller("plans")
@UseGuards(JwtAuthGuard)
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.plans.findAll(user.tenantId);
  }
}
