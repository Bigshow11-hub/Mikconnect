import { SetMetadata } from "@nestjs/common";
import { type Role } from "@prisma/client";

export const ROLES_KEY = "roles";

/**
 * Décorateur @Roles(...roles) — restrict l'accès aux rôles listés.
 * Utilisé avec RolesGuard (évalué après JwtAuthGuard).
 *
 * Si aucun rôle n'est listé : tous les utilisateurs authentifiés passent.
 * Ex. :
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles(Role.OWNER)
 *   createAgent() { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
