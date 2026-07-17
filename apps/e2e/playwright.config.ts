import { defineConfig, devices } from "@playwright/test";
import { E2E } from "./fixtures/data";

const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5433/mikconnect_e2e?schema=public";

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  snapshotDir: "./snapshots",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 45_000,
  expect: { timeout: 8_000, toHaveScreenshot: { animations: "disabled" } },
  reporter: process.env.CI
    ? [["line"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: E2E.webUrl,
    locale: "fr-FR",
    timezoneId: "Africa/Conakry",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  globalSetup: "./global-setup.ts",
  webServer: [
    {
      command: "node ../api/dist/main.js",
      url: `${E2E.apiUrl}/auth/me`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        DATABASE_URL: databaseUrl,
        PORT: "4100",
        NODE_ENV: "test",
        CORS_ORIGIN: E2E.webUrl,
        PUBLIC_API_URL: E2E.apiUrl,
        PUBLIC_WEB_URL: E2E.webUrl,
        JWT_ACCESS_SECRET: "e2e-access-secret-at-least-32-characters",
        JWT_REFRESH_SECRET: "e2e-refresh-secret-at-least-32-characters",
        JWT_ACCESS_TTL: "15m",
        JWT_REFRESH_TTL: "7d",
        MIKROTIK_ENCRYPTION_KEY: "1111111111111111111111111111111111111111111111111111111111111111",
        MIKROTIK_MOCK: "true",
        CINETPAY_MOCK: "true",
        SMS_PROVIDER: "local",
        RADIUS_SYNC_ENABLED: "false",
      },
    },
    {
      command: "pnpm --filter @mikconnect/web exec next start --port 3100",
      url: E2E.webUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { NEXT_PUBLIC_API_URL: E2E.apiUrl, NODE_ENV: "test" },
    },
  ],
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "android-mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
});
