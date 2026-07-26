export interface RouterDiagnostic {
  ok: boolean;
  message: string;
  identity?: string;
  board?: string;
  version?: string;
  uptime?: string;
  timezoneName?: string;
  timezoneAutodetect?: boolean;
  activeUsers: number;
  hotspotUsers: number;
  scripts: number;
  schedulers: number;
}

export interface NetworkIssue {
  code: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  detail: string;
  action?: "FIX_TIMEZONE";
}

export interface NetworkOverview {
  checkedAt: string;
  expectedTimezone: string;
  summary: {
    routers: number;
    online: number;
    pendingTickets: number;
    failedTickets: number;
    pendingOperations: number;
  };
  routers: Array<{
    id: string;
    label: string;
    zone: { id: string; name: string } | null;
    status: "ONLINE" | "OFFLINE" | "ERROR";
    lastSeenAt: string | null;
    diagnostics: RouterDiagnostic;
    issues: NetworkIssue[];
  }>;
}
