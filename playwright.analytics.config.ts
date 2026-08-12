import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /analytics-consent\.spec\.ts/,
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4401',
    bypassCSP: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [{
    name: 'chromium',
    use: devices['Desktop Chrome']
  }],
  webServer: [
    {
      command: 'node scripts/e2e-analytics-provider.mjs',
      url: 'http://127.0.0.1:4402/health',
      reuseExistingServer: false,
      timeout: 30_000
    },
    {
      command: 'corepack pnpm exec astro preview --host 127.0.0.1 --port 4401',
      url: 'http://127.0.0.1:4401/',
      reuseExistingServer: false,
      timeout: 120_000
    }
  ]
});
