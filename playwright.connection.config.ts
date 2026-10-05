import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/connection',
  testMatch: '**/*.pw.ts',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4193',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4193 --strictPort',
    url: 'http://127.0.0.1:4193',
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: 'https://saving-project.supabase.co',
      VITE_SUPABASE_PROXY_URL: 'https://saving-app.apexstack-work.workers.dev',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
      VITE_AUTH_EMAIL_ENABLED: 'true',
      VITE_CLOUD_WORKSPACE_ENABLED: 'true',
    },
  },
});
