import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #39: typing ATH in the airport pickers shows Athens (the city the airport serves), not "Spata-Artemida", on the public
// search (phone picker and desktop dropdown) and the admin search. Nothing reaches a real gateway.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const SHOTS = process.env.SHOTS_DIR;
const TAG = process.env.SHOT_TAG || "after";
const ONLY_SHOTS = process.env.SHOT_ONLY === "1";

async function offline(page: Page) {
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) return route.fulfill({ status: 404, json: { detail: "Not found." } });
    return isLocal(route.request().url()) ? route.continue() : route.fulfill({ json: { items: [], groups: [], results: [] } });
  });
}

async function expectAthens(page: Page, scope: ReturnType<Page["locator"]>) {
  const first = scope.getByRole("option").first();
  await expect(first).toContainText("Athens");
  await expect(first).toContainText("ATH");
  if (!ONLY_SHOTS) await expect(scope.getByText(/Spata/)).toHaveCount(0);
}

test.describe("public phone picker 390px", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test("ATH shows Athens", async ({ page }) => {
    await offline(page);
    await page.goto("/");
    await page.locator(".travelian-search-card").getByRole("combobox", { name: "Destination" }).tap();
    const picker = page.getByRole("dialog", { name: "Where to?" });
    await picker.getByRole("combobox", { name: "Where to?" }).fill("ATH");
    await expect(picker.getByRole("option").first()).toBeVisible();
    await expect(page.getByText(/Loading full airport directory/)).toHaveCount(0, { timeout: 15_000 });
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/public-picker-390-${TAG}.png` });
    if (!ONLY_SHOTS) await expectAthens(page, picker);
  });
});

test("public dropdown 1440px: ATH shows Athens", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await offline(page);
  await page.goto("/");
  const field = page.locator(".travelian-search-card").getByRole("combobox", { name: "Destination" });
  await field.click();
  await field.fill("ATH");
  const list = page.getByRole("listbox").first();
  await expect(list.getByRole("option").first()).toBeVisible();
  await expect(page.getByText(/Loading full airport directory/)).toHaveCount(0, { timeout: 15_000 });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/public-dropdown-1440-${TAG}.png` });
  if (!ONLY_SHOTS) await expectAthens(page, list);
});

for (const width of [390, 1440]) {
  test(`admin search ${width}px: ATH shows Athens`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await offline(page);
    await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
      email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
      accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
    })));
    await page.goto("/admin/bookings/new?tab=flights");
    const to = page.getByRole("combobox", { name: "To" });
    await to.click();
    await to.fill("ATH");
    const list = page.getByRole("listbox").first();
    await expect(list.getByRole("option").first()).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin-${width}-${TAG}.png` });
    if (!ONLY_SHOTS) await expectAthens(page, list);
  });
}
