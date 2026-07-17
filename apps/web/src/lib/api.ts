import { config, STORAGE_KEYS } from "./config";
import { useAuthStore } from "@/features/auth/store";
import type { TokenPair } from "@/features/auth/types";

/**
 * Client API — mikconnect.
 *
 * `apiFetch` injecte l'access token (mémoire) en header Authorization et
 * tente une rotation transparente du refresh token sur 401 :
 *  - un seul refresh à la fois (promesse partagée) pour éviter une
 *    tempête de refresh concurrente quand plusieurs requêtes tombent en
 *    401 simultanément (dashboard multi-requêtes) ;
 *  - si la requête initiale n'avait pas de token (endpoint public type
 *    login/register), un 401 est une vraie erreur d'auth — on ne tente
 *    pas de refresh.
 *  - échec du refresh → session vidée + store unauthenticated (les guards
 *    de layout redirigeront vers /login).
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let refreshPromise: Promise<TokenPair> | null = null;

/** Lit le message NestJS standard ({ statusCode, message, error }). */
function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const msg = (body as { message: unknown }).message;
    if (typeof msg === "string") return msg;
    if (Array.isArray(msg) && msg.length > 0 && typeof msg[0] === "string")
      return msg.join(", ");
  }
  return fallback;
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* corps vide (ex. 204) */
  }
  return new ApiError(res.status, body, extractMessage(body, res.statusText));
}

/**
 * Rotation du refresh token (POST /auth/refresh).
 * Met à jour l'access token en mémoire + le refresh en localStorage.
 * Dédupé les appels concurrents via `refreshPromise`.
 */
export async function refreshTokens(): Promise<TokenPair> {
  if (refreshPromise) return refreshPromise;

  const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
  if (!refreshToken) {
    throw new ApiError(401, null, "Aucune session active");
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        localStorage.removeItem(STORAGE_KEYS.refreshToken);
        useAuthStore.getState().clear();
        throw await toApiError(res);
      }
      const tokens = (await res.json()) as TokenPair;
      localStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refreshToken);
      useAuthStore.getState().setAccessToken(tokens.accessToken);
      return tokens;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { accessToken } = useAuthStore.getState();
  const hadAuth = !!accessToken;

  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res = await fetch(`${config.apiBaseUrl}${path}`, { ...init, headers });

  // 401 sur une requête authentifiée → on tente une rotation puis on rejoue.
  if (res.status === 401 && hadAuth) {
    try {
      await refreshTokens();
    } catch {
      throw await toApiError(res);
    }
    const next = useAuthStore.getState().accessToken;
    if (next) headers.set("Authorization", `Bearer ${next}`);
    res = await fetch(`${config.apiBaseUrl}${path}`, { ...init, headers });
  }

  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function apiBlob(path: string, init: RequestInit = {}): Promise<Blob> {
  const { accessToken } = useAuthStore.getState();
  const hadAuth = !!accessToken;
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let response = await fetch(`${config.apiBaseUrl}${path}`, { ...init, headers });
  if (response.status === 401 && hadAuth) {
    await refreshTokens();
    const next = useAuthStore.getState().accessToken;
    if (next) headers.set("Authorization", `Bearer ${next}`);
    response = await fetch(`${config.apiBaseUrl}${path}`, { ...init, headers });
  }
  if (!response.ok) throw await toApiError(response);
  return response.blob();
}
