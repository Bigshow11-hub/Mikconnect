import { test, expect } from '@playwright/test';

test('shows registration form', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: /essai gratuit/i })).toBeVisible();
  await expect(page.getByLabel(/nom complet/i)).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/mot de passe/i)).toBeVisible();
});
