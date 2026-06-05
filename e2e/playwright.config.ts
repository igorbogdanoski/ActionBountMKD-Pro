import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config (Phase 7H). Lives at the repo root, outside apps/web,
 * so the web `tsc --noEmit` never type-checks it (and never needs
 * @playwright/test installed for the app build to pass).
 *
 * Setup once, locally or in CI:
 *   npm i -D @playwright/test && npx playwright install --with-deps
 *   npm run test:e2e
 *
 * Target a deployed site instead of the dev server:
 *   PLAYWRIGHT_BASE_URL=https://avantura.mismath.net npm run test:e2e
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const useExternal = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  // When no external URL is given, boot the Vite dev server for the run.
  webServer: useExternal
    ? undefined
    : {
        command: 'npm run dev --prefix apps/web',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
