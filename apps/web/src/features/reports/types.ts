export interface QuotaValue {
  used: number;
  limit: number | null;
  remaining: number | null;
}

export interface SubscriptionUsage {
  tier: "FREE" | "PRO" | "BUSINESS";
  status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELLED";
  currentPeriodEnd: string | null;
  usage: { zones: QuotaValue; agents: QuotaValue; tickets: QuotaValue };
  features: { monthlyPdf: boolean; accountingCsv: boolean };
}

export interface MonthlyReport {
  period: { month: string; from: string; to: string };
  tenant: {
    name: string;
    currency: "XOF" | "GNF";
    tier: string;
    subscription: { status: string; currentPeriodEnd: string | null } | null;
  };
  totals: {
    revenue: number;
    commissions: number;
    netRevenue: number;
    sales: number;
    ticketsCreated: number;
    sessions: number;
    dataUsedMb: number;
    sessionSeconds: number;
  };
  tickets: Record<string, number>;
  payments: Record<string, number>;
  channels: Array<{ channel: string; sales: number; revenue: number }>;
  plans: Array<{ id: string; label: string; sales: number; revenue: number; commissions: number }>;
  agents: Array<{ id: string; label: string; sales: number; revenue: number; commissions: number }>;
  anomalies: Array<{ ticketCode: string; usedMb: number; limitMb: number }>;
}
