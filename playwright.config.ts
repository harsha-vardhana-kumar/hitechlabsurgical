import { defineConfig } from "@playwright/test";

const apps = [
  { name: "admin", port: 3217 },
  { name: "website", port: 3218 },
  { name: "billing", port: 3219 },
] as const;

export default defineConfig({
  testDir: "./qa",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  workers: 2,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "test-results/report" }],
  ],
  outputDir: "test-results/flows",
  use: {
    actionTimeout: 12_000,
    browserName: "chromium",
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    },
  },
  projects: apps.map(({ name, port }) => ({
    name,
    testDir: `./qa/${name}`,
    use: { baseURL: `http://127.0.0.1:${port}` },
  })),
  webServer: apps.map(({ name, port }) => ({
    command: `npm run start --workspace @hitech/${name}`,
    url: `http://127.0.0.1:${port}/robots.txt`,
    env: { PORT: String(port), NEXT_TELEMETRY_DISABLED: "1" },
    reuseExistingServer: false,
    timeout: 60_000,
  })),
});
