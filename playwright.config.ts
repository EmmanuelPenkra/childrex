import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'on', screenshot: 'on', video: 'on' },
  webServer: {
    command: 'pnpm build && NODE_ENV=test PORT=4173 node dist/server/apps/server/src/index.js',
    port: 4173,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'] } }],
});
