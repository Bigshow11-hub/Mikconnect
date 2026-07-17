import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";

import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { ZonesService } from "./zones.service";
import { CreateZoneDto } from "./dto/zones.dto";

/**
 * ZonesController — mikconnect.
 *
 * Routes authentifiées (RLS isole par tenantId) :
 *  POST /zones      — crée une zone (onboarding).
 *  GET  /zones      — liste les zones du tenant.
 *  GET  /zones/:id  — détail d'une zone avec ses routeurs.
 */
@Controller("zones")
@UseGuards(JwtAuthGuard)
export class ZonesController {
  constructor(private readonly zones: ZonesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateZoneDto) {
    return this.zones.create(user.tenantId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.zones.findAll(user.tenantId);
  }

  @Get(":id")
  findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.zones.findOne(user.tenantId, id);
  }
}
