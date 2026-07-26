import { apiBlob, apiFetch } from "@/lib/api";

import type { MonthlyReport, SubscriptionUsage } from "./types";

export const reportsApi = {
  monthly: (month: string) =>
    apiFetch<MonthlyReport>(`/reports/monthly?month=${encodeURIComponent(month)}`),
  downloadPdf: (month: string) =>
    apiBlob(`/reports/monthly.pdf?month=${encodeURIComponent(month)}`),
  downloadCsv: (month: string) =>
    apiBlob(`/reports/monthly.csv?month=${encodeURIComponent(month)}`),
  subscription: () => apiFetch<SubscriptionUsage>("/subscription/current"),
};
