import { apiFetch } from "@/lib/api";
import type { MonitoringLink, PublicMonitoringView } from "./types";

export interface CreateMonitoringLinkInput {
  name: string;
  zoneId?: string;
  expiresInDays: number;
  includeRevenue: boolean;
  includeTicketStats: boolean;
  includeNetwork: boolean;
}

export const monitoringLinksApi = {
  list: () => apiFetch<MonitoringLink[]>("/monitoring-links"),
  create: (input: CreateMonitoringLinkInput) =>
    apiFetch<MonitoringLink>("/monitoring-links", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  revoke: (id: string) =>
    apiFetch<{ id: string; revokedAt: string }>(`/monitoring-links/${id}/revoke`, {
      method: "POST",
    }),
  rotate: (id: string) =>
    apiFetch<Pick<MonitoringLink, "id" | "name" | "active" | "publicPath" | "expiresAt">>(
      `/monitoring-links/${id}/rotate`,
      { method: "POST" },
    ),
  publicView: (token: string) =>
    apiFetch<PublicMonitoringView>(`/public/monitoring/${encodeURIComponent(token)}`),
};
