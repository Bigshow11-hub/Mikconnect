import { apiFetch } from "@/lib/api";

import type { OnlineUsersOverview, RouterOnlineUsers } from "./types";

export const routerMonitoringApi = {
  onlineUsers: () => apiFetch<OnlineUsersOverview>("/routers/online-users"),
  onlineUsersForRouter: (routerId: string) =>
    apiFetch<RouterOnlineUsers>(`/routers/${routerId}/online-users`),
  disconnectUser: (routerId: string, sessionId: string, macAddress: string) =>
    apiFetch<{ ok: boolean; message: string }>(`/routers/${routerId}/online-users/disconnect`, {
      method: "POST",
      body: JSON.stringify({ sessionId, macAddress }),
    }),
  blockUser: (routerId: string, sessionId: string, macAddress: string) =>
    apiFetch<{ ok: boolean; message: string }>(`/routers/${routerId}/online-users/block`, {
      method: "POST",
      body: JSON.stringify({ sessionId, macAddress }),
    }),
};
