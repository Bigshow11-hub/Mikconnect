# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend\e2e\dashboard.spec.ts >> dashboard navigation works
- Location: frontend\e2e\dashboard.spec.ts:38:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/register", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const testUser = {
  4  |   name: 'E2E User',
  5  |   email: `e2e-${Date.now()}@test.com`,
  6  |   password: 'password123',
  7  | };
  8  | 
  9  | test('full dashboard flow: register, login, create hotspot', async ({ page }) => {
  10 |   // Register
  11 |   await page.goto('/register');
  12 |   await page.getByLabel(/nom complet/i).fill(testUser.name);
  13 |   await page.getByLabel(/email/i).fill(testUser.email);
  14 |   await page.getByLabel(/mot de passe/i).fill(testUser.password);
  15 |   await page.getByRole('button', { name: /créer mon compte/i }).click();
  16 |   await page.waitForURL('/dashboard');
  17 |   await expect(page.getByText(/vue d'ensemble|overview/i)).toBeVisible();
  18 | 
  19 |   // Navigate to Hotspots
  20 |   await page.getByRole('link', { name: /hotspots/i }).first().click();
  21 |   await page.waitForURL('/dashboard/hotspots');
  22 |   await expect(page.getByRole('heading', { name: /hotspots/i })).toBeVisible();
  23 | 
  24 |   // Create a hotspot
  25 |   await page.getByRole('button', { name: /ajouter|add/i }).click();
  26 |   await page.getByLabel(/nom|name/i).fill('E2E Hotspot');
  27 |   await page.getByLabel(/ip.*routeur|router.*ip/i).fill('192.168.88.1');
  28 |   await page.getByLabel(/utilisateur|username/i).fill('admin');
  29 |   await page.getByLabel(/mot de passe|password/i).fill('admin123');
  30 |   await page.getByRole('button', { name: /enregistrer|save/i }).click();
  31 | 
  32 |   // Wait for form to close (success) and list to refresh
  33 |   await expect(page.getByRole('button', { name: /ajouter|add/i })).toBeVisible({ timeout: 5000 });
  34 |   // Should show the hotspot in the list
  35 |   await expect(page.getByText('E2E Hotspot')).toBeVisible({ timeout: 5000 });
  36 | });
  37 | 
  38 | test('dashboard navigation works', async ({ page }) => {
  39 |   // Register and go to dashboard
> 40 |   await page.goto('/register');
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  41 |   await page.getByLabel(/nom complet/i).fill('Nav Test');
  42 |   await page.getByLabel(/email/i).fill(`nav-${Date.now()}@test.com`);
  43 |   await page.getByLabel(/mot de passe/i).fill('password123');
  44 |   await page.getByRole('button', { name: /créer mon compte/i }).click();
  45 |   await page.waitForURL('/dashboard');
  46 | 
  47 |   // Visit each dashboard page
  48 |   const links = [
  49 |     { name: /hotspots/i, url: '/dashboard/hotspots' },
  50 |     { name: /offres|plans/i, url: '/dashboard/plans' },
  51 |     { name: /tickets|vouchers/i, url: '/dashboard/vouchers' },
  52 |     { name: /transactions/i, url: '/dashboard/transactions' },
  53 |     { name: /revendeurs|resellers/i, url: '/dashboard/resellers' },
  54 |     { name: /paramètres|settings/i, url: '/dashboard/settings' },
  55 |   ];
  56 | 
  57 |   for (const link of links) {
  58 |     await page.getByRole('link', { name: link.name }).first().click();
  59 |     await page.waitForURL(link.url);
  60 |     await expect(page.locator('h1')).toBeVisible();
  61 |   }
  62 | });
  63 | 
```