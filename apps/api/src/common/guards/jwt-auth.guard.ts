import { Injectable, type ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ClsService } from "nestjs-cls";
import { type AuthUser } from "../decorators/current-user.decorator";

/**
 * JwtAuthGuard — mikconnect.
 *
 * Vérifie le Bearer token via JwtStrategy, puis propage le tenantId dans
 * le ClsService pour que PrismaService active RLS automatiquement.
 *
 * Sans token : 401 Unauthorized. Token invalide/expiré : 401.
 * Le refresh rotation est géré par AuthController.refresh().
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private readonly cls: ClsService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<T = AuthUser>(
    err: unknown,
    user: unknown,
    _info: unknown,
    _ctx: ExecutionContext,
  ): T {
    if (err || !user) {
      throw new UnauthorizedException("Token invalide ou expiré");
    }
    const authUser = user as AuthUser;
    // Propage tenantId dans l'ALS pour PrismaService + RLS.
    this.cls.set("tenantId", authUser.tenantId);
    this.cls.set("userId", authUser.sub);
    this.cls.set("role", authUser.role);
    return user as T;
  }
}
