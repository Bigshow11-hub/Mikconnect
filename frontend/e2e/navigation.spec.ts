import { test, expect } from '@playwright/test';

test('navigates marketing pages', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('nav').getByText('MikConnect').first()).toBeVisible();
  await page.getByRole('link', { name: /partenaires|partners/i }).first().click();
  await expect(page.getByRole('heading', { name: /partenaire|partner/i })).toBeVisible();
  await page.getByRole('link', { name: /flash/i }).first().click();
  await expect(page.getByRole('heading', { name: /mikconnect flash/i }).first()).toBeVisible();
});
