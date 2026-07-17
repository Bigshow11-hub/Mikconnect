import { apiBlob, apiFetch } from "@/lib/api";

import type {
  BusinessOverview,
  GenerateBatchInput,
  GenerateBatchResult,
  Plan,
  TicketDetail,
  TicketFilters,
  TicketListResponse,
  TicketStatus,
  TicketPdfLayout,
  TicketBatch,
} from "./types";

/**
 * API tickets & plans — mikconnect.
 * Endpoints authentifiés (RLS isole par tenantId).
 */
export const plansApi = {
  findAll: () => apiFetch<Plan[]>("/plans"),
};

export const ticketsApi = {
  generateBatch: (input: GenerateBatchInput) =>
    apiFetch<GenerateBatchResult>("/tickets/batch", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  findAll: (filters: TicketFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.planId) params.set("planId", filters.planId);
    if (filters.agentId) params.set("agentId", filters.agentId);
    if (filters.q) params.set("q", filters.q);
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.offset) params.set("offset", String(filters.offset));
    const qs = params.toString();
    return apiFetch<TicketListResponse>(`/tickets${qs ? `?${qs}` : ""}`);
  },
  findOne: (id: string) => apiFetch<TicketDetail>(`/tickets/${id}`),
  stats: () =>
    apiFetch<{ status: TicketStatus; count: number }[]>("/tickets/stats"),
  overview: () => apiFetch<BusinessOverview>("/tickets/overview"),
  downloadPdf: (ticketIds: string[], layout: TicketPdfLayout = "A4_STANDARD") =>
    apiBlob("/tickets/export-pdf", {
      method: "POST",
      body: JSON.stringify({ ticketIds, layout }),
    }),
  findBatches: () => apiFetch<TicketBatch[]>("/tickets/batches"),
  deleteBatch: (id: string) => apiFetch<{ deleted: true; id: string }>(`/tickets/batches/${id}`, {
    method: "DELETE",
  }),
};
