import { apiFetch } from "@/lib/api";

import type {
  CreateRouterInput,
  CreateZoneInput,
  Router,
  RouterTestInput,
  RouterTestResult,
  Zone,
} from "./types";

/**
 * API zones & routeurs — mikconnect.
 * Endpoints authentifiés (RLS isole par tenantId).
 */
export const zonesApi = {
  create: (input: CreateZoneInput) =>
    apiFetch<Zone>("/zones", { method: "POST", body: JSON.stringify(input) }),
  findAll: () => apiFetch<Zone[]>("/zones"),
};

export const routersApi = {
  test: (input: RouterTestInput) =>
    apiFetch<RouterTestResult>("/routers/test", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  create: (input: CreateRouterInput) =>
    apiFetch<{ router: Router; connection: RouterTestResult }>("/routers", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  findAll: () => apiFetch<Router[]>("/routers"),
};
