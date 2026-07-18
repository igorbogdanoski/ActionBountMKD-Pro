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

  test('creates and safely deletes a class group without overflow', async ({ page }) => {
    await page.goto('/groups?qaPlan=pro', { waitUntil: 'domcontentloaded' });
    const groupName = page.getByPlaceholder('Нова група, напр. 6-в');
    await expect(groupName).toBeVisible({ timeout: 15_000 });
    await groupName.fill('QA 7-А');
    await page.getByRole('button', { name: 'Создај група' }).click();
    await expect(page.getByRole('button', { name: /QA 7-А/ })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Избриши група' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Откажи' }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole('button', { name: 'Избриши група' }).click();
    await dialog.getByRole('button', { name: 'Избриши' }).click();
    await expect(page.getByRole('button', { name: /QA 7-А/ })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });

  test('persists dashboard quest toggles and confirms deletion without overflow', async ({ page }) => {
    await page.goto('/dashboard?qaPlan=pro&qaQuest=1', { waitUntil: 'domcontentloaded' });
    const questCard = page.locator('article').filter({ hasText: 'QA градска авантура' });
    await expect(questCard).toBeVisible({ timeout: 15_000 });

    const favorite = questCard.getByRole('button', { name: 'Додај во омилени' });
    await expect(favorite).toHaveAttribute('aria-pressed', 'false');
    await favorite.click();
    await expect(questCard.getByRole('button', { name: 'Отстрани од омилени' })).toHaveAttribute('aria-pressed', 'true');

    const offline = questCard.getByRole('button', { name: 'Зачувај офлајн' });
    await offline.click();
    await expect(questCard.getByRole('button', { name: 'Офлајн зачувано' })).toHaveAttribute('aria-pressed', 'true');

    await questCard.getByRole('button', { name: 'Избриши авантура' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('QA градска авантура');
    await dialog.getByRole('button', { name: 'Откажи' }).click();
    await expect(dialog).toBeHidden();
    await questCard.getByRole('button', { name: 'Избриши авантура' }).click();
    await dialog.getByRole('button', { name: 'Избриши' }).click();
    await expect(questCard).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });

  test('switches semantic results tabs and exposes valid exports without overflow', async ({ page }) => {
    await page.goto('/results?qaPlan=pro&qaResults=1', { waitUntil: 'domcontentloaded' });
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(4, { timeout: 15_000 });
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: 'Извоз во CSV' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Извоз во Excel' })).toBeEnabled();

    const analytics = page.getByRole('tab', { name: /Аналитика/ });
    await analytics.click();
    await expect(analytics).toHaveAttribute('aria-selected', 'true');
    const weakspots = page.getByRole('tab', { name: /Слаби точки/ });
    await weakspots.click();
    await expect(weakspots).toHaveAttribute('aria-selected', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });

  test('operates creator shell settings, sharing and manual save without overflow', async ({ page }) => {
    await page.goto('/creator?qaPlan=pro', { waitUntil: 'domcontentloaded' });
    const title = page.getByPlaceholder('Наслов на авантурата...');
    await expect(title).toBeVisible({ timeout: 15_000 });
    const save = page.getByRole('button', { name: 'Зачувај' });
    await expect(save).toBeDisabled();

    const settings = page.getByRole('button', { name: 'Поставки на квестот' });
    await expect(settings).toHaveAttribute('aria-pressed', 'false');
    await settings.click();
    await expect(settings).toHaveAttribute('aria-pressed', 'true');
    await settings.click();
    await expect(settings).toHaveAttribute('aria-pressed', 'false');

    await page.getByRole('button', { name: 'GPS Место', exact: true }).click();
    const backToStages = page.getByRole('button', { name: 'Назад кон етапи' });
    if (await backToStages.isVisible()) await backToStages.click();
    let stageSelectors = page.getByRole('button', { name: /Избери етапа/ });
    await expect(stageSelectors).toHaveCount(1);
    await expect(stageSelectors.first()).toHaveAttribute('aria-pressed', 'true');
    const plannerPoint = page.getByRole('button', { name: /Избери точка 1:/ });
    await expect(plannerPoint).toHaveAttribute('aria-pressed', 'true');
    const addPoint = page.getByRole('button', { name: 'Нова точка' });
    await expect(addPoint).toHaveAttribute('aria-pressed', 'false');
    await addPoint.click();
    const cancelAddPoint = page.getByRole('button', { name: 'Откажи додавање' });
    await expect(cancelAddPoint).toHaveAttribute('aria-pressed', 'true');
    await cancelAddPoint.click();
    await expect(addPoint).toHaveAttribute('aria-pressed', 'false');

    await page.getByRole('button', { name: 'Дуплирај етапа 1' }).click();
    stageSelectors = page.getByRole('button', { name: /Избери етапа/ });
    await expect(stageSelectors).toHaveCount(2);
    await expect(stageSelectors.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await stageSelectors.first().focus();
    await page.keyboard.press('Enter');

    await settings.click();
    await expect(settings).toHaveAttribute('aria-pressed', 'true');
    const tagInput = page.getByPlaceholder('npr. скопје, историја...');
    await tagInput.fill('Скопје!');
    await page.getByRole('button', { name: 'Додај таг' }).click();
    const removeTag = page.getByRole('button', { name: 'Отстрани таг скопје' });
    await expect(removeTag).toBeVisible();
    await removeTag.click();
    await expect(removeTag).toBeHidden();

    await page.getByPlaceholder('Име на предмет').fill('Златен клуч');
    await page.getByRole('button', { name: 'Додај предмет' }).click();
    const removeItem = page.getByRole('button', { name: 'Отстрани предмет Златен клуч' });
    await expect(removeItem).toBeVisible();
    await removeItem.click();
    await expect(removeItem).toBeHidden();

    const dangerZone = page.getByRole('tab', { name: 'Опасна зона' });
    await expect(dangerZone).toHaveAttribute('aria-selected', 'false');
    await dangerZone.click();
    await expect(dangerZone).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('button', { name: 'Избриши квест' }).click();
    const questDeleteDialog = page.getByRole('dialog', { name: 'Избриши квест?' });
    await expect(questDeleteDialog).toBeVisible();
    await questDeleteDialog.getByRole('button', { name: 'Откажи' }).click();
    await expect(questDeleteDialog).toBeHidden();
    await settings.click();
    await expect(settings).toHaveAttribute('aria-pressed', 'false');

    if (await backToStages.isVisible()) await backToStages.click();
    stageSelectors = page.getByRole('button', { name: /Избери етапа/ });
    await expect(stageSelectors.first()).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Избриши етапа 2' }).click();
    const deleteDialog = page.getByRole('dialog', { name: 'Избриши етапа?' });
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Избриши' }).click();
    await expect(stageSelectors).toHaveCount(1);

    await page.getByRole('button', { name: 'Сподели квест' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTitle('Линк за игра')).toHaveValue(/\/play\/[^/]+$/);
    await dialog.getByRole('button', { name: 'Копирај' }).click();
    await expect(dialog.getByRole('button', { name: 'Копирано' })).toBeVisible();
    expect(await dialog.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(false);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await title.fill(`QA manual save ${Date.now()}`);
    await expect(save).toBeEnabled();
    await save.click();
    await expect(save).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
});
