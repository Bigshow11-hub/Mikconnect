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
import { Role } from "@prisma/client";

import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ConfirmTimezoneRepairDto } from "./dto/network-operations.dto";
import { NetworkOperationsService } from "./network-operations.service";

@Controller("network")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
export class NetworkOperationsController {
  constructor(private readonly operations: NetworkOperationsService) {}

  @Get("overview")
  overview(@CurrentUser() user: AuthUser) {
    return this.operations.overview(user.tenantId);
  }

  @Post("routers/:id/fix-timezone")
  @HttpCode(HttpStatus.OK)
  correctTimezone(
    @CurrentUser() user: AuthUser,
    @Param("id") routerId: string,
    @Body() _dto: ConfirmTimezoneRepairDto,
  ) {
    return this.operations.correctTimezone(user.tenantId, user.sub, routerId);
  }
}
