import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/pwa',
  testMatch: '**/*.pw.ts',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4183',
    channel: 'chrome',
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/pwa-test-server.mjs',
    url: 'http://127.0.0.1:4183',
    reuseExistingServer: false,
  },
});
