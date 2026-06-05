import { expect, test } from '@playwright/test';

/**
 * Critical-path smoke tests (Phase 7H). Intentionally assertion-light and
 * content-stable so they survive copy/layout tweaks: they verify the public
 * shell renders rather than pinning exact marketing strings.
 */
test.describe('public shell', () => {
  test('landing page loads and is branded "Авантура"', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Авантура/);
    await expect(page.getByText('Авантура').first()).toBeVisible();
  });

  test('legal pages are reachable', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('body')).toContainText(/Приватн/i);

    await page.goto('/terms');
    await expect(page.locator('body')).toContainText(/Услови/i);
  });

  test('demo play route mounts the player', async ({ page }) => {
    await page.goto('/play/demo');
    await expect(page.locator('#root')).not.toBeEmpty();
  });
});
