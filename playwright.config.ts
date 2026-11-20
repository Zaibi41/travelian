import { defineConfig } from "@playwright/test";
import { APP_URL, LOCAL_HOSTS } from "./e2e/support/gateway";

// The app under test: E2E_BASE_URL (default http://localhost:8080), shared with the specs through
// e2e/support/gateway.ts. The dev server is started on that port when nothing answers there yet.
const port = APP_URL.port || (APP_URL.protocol === "https:" ? "443" : "80");
const serverUrl = LOCAL_HOSTS.includes(APP_URL.hostname) ? `${APP_URL.protocol}//127.0.0.1:${port}` : APP_URL.origin;

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  use: {
    baseURL: APP_URL.origin,
    trace: "on-first-retry",
    // Public and admin specs run on the same browser: the system Google Chrome
    // (/usr/bin/google-chrome), not Playwright's own download. PLAYWRIGHT_CHANNEL
    // can still pick another installed channel.
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
  },
  // Screenshot baselines (e2e/visual.spec.ts) live next to the spec, one per name.
  snapshotPathTemplate: "{testDir}/e2e/__screenshots__/{arg}{ext}",
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: serverUrl,
    reuseExistingServer: true,
  },
});
