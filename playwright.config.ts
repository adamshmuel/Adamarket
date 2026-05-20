import { defineConfig, devices } from '@playwright/test';

// Adamarket Playwright config.
// Single visible browser, serial execution — the QA skill's visibility rule
// requires every test to be observable. No headless mode anywhere.
//
// baseURL is driven by TEST_URL — same specs run against localhost (during
// development) and https://adamarket.vercel.app/ (after every deploy).

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: process.env.TEST_URL || 'http://localhost:8082',
    headless: false, // visibility rule
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    locale: 'he-IL',
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro
    ignoreHTTPSErrors: true,
    // Wait a bit longer for Expo SDK 54 + Supabase auth on slow networks
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
