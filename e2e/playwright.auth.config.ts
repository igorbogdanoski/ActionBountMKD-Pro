import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'authenticated.spec.ts',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'authenticated-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'authenticated-mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev:qa',
    url: 'http://127.0.0.1:3100/settings?qaPlan=free&qaAdmin=1',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
