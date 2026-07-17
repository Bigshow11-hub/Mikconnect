import { apiFetch } from "@/lib/api";
import type {
  PaymentProvider,
  PaymentRow,
  PaymentSummary,
  PublicPaymentStatus,
  PublicStore,
} from "./types";

export const paymentsApi = {
  list: () => apiFetch<PaymentRow[]>("/payments"),
  summary: () => apiFetch<PaymentSummary>("/payments/summary"),
};

export const publicPaymentsApi = {
  store: (tenantId: string) => apiFetch<PublicStore>(`/public/stores/${tenantId}`),
  initiate: (tenantId: string, input: { planId: string; provider: PaymentProvider; customerPhone: string }) =>
    apiFetch<{ transactionId: string; paymentUrl: string; status: string; simulated: boolean }>(
      `/public/stores/${tenantId}/payments`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  status: (tenantId: string, transactionId: string) =>
    apiFetch<PublicPaymentStatus>(`/public/stores/${tenantId}/payments/${transactionId}`),
};
