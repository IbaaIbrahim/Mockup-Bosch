import { defineConfig, devices } from '@playwright/test';

/**
 * Acceptance-gate tests (docs/09-SCOPE-CONFERENCE-DEMO.md §5, C1–C16).
 * Single worker: several gates (C5/C8/C9) depend on rack occupancy state,
 * and every test resets the database to the deterministic seed first
 * (see tests/e2e/fixtures.ts) rather than relying on parallel isolation.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
    env: { DEMO_DB_PATH: './data/demo.sqlite' },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
