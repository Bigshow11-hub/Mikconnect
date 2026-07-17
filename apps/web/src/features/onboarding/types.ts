export interface Zone {
  id: string;
  name: string;
  location: string | null;
  createdAt: string;
  routers?: {
    id: string;
    label: string;
    host: string;
    apiPort: number;
    apiTls: boolean;
    status: Router["status"];
    lastSeenAt: string | null;
  }[];
}

export interface Router {
  id: string;
  label: string;
  host: string;
  apiUser: string;
  apiPort: number;
  apiTls: boolean;
  status: "ONLINE" | "OFFLINE" | "ERROR";
  zoneId: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface RouterTestResult {
  ok: boolean;
  message: string;
  detail?: string;
}

export interface CreateZoneInput {
  name: string;
  location?: string;
}

export interface CreateRouterInput {
  label: string;
  host: string;
  apiUser: string;
  apiPassword: string;
  zoneId: string;
  apiPort?: number;
  apiTls?: boolean;
}

export interface RouterTestInput {
  host: string;
  apiUser: string;
  apiPassword: string;
  apiPort?: number;
  apiTls?: boolean;
}
