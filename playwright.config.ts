import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests live in ./e2e. Starts real backend (SQLite) + Vite preview.
 * Mock LLM/schema/query via route interception in specs where noted.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "bash scripts/e2e-backend.sh",
      url: "http://127.0.0.1:8000/health",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command:
        "cd frontend && npx vite build && npx vite preview --host 127.0.0.1 --port 4173",
      url: "http://127.0.0.1:4173",
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_BASE_URL: "http://127.0.0.1:8000",
      },
    },
  ],
});
