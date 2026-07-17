/**
 * Types auth partagés — alignés sur apps/api (schema.prisma + auth.service).
 * Country/Currency/Role reflètent les enums Prisma pour rester synchronisés.
 */
export type Country = "CI" | "GN";
export type Currency = "XOF" | "GNF";
export type Role = "OWNER" | "AGENT" | "ADMIN";

/**
 * État de session consommé par les guards de layout.
 *  - "loading"        : bootstrap en cours (refresh + /me).
 *  - "authenticated"  : session valide.
 *  - "unauthenticated": pas de session.
 */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

/**
 * Profil utilisateur courant (GET /auth/me).
 * Correspond à AuthService.me() côté API.
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  tenantId: string;
  tenant: {
    name: string;
    country: Country;
    currency: Currency;
    tier: string;
  };
}

/** Paire de tokens retournée par /auth/register|login|refresh. */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** Durée de vie en secondes du refresh. */
  expiresIn: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  country: Country;
  tenantName: string;
  phone?: string;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  tenantName?: string;
}
