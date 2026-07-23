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

  test('landing featured adventures switch cleanly between locales', async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('console', message => {
      if (message.type() === 'error') runtimeErrors.push(message.text());
    });
    page.on('pageerror', error => runtimeErrors.push(error.message));

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('group', { name: 'Јазик' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Примери авантури' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Отвори авантура: Синтетичка геометрија' })).toBeVisible();

    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.getByRole('group', { name: 'Language' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Featured adventures' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open adventure: Synthetic geometry' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    expect(runtimeErrors).toEqual([]);
  });

  test('roster launch pre-fills and locks stable student identity', async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('console', message => {
      if (message.type() === 'error') runtimeErrors.push(message.text());
    });
    page.on('pageerror', error => runtimeErrors.push(error.message));

    await page.goto('/play/demo?student=student-1&name=%D0%90%D0%BD%D0%B0', {
      waitUntil: 'domcontentloaded',
    });
    const nameInput = page.getByPlaceholder('Внесете го вашето име...');
    await expect(nameInput).toHaveValue('Ана', { timeout: 15_000 });
    await expect(nameInput).toHaveAttribute('readonly', '');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    expect(runtimeErrors).toEqual([]);
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
