import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { type Request } from "express";

/**
 * @CurrentUser() — extrait l'utilisateur authentifié du request.
 * Retourne le payload JWT décodé : { sub, tenantId, role, email }.
 *
 * Ex. :
 *   @Get("me")
 *   @UseGuards(JwtAuthGuard)
 *   me(@CurrentUser() user: AuthUser) { ... }
 */
export interface AuthUser {
  sub: string;
  tenantId: string;
  role: "OWNER" | "AGENT" | "ADMIN";
  email: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | unknown => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = request.user;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
