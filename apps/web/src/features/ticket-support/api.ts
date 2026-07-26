import { apiFetch } from "@/lib/api";

export interface TicketSupportResult {
  tenant: { id: string; name: string };
  ticket: {
    code: string;
    status: string;
    provisioningStatus: "PENDING" | "SYNCED" | "FAILED";
    expiresAt: string | null;
    plan: {
      name: string;
      durationMinutes: number;
      dataLimitMb: number | null;
      price: number;
      currency: "XOF" | "GNF";
    };
    usage: { dataUsedMb: number; sessionSeconds: number };
  };
  sms: { status: string; sentAt: string | null; attempts: number } | null;
  guidance: string;
}

export const ticketSupportApi = {
  lookup: (tenantId: string, input: { reference: string; phone: string }) =>
    apiFetch<TicketSupportResult>(`/public/support/${tenantId}/tickets/lookup`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  resend: (tenantId: string, input: { reference: string; phone: string }) =>
    apiFetch<{ ok: boolean; message: string }>(`/public/support/${tenantId}/tickets/resend`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
