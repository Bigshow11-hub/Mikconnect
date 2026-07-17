import { apiFetch } from "@/lib/api";

import type { AuthUser, LoginInput, RegisterInput, TokenPair, UpdateProfileInput } from "./types";

/**
 * Endpoints auth — mikconnect.
 * Routes publiques (login/register) n'envoient pas de token ; `apiFetch`
 * ne tente pas de refresh sur leur 401 (hadAuth = false).
 */
export const authApi = {
  login: (input: LoginInput) =>
    apiFetch<TokenPair>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  register: (input: RegisterInput) =>
    apiFetch<TokenPair>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  me: () => apiFetch<AuthUser>("/auth/me"),
  updateProfile: (input: UpdateProfileInput) =>
    apiFetch<AuthUser>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  logout: (refreshToken: string) =>
    apiFetch<void>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
};
