import { Body, Controller, Post, UseGuards, Get, Patch, HttpCode, HttpStatus } from "@nestjs/common";
import { AuthService, type TokenPair } from "./auth.service";
import { RegisterDto, LoginDto, RefreshDto, LogoutDto, UpdateProfileDto } from "./dto/auth.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { Throttle } from "@nestjs/throttler";

/**
 * AuthController — mikconnect.
 *
 * Routes publiques :
 *  POST /auth/register — inscription propriétaire (crée tenant + owner + forfaits).
 *  POST /auth/login    — login (email + password).
 *  POST /auth/refresh  — rotation refresh → nouvelle paire.
 *  POST /auth/logout   — révocation du refresh fourni.
 *
 * Routes authentifiées :
 *  GET  /auth/me       — profil utilisateur courant.
 */
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto): Promise<TokenPair> {
    return this.auth.register(dto);
  }

  @Post("login")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<TokenPair> {
    return this.auth.login(dto);
  }

  @Post("refresh")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto): Promise<TokenPair> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: LogoutDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.sub);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.sub, user.tenantId, user.role, dto);
  }
}
