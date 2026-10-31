import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/production', timeout: 90000, globalTimeout: 120000, workers: 1, retries: 0,
  outputDir: 'reports/completion/C/production-traces', reporter: [['list']],
  use: { browserName: 'chromium', baseURL: 'http://127.0.0.1:4188', viewport: { width: 1440, height: 1000 },
    proxy: { server: 'http://127.0.0.1:9', bypass: '127.0.0.1' }, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'npx vite preview --host 127.0.0.1 --port 4188 --strictPort', url: 'http://127.0.0.1:4188/', reuseExistingServer: false, timeout: 30000 },
});
