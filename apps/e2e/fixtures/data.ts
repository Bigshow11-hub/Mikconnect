export const E2E = {
  password: "E2e-password-123",
  ownerA: {
    tenantId: "tenant-e2e-gn",
    email: "owner.gn.e2e@mikconnect.test",
    name: "Aminata Diallo",
  },
  ownerB: {
    tenantId: "tenant-e2e-ci",
    email: "owner.ci.e2e@mikconnect.test",
    name: "Koffi Yao",
  },
  agent: {
    email: "agent.gn.e2e@mikconnect.test",
    name: "Mamadou Bah",
  },
  apiUrl: process.env.E2E_API_URL ?? "http://127.0.0.1:4100",
  webUrl: process.env.E2E_WEB_URL ?? "http://127.0.0.1:3100",
} as const;

export type E2eRole = "ownerA" | "ownerB" | "agent";
