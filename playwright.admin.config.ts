import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./qa/admin",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  workers: 2,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "test-results/admin-report" }],
  ],
  outputDir: "test-results/admin",
  use: {
    baseURL: "http://127.0.0.1:3217",
    browserName: "chromium",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    acceptDownloads: true,
  },
  webServer: {
    command: "npm run start --workspace @hitech/admin",
    url: "http://127.0.0.1:3217/robots.txt",
    env: { PORT: "3217", NEXT_TELEMETRY_DISABLED: "1" },
    reuseExistingServer: false,
    timeout: 45_000,
  },
});
