import { request, type APIRequestContext, type FullConfig } from "@playwright/test";
import { E2E } from "./fixtures/data";

type TokenPair = { accessToken: string };
type Plan = { id: string };
type Zone = { id: string };
type Agent = { id: string };
type Router = { id: string };

export default async function globalSetup(_config: FullConfig) {
  const api = await request.newContext({ baseURL: E2E.apiUrl });
  try {
    const ownerA = await login(api, E2E.ownerA.email);
    const ownerB = await login(api, E2E.ownerB.email);

    await provisionTenant(api, ownerA, "Routeur test Kaloum", "10.10.0.11");
    await provisionTenant(api, ownerB, "Routeur test Plateau", "10.10.0.12");

    const existingAgents = await get<Array<Agent & { user: { email: string } }>>(
      api,
      "/agents",
      ownerA,
    );
    const agent =
      existingAgents.find((item) => item.user.email === E2E.agent.email) ??
      (await post<Agent>(api, "/agents", ownerA, {
        name: E2E.agent.name,
        email: E2E.agent.email,
        password: E2E.password,
        phone: "+224620000099",
        commissionPercent: 12,
      }));
    const plans = await get<Plan[]>(api, "/plans", ownerA);
    await post(api, "/tickets/batch", ownerA, {
      planId: plans[0]!.id,
      quantity: 3,
      agentId: agent.id,
      codeLength: 8,
    });

    const plansB = await get<Plan[]>(api, "/plans", ownerB);
    await post(api, "/tickets/batch", ownerB, {
      planId: plansB[0]!.id,
      quantity: 1,
      codeLength: 8,
    });
  } finally {
    await api.dispose();
  }
}

async function provisionTenant(api: APIRequestContext, token: string, label: string, host: string) {
  const routers = await get<Router[]>(api, "/routers", token);
  if (routers.length > 0) return;
  const zones = await get<Zone[]>(api, "/zones", token);
  await post(api, "/routers", token, {
    label,
    host,
    apiUser: "mikconnect-e2e",
    apiPassword: "router-e2e-password",
    zoneId: zones[0]!.id,
  });
}

async function login(api: APIRequestContext, email: string) {
  const response = await api.post("/auth/login", {
    data: { email, password: E2E.password },
  });
  assertOk(response.status(), "/auth/login", await response.text());
  return ((await response.json()) as TokenPair).accessToken;
}

async function get<T>(api: APIRequestContext, path: string, token: string): Promise<T> {
  const response = await api.get(path, { headers: auth(token) });
  assertOk(response.status(), path, await response.text());
  return response.json() as Promise<T>;
}

async function post<T = unknown>(
  api: APIRequestContext,
  path: string,
  token: string,
  data: unknown,
): Promise<T> {
  const response = await api.post(path, { headers: auth(token), data });
  assertOk(response.status(), path, await response.text());
  return response.json() as Promise<T>;
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function assertOk(status: number, path: string, body: string) {
  if (status < 200 || status >= 300) {
    throw new Error(`${path} a répondu ${status}: ${body}`);
  }
}
