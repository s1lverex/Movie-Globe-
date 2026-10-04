import { defineConfig, devices } from '@playwright/test';

const executablePath =
  process.env.CHROMIUM_PATH || (process.env.CI ? undefined : '/opt/pw-browsers/chromium');

// Set PLAYWRIGHT_BASE_URL (e.g. https://travel-globe-32r.pages.dev) to smoke-test a live deployment.
const live = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: live ?? 'http://127.0.0.1:4173',
    launchOptions: {
      executablePath,
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } } },
  ],
  webServer: live
    ? undefined
    : {
        // Real stack: static build + Pages Functions + local D1 (SQLite) via wrangler.
        command: 'npm run preview:full',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
        env: { WRANGLER_SEND_METRICS: 'false' },
      },
});
