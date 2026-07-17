"use client";

import { useAuthStore } from "./store";
import type { AuthStatus, AuthUser } from "./types";

export { login, register, logout } from "./actions";

/**
 * useAuth — sélecteur d'état auth pour les composants.
 * Les actions (login/register/logout) sont ré-exportées ci-dessus et
 * s'utilisent directement (pas besoin d'être dans le hook).
 */
export function useAuth(): {
  user: AuthUser | null;
  status: AuthStatus;
  accessToken: string | null;
} {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const accessToken = useAuthStore((s) => s.accessToken);
  return { user, status, accessToken };
}
