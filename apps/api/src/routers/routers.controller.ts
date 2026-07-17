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
import { Role } from "@prisma/client";

import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { RoutersService } from "./routers.service";
import { CreateRouterDto, RouterSessionActionDto, RouterTestDto } from "./dto/routers.dto";

/**
 * RoutersController — mikconnect.
 *
 * Routes authentifiées (RLS isole par tenantId) :
 *  POST /routers/test   — teste une connexion sans persister (onboarding).
 *  POST /routers         — crée et persiste un routeur (credentials chiffrés).
 *  GET  /routers         — liste les routeurs du tenant.
 *  GET  /routers/:id     — détail d'un routeur.
 */
@Controller("routers")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
export class RoutersController {
  constructor(private readonly routers: RoutersService) {}

  @Post("test")
  @HttpCode(HttpStatus.OK)
  test(@Body() dto: RouterTestDto) {
    return this.routers.test(dto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRouterDto) {
    return this.routers.create(user.tenantId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.routers.findAll(user.tenantId);
  }

  @Get("online-users")
  onlineUsers(@CurrentUser() user: AuthUser) {
    return this.routers.onlineUsers(user.tenantId);
  }

  @Get(":id/online-users")
  onlineUsersForRouter(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.routers.onlineUsersForRouter(user.tenantId, id);
  }

  @Post(":id/online-users/disconnect")
  @HttpCode(HttpStatus.OK)
  disconnectOnlineUser(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: RouterSessionActionDto,
  ) {
    return this.routers.disconnectOnlineUser(user.tenantId, id, dto.sessionId);
  }

  @Post(":id/online-users/block")
  @HttpCode(HttpStatus.OK)
  blockOnlineUser(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: RouterSessionActionDto,
  ) {
    return this.routers.blockOnlineUser(user.tenantId, id, dto.sessionId, dto.macAddress);
  }

  @Get(":id")
  findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.routers.findOne(user.tenantId, id);
  }
}
