import { expect, test } from "../fixtures/mikconnect-test";

test("un propriétaire génère un lot avec des codes compacts de 4 caractères", async ({
  page,
  loginAs,
}) => {
  await loginAs("ownerA");
  await page.goto("/tickets/new");
  await page.locator('input[name="code-length"][value="4"]').check();
  await page.getByRole("radio", { name: /Express/ }).check();
  await page.getByLabel("Quantité").fill("3");

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/tickets/batch") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Générer le lot" }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const payload = (await response.json()) as { tickets: Array<{ code: string }> };
  expect(payload.tickets).toHaveLength(3);
  for (const ticket of payload.tickets) expect(ticket.code).toMatch(/^[A-Z0-9]{4}$/);

  await expect(page.getByRole("heading", { name: "Lot prêt à être distribué" })).toBeVisible();
});

test("une vente agent est comptabilisée depuis son espace", async ({ page, loginAs }) => {
  await loginAs("agent");
  const availableBefore = Number(
    await page.getByText("Tickets à vendre").locator("..").locator("dd").textContent(),
  );
  const saleResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/agents/me/tickets/") && response.url().endsWith("/sell"),
  );
  await page.getByRole("button", { name: "Confirmer la vente" }).first().click();
  expect((await saleResponse).status()).toBe(201);
  await expect(page.getByText("Vente enregistrée", { exact: true })).toBeVisible();
  await expect(page.getByText("Tickets à vendre").locator("..").locator("dd")).toHaveText(
    String(availableBefore - 1),
  );
});
