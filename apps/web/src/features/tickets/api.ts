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
  TicketBatchDetail,
  TicketBatchFilters,
  TicketBatchListResponse,
} from "./types";

/**
 * API tickets & plans — mikconnect.
 * Endpoints authentifiés (RLS isole par tenantId).
 */
export const plansApi = {
  findAll: () => apiFetch<Plan[]>("/plans"),
};

export const ticketsApi = {
  generateBatch: (input: GenerateBatchInput, idempotencyKey: string) =>
    apiFetch<GenerateBatchResult>("/tickets/batch", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
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
  stats: () => apiFetch<{ status: TicketStatus; count: number }[]>("/tickets/stats"),
  overview: () => apiFetch<BusinessOverview>("/tickets/overview"),
  downloadPdf: (ticketIds: string[], layout: TicketPdfLayout = "A4_STANDARD") =>
    apiBlob("/tickets/export-pdf", {
      method: "POST",
      body: JSON.stringify({ ticketIds, layout }),
    }),
  downloadBatchPdf: (id: string, layout: TicketPdfLayout = "A4_STANDARD") =>
    apiBlob(`/tickets/batches/${id}/pdf?layout=${layout}`),
  findBatches: (filters: TicketBatchFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") params.set(key, String(value));
    });
    const query = params.toString();
    return apiFetch<TicketBatchListResponse>(`/tickets/batches${query ? `?${query}` : ""}`);
  },
  findBatch: (id: string, limit = 100, offset = 0) =>
    apiFetch<TicketBatchDetail>(`/tickets/batches/${id}?limit=${limit}&offset=${offset}`),
  cancelBatch: (id: string) =>
    apiFetch<{ id: string; reference: string; cancelledTickets: number }>(
      `/tickets/batches/${id}/cancel`,
      { method: "POST" },
    ),
  retryBatch: (id: string) =>
    apiFetch<{ ok: boolean; pushed: number; failed: number; pending: number; message: string }>(
      `/tickets/batches/${id}/retry`,
      { method: "POST" },
    ),
};
