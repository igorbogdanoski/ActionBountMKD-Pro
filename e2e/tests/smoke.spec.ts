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

  test('changelog is reachable, linked and responsive', async ({ page }) => {
    const consoleErrors: string[] = [];
    const runtimeErrors: string[] = [];
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', error => runtimeErrors.push(error.message));
    page.on('requestfailed', request => runtimeErrors.push(`${request.url()}: ${request.failure()?.errorText}`));
    page.on('response', response => {
      if (response.status() >= 400) runtimeErrors.push(`${response.status()} ${response.url()}`);
    });

    await page.goto('/changelog');
    await page.waitForLoadState('networkidle');
    expect(consoleErrors).toEqual([]);
    expect(runtimeErrors).toEqual([]);
    expect(await page.locator('body').innerText()).toContain('Новости во Авантура');
    await expect(page.getByRole('heading', { level: 1, name: 'Новости во Авантура' })).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(3);
    await expect(page.getByRole('link', { name: 'Новости' })).toHaveAttribute('href', '/changelog');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });

  test('demo play route mounts the player', async ({ page }) => {
    await page.goto('/play/demo');
    await expect(page.locator('#root')).not.toBeEmpty();
  });
});
