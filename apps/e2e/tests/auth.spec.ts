import { E2E } from "../fixtures/data";
import { expect, test } from "../fixtures/mikconnect-test";

test("un visiteur anonyme est renvoyé vers la connexion", async ({ page }) => {
  await page.goto("/tickets");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
});

test("un propriétaire ouvre son dashboard", async ({ page, loginAs }) => {
  await loginAs("ownerA");
  await expect(page.getByText(E2E.ownerA.name).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Tickets/ }).first()).toBeVisible();
});

test("des identifiants invalides produisent une erreur accessible", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("inconnu@mikconnect.test");
  await page.getByLabel("Mot de passe").fill("mot-de-passe-invalide");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("un agent est dirigé vers son espace revendeur", async ({ page, loginAs }) => {
  await loginAs("agent");
  await expect(page.getByRole("heading", { name: /Bonjour/ })).toBeVisible();
  await expect(page.getByText("Espace revendeur", { exact: false }).first()).toBeVisible();
});
