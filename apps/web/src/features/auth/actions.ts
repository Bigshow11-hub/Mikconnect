import { STORAGE_KEYS } from "@/lib/config";

import { authApi } from "./api";
import { useAuthStore } from "./store";
import type { LoginInput, RegisterInput } from "./types";

/**
 * Actions auth — mikconnect.
 * Fonctions stables (hors hook) : opèrent sur le store + localStorage.
 * La navigation post-login/logout est gérée par les guards de layout
 * (qui réagissent au `status`), pas ici — pour rester découplé du routeur.
 */

/** Persiste le refresh token + installe la session (access + user). */
async function installSession(tokens: { accessToken: string; refreshToken: string }) {
  localStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refreshToken);
  useAuthStore.getState().setAccessToken(tokens.accessToken);
  const user = await authApi.me();
  useAuthStore.getState().setSession(tokens.accessToken, user);
  return user;
}

export async function login(input: LoginInput) {
  const tokens = await authApi.login(input);
  return installSession(tokens);
}

export async function register(input: RegisterInput) {
  const tokens = await authApi.register(input);
  return installSession(tokens);
}

export async function logout() {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
  if (refreshToken) {
    try {
      await authApi.logout(refreshToken);
    } catch {
      /* session serveur déjà invalide — on poursuit le logout local */
    }
  }
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  useAuthStore.getState().clear();
}
