export interface HotspotActiveUser {
  id: string;
  server: string;
  username: string;
  address: string;
  macAddress: string;
  loginBy: string;
  uptime: string;
  sessionTimeLeft: string | null;
  idleTime: string;
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  radius: boolean;
  blocked: boolean;
}

export interface RouterOnlineUsers {
  id: string;
  label: string;
  host: string;
  apiPort: number;
  apiTls: boolean;
  zone: { id: string; name: string } | null;
  status: "ONLINE" | "OFFLINE" | "ERROR";
  message: string;
  checkedAt: string;
  users: HotspotActiveUser[];
}

export interface OnlineUsersOverview {
  generatedAt: string;
  total: number;
  routers: RouterOnlineUsers[];
}
