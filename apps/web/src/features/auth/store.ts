import { create } from "zustand";

import type { AuthStatus, AuthUser } from "./types";

/**
 * Auth store — mikconnect.
 *
 * Doctrine :
 *  - L'access token vit en mémoire (Zustand) uniquement — jamais en
 *    localStorage — pour limiter l'exposition XSS.
 *  - Le refresh token vit en localStorage (voir lib/config STORAGE_KEYS) ;
 *    l'API étant sur un autre host en dev, un cookie httpOnly n'est pas
 *    possible.
 *  - `status` pilote les guards de layout (voir types.ts AuthStatus).
 */

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  status: AuthStatus;
  setAccessToken: (token: string) => void;
  setSession: (token: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  setStatus: (status: AuthStatus) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: "loading",
  setAccessToken: (token) => set({ accessToken: token }),
  setSession: (token, user) => set({ accessToken: token, user, status: "authenticated" }),
  setUser: (user) => set({ user }),
  setStatus: (status) => set({ status }),
  clear: () => set({ accessToken: null, user: null, status: "unauthenticated" }),
}));
