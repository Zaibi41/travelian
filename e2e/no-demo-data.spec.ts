import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #73: no made-up numbers or demo text in the admin: no demo announcement ticker in the top bar, no agency wallet
// balance (it was always Rs 0). DEMO_SHOTS=before only takes the before screenshots.

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const BEFORE = process.env.DEMO_SHOTS === "before";
const SHOTS = process.env.DEMO_SHOTS_DIR;

async function open(page: Page, path: string, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) return route.fulfill({ status: 404, json: { detail: "Not found." } });
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", groups: ["admin"], name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

const shot = async (page: Page, name: string) => {
  if (!SHOTS) return;
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/${BEFORE ? "before" : "after"}-${name}.png` });
};

for (const width of [1440, 390]) {
  test(`top bar at ${width}px: no demo announcements`, async ({ page }) => {
    await open(page, "/admin/bookings", width);
    await shot(page, `topbar-${width}`);
    if (BEFORE) return;
    await expect(page.getByRole("region", { name: "Announcements" })).toHaveCount(0);
    await expect(page.locator("header")).not.toContainText("Demo:");
  });

  test(`Agency Management at ${width}px: no wallet balance on the card or in the details`, async ({ page }) => {
    await open(page, "/admin/agencies", width);
    await page.getByRole("button", { name: "Add Agency" }).click();
    const form = page.getByRole("dialog");
    const inputs = form.locator("input");
    await inputs.nth(0).fill("Long Name Travel & Tours International (Private) Limited");
    await inputs.nth(2).fill("test-agency@travelian.invalid");
    await form.getByRole("button", { name: "Create Agency" }).click();
    await expect(page.getByText("Long Name Travel & Tours International (Private) Limited").first()).toBeVisible();
    await shot(page, `agency-card-${width}`);
    if (!BEFORE) await expect(page.locator("main")).not.toContainText(/Rs\s?\d/);
    await page.locator("main [aria-haspopup='menu']").first().click(); // the card's actions menu
    await page.getByRole("menuitem", { name: "View Details" }).click();
    await expect(page.getByRole("dialog")).toContainText("Commission");
    await shot(page, `agency-details-${width}`);
    if (!BEFORE) await expect(page.getByRole("dialog")).not.toContainText(/Wallet|Rs\s?\d/);
    await page.keyboard.press("Escape");
    if (!BEFORE) expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}

test("the old device-only announcements are cleared and never shown (#73); the page now uses the gateway (#92)", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("travelian.admin.announcements.v1", JSON.stringify([{ id: "x", message: "Old", createdAt: "2026-01-01" }])));
  await open(page, "/admin/bookings", 1440);
  await expect(page.getByRole("region", { name: "Announcements" })).toHaveCount(0);
  await expect(page.getByText("Old", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("travelian.admin.announcements.v1"))).toBeNull();
});
