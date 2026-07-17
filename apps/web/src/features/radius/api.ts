import { apiFetch } from "@/lib/api";

import type { ReconciliationOverview } from "./types";

export const radiusApi = {
  reconciliation: () => apiFetch<ReconciliationOverview>("/radius/reconciliation"),
  sync: () => apiFetch<{ synced: number; ignored: number }>("/radius/sync", { method: "POST" }),
};

