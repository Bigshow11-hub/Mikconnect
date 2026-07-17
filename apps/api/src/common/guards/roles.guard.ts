import { Injectable, ForbiddenException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ClsService } from "nestjs-cls";
import type { Request } from "express";
import { Role } from "@prisma/client";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { AuthUser } from "../decorators/current-user.decorator";

/**
 * RolesGuard — mikconnect RBAC.
 *
 * À utiliser après JwtAuthGuard. Vérifie que user.role ∈ roles[].
 *
 * Rôles :
 *  - OWNER : tout sur son tenant (gestion agents, configs, rapports).
 *  - AGENT : vente + lecture de SES ventes (filtre par userId via service).
 *  - ADMIN : tous tenants, bypass RLS (panneau admin mikconnect).
 *
 * Positionne aussi cls.set('bypassRls', true) si role=ADMIN, ce qui désactive
 * RLS côté Prisma pour cette requête.
 */
@Injectable()
export class RolesGuard {
  constructor(
    private readonly reflector: Reflector,
    private readonly cls: ClsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = request.user;

    if (!user) {
      return false;
    }

    // ADMIN bypass RLS pour le panneau admin mikconnect.
    if (user.role === Role.ADMIN) {
      this.cls.set("bypassRls", true);
    }

    // Pas de @Roles() : tous les authentifiés passent.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (!requiredRoles.includes(user.role as Role)) {
      throw new ForbiddenException(
        `Accès refusé. Rôle ${user.role} requis : ${requiredRoles.join(", ")}`,
      );
    }

    return true;
  }
}
