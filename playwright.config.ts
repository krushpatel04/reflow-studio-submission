import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 90000,
  globalTimeout: 180000,
  expect: { timeout: 10000 },
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  outputDir: 'reports/ci/browser-results',
  reporter: [['list'], ['json', { outputFile: 'reports/ci/playwright.json' }]],
  use: {
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --config tests/vite-browser.config.ts --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/verify.html',
    timeout: 60000,
    reuseExistingServer: false,
    stdout: 'pipe', stderr: 'pipe',
  },
});
