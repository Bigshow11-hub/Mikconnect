import { E2E } from "../fixtures/data";
import { expect, test } from "../fixtures/mikconnect-test";

test.describe("@visual contrats visuels ciblés", () => {
  test("connexion en clair et sombre", async ({ page }) => {
    await page.goto("/login");
    await freezeMotion(page);
    await expect(page).toHaveScreenshot("login-light.png", { fullPage: true });
    await page.getByRole("button", { name: /mode sombre/i }).click();
    await expect(page).toHaveScreenshot("login-dark.png", { fullPage: true });
  });

  test("dashboard propriétaire", async ({ page, loginAs }) => {
    await loginAs("ownerA");
    await freezeMotion(page);
    await expect(page).toHaveScreenshot("dashboard.png", { fullPage: true });
  });

  test("liste des tickets", async ({ page, loginAs }) => {
    await loginAs("ownerA");
    await page.goto("/tickets");
    await freezeMotion(page);
    await expect(page).toHaveScreenshot("tickets.png", { fullPage: true });
  });

  test("espace agent", async ({ page, loginAs }) => {
    await loginAs("agent");
    await freezeMotion(page);
    await expect(page).toHaveScreenshot("agent.png", { fullPage: true });
  });

  test("portail d’achat", async ({ page }) => {
    await page.goto(`/acheter/${E2E.ownerA.tenantId}`);
    await freezeMotion(page);
    await expect(page).toHaveScreenshot("store.png", { fullPage: true });
  });
});

async function freezeMotion(page: import("@playwright/test").Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addStyleTag({
    content:
      "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
  });
  await page.waitForLoadState("load");
  await page.waitForTimeout(750);
}
