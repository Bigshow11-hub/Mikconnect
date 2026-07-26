import { Controller, Get, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";

import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { SubscriptionsService } from "./subscriptions.service";

@Controller("subscription")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get("current")
  @Roles(Role.OWNER)
  current(@CurrentUser() user: AuthUser) {
    return this.subscriptions.usage(user.tenantId);
  }
}
