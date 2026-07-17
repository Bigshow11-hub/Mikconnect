"use client";

import { useEffect } from "react";

import { STORAGE_KEYS } from "@/lib/config";
import { refreshTokens } from "@/lib/api";

import { authApi } from "./api";
import { useAuthStore } from "./store";

/**
 * AuthBootstrap — mikconnect.
 *
 * Composant invisible monté une seule fois dans le root layout. Au premier
 * rendu client, il tente de restaurer la session depuis le refresh token
 * persisté :
 *  - pas de refresh token → status "unauthenticated" (les guards (auth)
 *    ouvrent /login).
 *  - refresh token présent → rotation + GET /auth/me → session installée.
 *  - échec (token expiré/révoqué) → session vidée, "unauthenticated".
 *
 * On reste en status "loading" jusqu'au verdict pour éviter un flash
 * /login sur les (app) routes (le propriétaire en 3G ne doit pas voir
 * l'app clignoter vers la page de connexion au redémarrage).
 */
export function AuthBootstrap() {
  useEffect(() => {
    let active = true;

    const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
    if (!refreshToken) {
      useAuthStore.getState().setStatus("unauthenticated");
      return;
    }

    void (async () => {
      try {
        await refreshTokens();
        const me = await authApi.me();
        if (active) {
          useAuthStore.getState().setSession(useAuthStore.getState().accessToken!, me);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEYS.refreshToken);
        if (active) useAuthStore.getState().clear();
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return null;
}
