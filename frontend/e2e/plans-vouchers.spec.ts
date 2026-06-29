import { test, expect } from '@playwright/test';

async function registerAndCreateHotspot(page: any, suffix: string) {
  const email = `pv-${suffix}@test.com`;
  await page.goto('/register');
  await page.getByLabel(/nom complet/i).fill('PV Tester');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/mot de passe/i).fill('password123');
  await page.getByRole('button', { name: /créer mon compte/i }).click();
  await expect(page.getByRole('link', { name: /hotspots/i }).first()).toBeVisible({ timeout: 10000 });

  await page.getByRole('link', { name: /hotspots/i }).first().click();
  await page.waitForURL('**/dashboard/hotspots');
  await page.getByRole('button', { name: /ajouter|add/i }).click();
  await page.getByLabel(/nom|name/i).fill('E2E Hotspot');
  await page.getByLabel(/ip.*routeur|router.*ip/i).fill('10.0.0.1');
  await page.getByLabel(/utilisateur|username/i).fill('admin');
  await page.getByLabel(/mot de passe|password/i).fill('admin');
  await page.getByRole('button', { name: /enregistrer|save/i }).click();
  await expect(page.getByText('E2E Hotspot')).toBeVisible({ timeout: 5000 });
}

test('creates a plan', async ({ page }) => {
  await registerAndCreateHotspot(page, `${Date.now()}-1`);

  await page.getByRole('link', { name: /offres|plans/i }).first().click();
  await page.waitForURL('**/dashboard/plans');

  await page.getByRole('button', { name: /créer|create/i }).first().click();
  await page.getByLabel(/nom|name/i).fill('Test Plan 1h');
  await page.getByLabel(/durée|duration/i).fill('60');
  await page.getByLabel(/prix|price/i).fill('500');
  await page.getByLabel(/hotspot/i).selectOption({ index: 1 });
  await page.getByRole('button', { name: /enregistrer|save/i }).click();

  await expect(page.getByText('Test Plan 1h')).toBeVisible({ timeout: 5000 });
});

test('navigates to vouchers page', async ({ page }) => {
  await registerAndCreateHotspot(page, `${Date.now()}-2`);

  await page.getByRole('link', { name: /tickets|vouchers/i }).first().click();
  await page.waitForURL('**/dashboard/vouchers');
  await expect(page.getByRole('heading', { name: /tickets|vouchers/i }).first()).toBeVisible();
});
