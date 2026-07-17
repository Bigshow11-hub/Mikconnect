import { expect, test } from "../fixtures/mikconnect-test";

test("l’API refuse les routes privées sans jeton", async ({ api }) => {
  const response = await api.get("/auth/me");
  expect(response.status()).toBe(401);
});

test("un agent ne peut pas utiliser une route réservée au propriétaire", async ({
  api,
  tokenFor,
}) => {
  const token = await tokenFor("agent");
  const response = await api.get("/tickets", {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.status()).toBe(403);
});

test("un propriétaire ne peut pas lire le ticket d’un autre tenant", async ({ api, tokenFor }) => {
  const [ownerA, ownerB] = await Promise.all([tokenFor("ownerA"), tokenFor("ownerB")]);
  const tenantBTickets = await api.get("/tickets?limit=1", {
    headers: { Authorization: `Bearer ${ownerB}` },
  });
  expect(tenantBTickets.ok()).toBeTruthy();
  const payload = (await tenantBTickets.json()) as { tickets: Array<{ id: string }> };
  expect(payload.tickets).toHaveLength(1);

  const crossTenantRead = await api.get(`/tickets/${payload.tickets[0]!.id}`, {
    headers: { Authorization: `Bearer ${ownerA}` },
  });
  expect(crossTenantRead.status()).toBe(404);
});
