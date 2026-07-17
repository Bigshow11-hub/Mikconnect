import { apiFetch } from "@/lib/api";

import type {
  Agent,
  AgentDetail,
  AgentSalesRow,
  AgentSalesSummary,
  AgentWorkspace,
  CreateAgentInput,
  SellResult,
  UpdateAgentInput,
} from "./types";

/**
 * API agents & sales — mikconnect.
 * Endpoints authentifiés (RLS isole par tenantId). Agents : OWNER only.
 */
export const agentsApi = {
  findAll: () => apiFetch<Agent[]>("/agents"),
  findOne: (id: string) => apiFetch<AgentDetail>(`/agents/${id}`),
  create: (input: CreateAgentInput) =>
    apiFetch<Agent>("/agents", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: UpdateAgentInput) =>
    apiFetch<AgentDetail>(`/agents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) =>
    apiFetch<void>(`/agents/${id}`, { method: "DELETE" }),
  assignTickets: (id: string, ticketIds: string[]) =>
    apiFetch<{ assigned: number; agentId: string }>(`/agents/${id}/assign`, {
      method: "POST",
      body: JSON.stringify({ ticketIds }),
    }),
  myWorkspace: () => apiFetch<AgentWorkspace>("/agents/me/workspace"),
  sellMyTicket: (ticketId: string) =>
    apiFetch<SellResult>(`/agents/me/tickets/${ticketId}/sell`, { method: "POST" }),
};

export const salesApi = {
  sellTicket: (ticketId: string, agentId?: string) =>
    apiFetch<SellResult>(`/tickets/${ticketId}/sell`, {
      method: "POST",
      body: JSON.stringify(agentId ? { agentId } : {}),
    }),
  agentSales: (agentId: string) =>
    apiFetch<AgentSalesSummary>(`/agents/${agentId}/sales`),
  allAgentsSales: () => apiFetch<AgentSalesRow[]>("/tickets/agent-sales"),
};
