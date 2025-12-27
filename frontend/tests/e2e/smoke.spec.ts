import { test, expect } from '@playwright/test';

test('renders both writer modes', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /Blogposter – Formulareingabe/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'IT-Arbeitsmarkt-Writer' })).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.locator('input[value="IT-Arbeitsmarkt November 2025 - Wo bleibt der Herbst der Reformen?"]'),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Monthly TOML Vorschau' })).toBeVisible();

  await page.getByRole('button', { name: 'Blogpost-Writer' }).click();
  await expect(page.getByRole('button', { name: 'Blogpost-Writer' })).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.locator('input[value="Tech Recruiting Trends 2025 – Remote Onboarding richtig nutzen"]'),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Monthly TOML Vorschau' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Download (.md)' })).toBeDisabled();
});
