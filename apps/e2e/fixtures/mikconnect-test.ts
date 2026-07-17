import { expect, request, test as base, type APIRequestContext, type Page } from "@playwright/test";
import { E2E, type E2eRole } from "./data";

type MikconnectFixtures = {
  consoleErrors: string[];
  loginAs: (role: E2eRole) => Promise<void>;
  api: APIRequestContext;
  tokenFor: (role: E2eRole) => Promise<string>;
};

export const test = base.extend<MikconnectFixtures>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") {
          const source = message.location().url;
          errors.push(source ? `${message.text()} — ${source}` : message.text());
        }
      });
      page.on("pageerror", (error) => errors.push(error.message));
      await use(errors);
      expect(errors, "Aucune erreur console inattendue").toEqual([]);
    },
    { auto: true },
  ],
  loginAs: async ({ page }, use) => {
    await use(async (role) => login(page, role));
  },
  api: async ({}, use) => {
    const context = await request.newContext({ baseURL: E2E.apiUrl });
    await use(context);
    await context.dispose();
  },
  tokenFor: async ({ api }, use) => {
    await use(async (role) => {
      const identity = role === "agent" ? E2E.agent : E2E[role];
      const response = await api.post("/auth/login", {
        data: { email: identity.email, password: E2E.password },
      });
      expect(response.ok()).toBeTruthy();
      return ((await response.json()) as { accessToken: string }).accessToken;
    });
  },
});

export { expect } from "@playwright/test";

async function login(page: Page, role: E2eRole) {
  const identity = role === "agent" ? E2E.agent : E2E[role];
  await page.goto("/login");
  await page.getByLabel("Email").fill(identity.email);
  await page.getByLabel("Mot de passe").fill(E2E.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(role === "agent" ? "**/agent" : "**/dashboard");
}
