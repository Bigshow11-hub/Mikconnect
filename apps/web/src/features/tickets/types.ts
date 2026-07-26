export type TicketStatus = "ISSUED" | "SOLD" | "USED" | "EXPIRED" | "CANCELLED";
export type Currency = "XOF" | "GNF";
export type SalesChannel = "AGENT" | "MOBILE_MONEY";
export type TicketProvisioningStatus = "PENDING" | "SYNCED" | "FAILED";

export interface Plan {
  id: string;
  name: string;
  durationMinutes: number;
  dataLimitMb: number | null;
  price: number;
  currency: Currency;
}

export interface TicketListItem {
  id: string;
  code: string;
  status: TicketStatus;
  createdAt: string;
  soldAt: string | null;
  usedAt: string | null;
  expiresAt: string | null;
  plan: {
    id: string;
    name: string;
    price: number;
    currency: Currency;
  };
  agent: {
    id: string;
    commissionPercent: number;
    user: { name: string };
  } | null;
}

export interface TicketDetail extends TicketListItem {
  plan: Plan & {
    id: string;
    name: string;
    price: number;
    currency: Currency;
    durationMinutes: number;
    dataLimitMb: number | null;
  };
  sale: {
    id: string;
    amount: number;
    commission: number;
    channel: SalesChannel;
    createdAt: string;
  } | null;
}

export interface TicketListResponse {
  tickets: TicketListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface GenerateBatchInput {
  planId: string;
  quantity: number;
  agentId?: string;
  codeLength?: 4 | 5 | 6 | 7 | 8;
}

export type TicketPdfLayout = "A4_STANDARD" | "A4_COMPACT";

export interface GenerateBatchResult {
  batchId: string;
  reference: string;
  replayed: boolean;
  tickets: {
    id: string;
    code: string;
    planId: string;
    status: TicketStatus;
    expiresAt: string;
    createdAt: string;
  }[];
  push: {
    ok: boolean;
    pushed: number;
    failed: number;
    pending: number;
    message: string;
  };
}

export interface TicketBatch {
  id: string;
  reference: string;
  quantity: number;
  codeLength: number;
  createdAt: string;
  cancelledAt: string | null;
  createdByUserId: string | null;
  plan: { id: string; name: string; durationMinutes: number };
  agent: { id: string; user: { name: string } } | null;
  tickets: { id: string; status: TicketStatus; provisioningStatus: TicketProvisioningStatus }[];
  summary: {
    issued: number;
    sold: number;
    used: number;
    expired: number;
    cancelled: number;
    pending: number;
    synced: number;
    failed: number;
  };
}

export interface TicketBatchFilters {
  q?: string;
  planId?: string;
  agentId?: string;
  state?: "ACTIVE" | "CANCELLED";
  provisioningStatus?: TicketProvisioningStatus;
  limit?: number;
  offset?: number;
  sort?: "asc" | "desc";
}

export interface TicketBatchListResponse {
  items: TicketBatch[];
  total: number;
  limit: number;
  offset: number;
}

export interface TicketBatchDetail {
  id: string;
  reference: string;
  quantity: number;
  codeLength: number;
  createdAt: string;
  cancelledAt: string | null;
  creatorName: string | null;
  cancelledByName: string | null;
  plan: Plan;
  agent: { id: string; user: { name: string } } | null;
  tickets: {
    id: string;
    code: string;
    status: TicketStatus;
    provisioningStatus: TicketProvisioningStatus;
    pushedAt: string | null;
    pushAttempts: number;
    lastPushError: string | null;
    expiresAt: string | null;
  }[];
  total: number;
  limit: number;
  offset: number;
  events: Array<{
    id: string;
    action: string;
    actorName: string | null;
    metadata: unknown;
    createdAt: string;
  }>;
}

export interface TicketFilters {
  status?: TicketStatus;
  planId?: string;
  agentId?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface BusinessOverview {
  currency: Currency;
  revenueToday: number;
  salesToday: number;
  salesTodayPhysical: number;
  salesTodayOnline: number;
  revenueTodayPhysical: number;
  revenueTodayOnline: number;
  revenueMonth: number;
  salesMonth: number;
  activeTickets: number;
  routersOnline: number;
  routersTotal: number;
  connectionsToday: number;
  dataUsedTodayMb: number;
  accountingSessionsActive: number;
  salesTrend: {
    date: string;
    label: string;
    revenue: number;
    sales: number;
    revenuePhysical: number;
    revenueOnline: number;
    salesPhysical: number;
    salesOnline: number;
  }[];
  usageTrend: {
    date: string;
    label: string;
    connections: number;
    dataUsedMb: number;
  }[];
  recentSales: {
    id: string;
    amount: number;
    channel: SalesChannel;
    createdAt: string;
    ticket: {
      code: string;
      plan: { name: string };
      agent: { user: { name: string } } | null;
    };
  }[];
}
