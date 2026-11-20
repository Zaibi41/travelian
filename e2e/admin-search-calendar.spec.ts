import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// Search date fields (Flights departure and return, Group Ticketing departure), as on the public
// site: clicking the field opens the calendar as a centred popup with a title, a close button and
// two months (stacked on phones, scrolling inside); picking a day fills the field; Escape and the
// close button close it; tabbing into the field doesn't open it, so the date can still be typed.
// Local-only session and intercepted gateway answers.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const INVENTORY = { data: [{ id: "g1", sector: "mixed", airline: "Airblue", tickets: [
  { id: "t1", sector: "LHE - JED", departure_date: "2026-11-24", departure_time: "09:45", airline: "Airblue", selling_price: { amount_minor: 9_975_000, currency: "PKR" }, remaining: 9 },
] }] };

async function open(page: Page, width: number, tab: "flights" | "group-ticketing") {
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/group-ticketing/inventory") return route.fulfill({ json: INVENTORY });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
  await page.goto(`/admin/search?tab=${tab}`);
}

for (const width of [1440, 1280, 390]) {
  test(`clicking the departure date opens the calendar popup with two months at ${width}px`, async ({ page }) => {
    await open(page, width, "flights");
    const departure = page.getByLabel("Departure date", { exact: true });
    await departure.click();
    const popup = page.getByRole("dialog", { name: "Select departure date" });
    await expect(popup).toBeVisible();
    await expect(popup.getByRole("grid")).toHaveCount(2);
    const box = (await popup.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y + box.height).toBeLessThanOrEqual(900);
    if (width >= 640) {
      // Side by side on wider screens, as on the public site.
      const [first, second] = await popup.getByRole("grid").evaluateAll(grids => grids.map(grid => grid.getBoundingClientRect().top));
      expect(Math.abs(first - second)).toBeLessThan(2);
    }

    // Picking a day fills the field and closes the popup.
    await popup.getByRole("grid").first().getByRole("gridcell", { name: "26" }).first().click();
    await expect(popup).toBeHidden();
    await expect(departure).toHaveValue(/^26 [A-Z][a-z]{2} \d{4}$/);

    // The close button and Escape close it.
    await departure.click();
    await expect(popup).toBeVisible();
    await popup.getByRole("button", { name: "Close" }).click();
    await expect(popup).toBeHidden();
    await departure.click();
    await page.keyboard.press("Escape");
    await expect(popup).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}

test("tabbing into the field doesn't open the popup, so the date can be typed day first", async ({ page }) => {
  await open(page, 1440, "flights");
  const departure = page.getByLabel("Departure date", { exact: true });
  await departure.focus();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await departure.fill("24/12/2026");
  await departure.press("Enter");
  await expect(departure).toHaveValue("24 Dec 2026");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("return date (round trip) and Group Ticketing's date open the same popup", async ({ page }) => {
  await open(page, 1440, "flights");
  await page.getByRole("radio", { name: "Round-trip" }).click();
  await page.getByLabel("Return date", { exact: true }).click();
  const returnPopup = page.getByRole("dialog", { name: "Select return date" });
  await expect(returnPopup.getByRole("grid")).toHaveCount(2);
  await page.keyboard.press("Escape");

  await open(page, 1440, "group-ticketing");
  await page.getByLabel("Departure Date", { exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Select departure date" }).getByRole("grid")).toHaveCount(2);
});
