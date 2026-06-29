# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend\e2e\navigation.spec.ts >> navigates marketing pages
- Location: frontend\e2e\navigation.spec.ts:3:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('navigates marketing pages', async ({ page }) => {
> 4  |   await page.goto('/');
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  5  |   await expect(page.locator('nav').getByText('MikConnect').first()).toBeVisible();
  6  |   await page.getByRole('link', { name: /partenaires|partners/i }).first().click();
  7  |   await expect(page.getByRole('heading', { name: /partenaire|partner/i })).toBeVisible();
  8  |   await page.getByRole('link', { name: /flash/i }).first().click();
  9  |   await expect(page.getByRole('heading', { name: /mikconnect flash/i }).first()).toBeVisible();
  10 | });
  11 | 
```