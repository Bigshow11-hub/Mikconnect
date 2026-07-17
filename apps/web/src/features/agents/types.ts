export interface Agent {
  id: string;
  commissionPercent: number;
  active: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  ticketsCount: number;
  availableTicketsCount: number;
  salesCount: number;
}

export interface AgentDetail extends Agent {
  updatedAt: string;
}

export interface CreateAgentInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  commissionPercent: number;
}

export interface UpdateAgentInput {
  commissionPercent?: number;
  active?: boolean;
}

export interface AgentSale {
  id: string;
  amount: number;
  commission: number;
  createdAt: string;
  ticket: {
    id: string;
    code: string;
    plan: { name: string };
  };
}

export interface AgentSalesSummary {
  agent: {
    id: string;
    commissionPercent: number;
    active: boolean;
  };
  sales: AgentSale[];
  totalAmount: number;
  totalCommission: number;
  salesCount: number;
}

export interface AgentSalesRow {
  id: string;
  commissionPercent: number;
  active: boolean;
  user: { name: string };
  totalAmount: number;
  totalCommission: number;
  salesCount: number;
}

export interface SellResult {
  ticket: {
    id: string;
    code: string;
    status: string;
    soldAt: string;
  };
  sale: {
    id: string;
    amount: number;
    commission: number;
    channel: string;
    createdAt: string;
  };
}

export interface AgentWorkspace {
  id: string;
  commissionPercent: number;
  active: boolean;
  user: { name: string; email: string };
  tenant: { name: string; currency: "XOF" | "GNF" };
  tickets: {
    id: string;
    code: string;
    status: string;
    createdAt: string;
    soldAt: string | null;
    plan: {
      name: string;
      price: number;
      currency: "XOF" | "GNF";
      durationMinutes: number;
    };
  }[];
  sales: { id: string; amount: number; commission: number; createdAt: string }[];
  availableTicketsCount: number;
  soldTicketsCount: number;
  totalAmount: number;
  totalCommission: number;
}
