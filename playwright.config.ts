import { defineConfig, devices } from 'playwright/test';

// GOLDEN-03B: E2E_BASE_URL now controls Playwright's actual navigation
// target (previously only guarded/documented, never wired). Unset stays
// on the prior default — http://localhost:3000, local dev server.
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const usingCustomBaseUrl = Boolean(process.env.E2E_BASE_URL);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Only auto-start the local dev server for the default local baseURL.
  // A custom E2E_BASE_URL (e.g. staging) is assumed to already be running —
  // starting a local server in that case would be pointless and could mask
  // a misconfigured E2E_BASE_URL.
  webServer: usingCustomBaseUrl ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  outputDir: 'test-results/',
});
