import { apiFetch } from "@/lib/api";
import type { NetworkOverview } from "./types";

export const networkOperationsApi = {
  overview: () => apiFetch<NetworkOverview>("/network/overview"),
  fixTimezone: (routerId: string) =>
    apiFetch<{ ok: boolean; message: string; timezone: string }>(
      `/network/routers/${routerId}/fix-timezone`,
      {
        method: "POST",
        body: JSON.stringify({ confirmation: "CORRIGER L'HEURE" }),
      },
    ),
};
