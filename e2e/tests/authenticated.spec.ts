import { expect, test } from '@playwright/test';

test.describe('authenticated QA harness', () => {
  test('renders Settings with QA identity and supports all tabs', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto('/settings?qaPlan=free');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByText('QA Teacher')).toBeVisible();

    const tabs = page.locator('button[aria-pressed]');
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
    await page.goto('/settings?qaPlan=pro');
    await page.locator('main > div').first().locator('button').first().click();
    await expect(page.getByRole('navigation')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test('keeps the onboarding actions visible and routes the primary CTA', async ({ page }) => {
    await page.goto('/dashboard?qaPlan=free');
    const onboarding = page.locator('main .from-brand-50');
    await expect(onboarding).toBeVisible();
    const actions = onboarding.getByRole('button');
    await expect(actions).toHaveCount(3);
    await actions.nth(1).click();
    await expect(page).toHaveURL(/\/creator$/);
  });
});
