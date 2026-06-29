import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node ../node_modules/tsx/dist/cli.mjs src/index.ts',
      port: 3001,
      cwd: '../backend',
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'node ../node_modules/vite/bin/vite.js --port 5173',
      port: 5173,
      cwd: '.',
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
