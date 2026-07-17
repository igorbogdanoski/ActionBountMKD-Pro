import { expect, test } from '@playwright/test';

test.describe('authenticated QA harness', () => {
  test('renders Settings with QA identity and supports all tabs', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto('/settings?qaPlan=free', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByText('QA Teacher')).toBeVisible();

    const tabs = page.locator('main button[aria-pressed]');
    await expect(tabs).toHaveCount(3);
    await tabs.nth(1).click();
    const outdoorMode = page.getByRole('switch');
    await expect(outdoorMode).toBeVisible();
    await outdoorMode.click();
    await expect(outdoorMode).toHaveAttribute('aria-checked', 'true');

    await tabs.nth(2).click();
    await expect(page.getByText('Free', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Expo Push Token')).toBeVisible();
    await expect(page.getByText('ExponentPushToken[qa-browser-only]', { exact: true })).toBeVisible();
    await expect(page.locator('button:has(svg.lucide-bell-ring)')).toBeEnabled();

    expect(consoleErrors).toEqual([]);
  });

  test('opens the mobile navigation drawer without overflow', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'authenticated-mobile', 'mobile-only contract');
    await page.goto('/settings?qaPlan=pro', { waitUntil: 'domcontentloaded' });
    await page.locator('main > div').first().locator('button').first().click();
    await expect(page.getByRole('navigation')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test('keeps the onboarding actions visible and routes the primary CTA', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('ak_onboarding_dismissed'));
    await page.goto('/dashboard?qaPlan=free', { waitUntil: 'domcontentloaded' });
    const onboarding = page.locator('main .from-brand-50');
    await expect(onboarding).toBeVisible({ timeout: 15_000 });
    const actions = onboarding.getByRole('button');
    await expect(actions).toHaveCount(3);
    await actions.nth(1).click();
    await expect(page).toHaveURL(/\/creator$/);
  });

  test('opens the public login modal and preserves tab/form semantics', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'authenticated-desktop', 'desktop landing login control');
    await page.goto('/?qaGuest=1', { waitUntil: 'domcontentloaded' });
    await page.locator('header button.hidden').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const tabs = dialog.locator('button[aria-pressed]');
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.locator('button[type="submit"]')).toHaveCount(1);
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
  });

  test('exposes active, language, theme and admin sidebar controls', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'authenticated-desktop', 'desktop sidebar contract');
    await page.goto('/settings?qaPlan=pro&qaAdmin=1', { waitUntil: 'domcontentloaded' });
    const sidebar = page.locator('aside');
    await expect(sidebar.locator('button[aria-current="page"]')).toHaveCount(1);
    await expect(sidebar.locator('button[aria-pressed]')).toHaveCount(2);

    const theme = sidebar.locator('button:has(svg.lucide-sun)');
    await expect(theme).toBeVisible();
    await theme.click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    await sidebar.locator('button:has(svg.lucide-shield)').click();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test('routes the dashboard plan usage upgrade action to pricing', async ({ page }) => {
    await page.goto('/dashboard?qaPlan=free', { waitUntil: 'domcontentloaded' });
    const upgrade = page.locator('main button:has(svg.lucide-zap)');
    await expect(upgrade).toBeVisible({ timeout: 15_000 });
    await upgrade.click();
    await expect(page).toHaveURL(/\/pricing$/);
  });

  test('opens and closes the Pro template submission panel without overflow', async ({ page }) => {
    await page.goto('/templates?qaPlan=pro', { waitUntil: 'domcontentloaded' });
    const submitToggle = page.getByRole('button', { name: 'Предложи шаблон' });
    await expect(submitToggle).toBeVisible({ timeout: 15_000 });
    await expect(submitToggle).toHaveAttribute('aria-expanded', 'false');
    await submitToggle.click();
    await expect(submitToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('Предложи свој шаблон')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    await submitToggle.click();
    await expect(page.getByText('Предложи свој шаблон')).toBeHidden();
  });
});
