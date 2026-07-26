export interface MonitoringLink {
  id: string;
  name: string;
  publicPath: string;
  active: boolean;
  includeRevenue: boolean;
  includeTicketStats: boolean;
  includeNetwork: boolean;
  expiresAt: string | null;
  revokedAt: string | null;
  lastAccessedAt: string | null;
  createdAt: string;
  zone: { id: string; name: string } | null;
}

export interface PublicMonitoringView {
  generatedAt: string;
  name: string;
  tenant: { name: string; currency: "XOF" | "GNF" };
  zone: { id: string; name: string } | null;
  expiresAt: string | null;
  revenue: { amount: number; sales: number } | null;
  ticketStats: Record<string, number> | null;
  network: {
    onlineSessions: number;
    routers: Array<{
      id: string;
      label: string;
      status: "ONLINE" | "OFFLINE" | "ERROR";
      lastSeenAt: string | null;
    }>;
  } | null;
}
