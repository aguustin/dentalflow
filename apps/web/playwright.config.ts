import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end smoke test of the web against a real API.
 * Starts its own API (port 3100, test database, recreated on each run) and web (port 5180),
 * so it never touches the dev servers (3000/5173) or the dev database.
 * Requires Postgres running: `pnpm --filter @dentalflow/api db:test:up`.
 */
const API_PORT = 3100
const WEB_PORT = 5180
const DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? 'postgresql://dentalflow:dentalflow_secret@localhost:5434/dentalflow_test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Reset test DB (migrations + seed) and start the API
      command: 'npx prisma migrate reset --force --skip-generate && npx nest start',
      cwd: '../api',
      url: `http://localhost:${API_PORT}/docs`,
      env: {
        DATABASE_URL,
        API_PORT: String(API_PORT),
        JWT_ACCESS_SECRET: 'e2e-access-secret',
        JWT_REFRESH_SECRET: 'e2e-refresh-secret',
      },
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      env: { VITE_API_URL: `http://localhost:${API_PORT}` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
