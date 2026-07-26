import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Role } from "@prisma/client";

import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CreateMonitoringLinkDto } from "./dto/monitoring-links.dto";
import { MonitoringLinksService } from "./monitoring-links.service";

@Controller("monitoring-links")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
export class MonitoringLinksController {
  constructor(private readonly links: MonitoringLinksService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.links.list(user.tenantId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMonitoringLinkDto) {
    return this.links.create(user.tenantId, user.sub, dto);
  }

  @Post(":id/revoke")
  @HttpCode(HttpStatus.OK)
  revoke(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.links.revoke(user.tenantId, user.sub, id);
  }

  @Post(":id/rotate")
  @HttpCode(HttpStatus.OK)
  rotate(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.links.rotate(user.tenantId, user.sub, id);
  }
}

@Controller("public/monitoring")
export class PublicMonitoringController {
  constructor(private readonly links: MonitoringLinksService) {}

  @Get(":token")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  view(@Param("token") token: string) {
    return this.links.publicView(token);
  }
}
