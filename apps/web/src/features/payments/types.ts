import type { Currency } from "@/features/tickets/types";

export type PaymentProvider = "ORANGE" | "MTN" | "MOOV" | "WAVE" | "SUDI";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";

export interface PublicStore {
  id: string;
  name: string;
  country: "CI" | "GN";
  currency: Currency;
  providers: PaymentProvider[];
  plans: {
    id: string;
    name: string;
    durationMinutes: number;
    dataLimitMb: number | null;
    price: number;
    currency: Currency;
  }[];
}

export interface PaymentRow {
  id: string;
  providerTxId: string | null;
  provider: PaymentProvider;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  customerPhone: string | null;
  createdAt: string;
  ticket: { code: string; plan: { name: string } };
  smsDelivery: { status: "PENDING" | "SENT" | "FAILED"; sentAt: string | null } | null;
}

export interface PaymentSummary {
  revenue: number;
  successful: number;
  pending: number;
  failed: number;
}

export interface PublicPaymentStatus {
  transactionId: string;
  status: PaymentStatus;
  amount: number;
  currency: Currency;
  planName: string;
  ticketCode: string | null;
  smsStatus: "PENDING" | "SENT" | "FAILED" | null;
}
