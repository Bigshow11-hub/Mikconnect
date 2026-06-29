import { test, expect } from '@playwright/test';

const testUser = {
  name: 'E2E User',
  email: `e2e-${Date.now()}@test.com`,
  password: 'password123',
};

test('full dashboard flow: register, login, create hotspot', async ({ page }) => {
  // Register
  await page.goto('/register');
  await page.getByLabel(/nom complet/i).fill(testUser.name);
  await page.getByLabel(/email/i).fill(testUser.email);
  await page.getByLabel(/mot de passe/i).fill(testUser.password);
  await page.getByRole('button', { name: /créer mon compte/i }).click();
  await page.waitForURL('/dashboard');
  await expect(page.getByText(/vue d'ensemble|overview/i)).toBeVisible();

  // Navigate to Hotspots
  await page.getByRole('link', { name: /hotspots/i }).first().click();
  await page.waitForURL('/dashboard/hotspots');
  await expect(page.getByRole('heading', { name: /hotspots/i })).toBeVisible();

  // Create a hotspot
  await page.getByRole('button', { name: /ajouter|add/i }).click();
  await page.getByLabel(/nom|name/i).fill('E2E Hotspot');
  await page.getByLabel(/ip.*routeur|router.*ip/i).fill('192.168.88.1');
  await page.getByLabel(/utilisateur|username/i).fill('admin');
  await page.getByLabel(/mot de passe|password/i).fill('admin123');
  await page.getByRole('button', { name: /enregistrer|save/i }).click();

  // Wait for form to close (success) and list to refresh
  await expect(page.getByRole('button', { name: /ajouter|add/i })).toBeVisible({ timeout: 5000 });
  // Should show the hotspot in the list
  await expect(page.getByText('E2E Hotspot')).toBeVisible({ timeout: 5000 });
});

test('dashboard navigation works', async ({ page }) => {
  // Register and go to dashboard
  await page.goto('/register');
  await page.getByLabel(/nom complet/i).fill('Nav Test');
  await page.getByLabel(/email/i).fill(`nav-${Date.now()}@test.com`);
  await page.getByLabel(/mot de passe/i).fill('password123');
  await page.getByRole('button', { name: /créer mon compte/i }).click();
  await page.waitForURL('/dashboard');

  // Visit each dashboard page
  const links = [
    { name: /hotspots/i, url: '/dashboard/hotspots' },
    { name: /offres|plans/i, url: '/dashboard/plans' },
    { name: /tickets|vouchers/i, url: '/dashboard/vouchers' },
    { name: /transactions/i, url: '/dashboard/transactions' },
    { name: /revendeurs|resellers/i, url: '/dashboard/resellers' },
    { name: /paramètres|settings/i, url: '/dashboard/settings' },
  ];

  for (const link of links) {
    await page.getByRole('link', { name: link.name }).first().click();
    await page.waitForURL(link.url);
    await expect(page.locator('h1')).toBeVisible();
  }
});
