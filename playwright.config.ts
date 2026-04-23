import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    trace: "off",
  },
  webServer: {
    command: "npm run preview:e2e",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
  },
});
