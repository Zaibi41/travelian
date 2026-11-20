import { expect, test, type Page } from "@playwright/test";
import { gatewayView } from "./support/gateway";

// Announcements is hidden until a real, gateway-stored feature exists: no sidebar item and no
// /admin/announcements page (it shows Not found). ANN_SHOTS=before only takes the before screenshots.

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const BEFORE = process.env.ANN_SHOTS === "before";
const SHOTS = process.env.ANN_SHOTS_DIR;

async function signIn(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (url.port === "8000") return route.fulfill({ status: 404, json: { detail: "Not found." } });
    return ["localhost", "127.0.0.1"].includes(url.hostname) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
}

const shot = async (page: Page, name: string) => {
  if (!SHOTS) return;
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/${BEFORE ? "before" : "after"}-${name}.png` });
};

for (const width of [1440, 390]) {
  test(`Super Admin at ${width}px: no Announcements in the menu or at /admin/announcements`, async ({ page }) => {
    await signIn(page, width);
    await page.goto("/admin/bookings");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (width < 1024) await page.getByRole("button", { name: /menu|sidebar/i }).first().click();
    const cms = page.getByRole("button", { name: /Website & CMS/ }).first();
    if (await cms.count()) await cms.click();
    await expect(page.getByRole("link", { name: "Blog / News" }).first()).toBeVisible();
    await shot(page, `menu-${width}`);
    if (!BEFORE) await expect(page.getByRole("link", { name: "Announcements" })).toHaveCount(0);

    await page.goto("/admin/announcements");
    await page.waitForLoadState("networkidle");
    await shot(page, `page-${width}`);
    if (!BEFORE) await expect(page.getByRole("heading", { name: "Announcements" })).toHaveCount(0);
  });
}
