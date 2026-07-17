export interface ReconciliationOverview {
  generated: number;
  sold: number;
  used: number;
  available: number;
  soldNotUsed: number;
  usedWithoutSale: number;
  activeSessions: number;
  gapPercent: number;
  thresholdPercent: number;
  alert: boolean;
  agents: {
    id: string;
    name: string;
    used: number;
    gaps: number;
    gapPercent: number;
  }[];
  checkedAt: string;
}

