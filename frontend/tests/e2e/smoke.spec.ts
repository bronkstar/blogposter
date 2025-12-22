import { test, expect } from '@playwright/test';

test('renders default blogposter form', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Blogposter – Formulareingabe' })).toBeVisible();
  await expect(
    page.locator('input[value="IT-Arbeitsmarkt November 2025 - Wo bleibt der Herbst der Reformen?"]'),
  ).toBeVisible();
  await expect(page.getByText('Metadaten noch Beispiel', { exact: false })).toBeVisible();
  await expect(page.getByText('Monatsdaten noch Beispiel', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download (.md)' })).toBeDisabled();
});
