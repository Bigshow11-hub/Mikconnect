import { test, expect } from '@playwright/test';

test('shows login form', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /connexion/i })).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/mot de passe/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible();
});

test('shows error on invalid login', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('wrong@test.com');
  await page.getByLabel(/mot de passe/i).fill('wrongpass');
  await page.getByRole('button', { name: /se connecter/i }).click();
  await expect(page.getByText(/email|erreur|invalide|Incorrect/i).first()).toBeVisible({ timeout: 10000 });
});
