import { E2E } from "../fixtures/data";
import { expect, test } from "../fixtures/mikconnect-test";

test("un achat mobile money livre un ticket et remonte comme vente", async ({ page }) => {
  await page.goto(`/acheter/${E2E.ownerA.tenantId}`);
  await expect(page.getByRole("heading", { name: /Connectez-vous/ })).toBeVisible();
  await page.getByLabel("Numéro utilisé pour payer et recevoir le code").fill("+224620000088");

  const initiation = page.waitForResponse(
    (response) => response.url().endsWith("/payments") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /Payer avec/ }).click();
  expect((await initiation).status()).toBe(201);

  await expect(page).toHaveURL(/\/confirmation\?transaction_id=MK/);
  await expect(page.getByRole("heading", { name: /prêt à vous connecter/ })).toBeVisible();
  await expect(page.getByText("Votre code WiFi")).toBeVisible();
  await expect(page.getByText(/envoyé par SMS/)).toBeVisible();
});
