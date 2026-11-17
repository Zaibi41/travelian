import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
    // Public and admin specs run on the same browser: the system Google Chrome
    // (/usr/bin/google-chrome), not Playwright's own download. PLAYWRIGHT_CHANNEL
    // can still pick another installed channel.
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
  },
  // Screenshot baselines (e2e/visual.spec.ts) live next to the spec, one per name.
  snapshotPathTemplate: "{testDir}/e2e/__screenshots__/{arg}{ext}",
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: true,
  },
});
