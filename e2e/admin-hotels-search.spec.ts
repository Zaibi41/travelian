import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";
import { docsShot } from "./support/docs-shot";

// Admin Search > Hotels layout. Nothing reaches a real gateway or supplier: a local-only session (no real
// token) and intercepted gateway responses shaped like the gateway's output. HOTELS_VIEW_JSON can point at a
// saved gateway answer to render real supplier data instead (local checks only).

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const usd = (cents: number) => ({ amount_minor: cents, currency: "USD" });
const rate = (id: string, total: number, cancellation: string, extra: Record<string, unknown> = {}) => ({
  id, room_type: "Junior Suite (smoking, bed type is subject to availability)", board: "Room only", nights: 2, cancellation,
  total: usd(total), per_night: usd(total / 2), ...(cancellation === "free_until" ? { free_cancellation_until: "2026-12-16T00:00:00" } : {}), ...extra,
});

const ADMIN_VIEW = {
  search_id: "s-e2e", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete", destination: "Dubai",
  providers: [{ name: "RateHawk", status: "responded" }],
  hotels: [
    { id: "h1", name: "Samaya Hotel", star_rating: 1, city: "Dubai", source: "RateHawk", rates: [rate("r1", 3200, "non_refundable")] },
    { id: "h2", name: "LUX - Opulent Island Suite Burj Khalifa View, Palm Jumeirah Azure Residence With Private Beach Access 1", city: "Dubai",
      address: "The Palm Jumeirah Azure Residence, Palm Jumeirah, Dubai, United Arab Emirates", source: "RateHawk",
      rates: [rate("r2", 9600, "free_until", { board: "All inclusive" })] },
    { id: "h3", name: "Grand Four", star_rating: 5, city: "Dubai", source: "RateHawk", rates: [rate("r3", 1_234_567, "charges_apply", { board: "Breakfast" })] },
  ],
};

const VIEW = process.env.HOTELS_VIEW_JSON ? { ...JSON.parse(readFileSync(process.env.HOTELS_VIEW_JSON, "utf8")), expires_at: ADMIN_VIEW.expires_at } : ADMIN_VIEW;
const DESTINATIONS = { destinations: [
  { kind: "region", id: 6053839, name: "Dubai", region_type: "RT_CITY", country_code: "AE" },
  { kind: "hotel", id: 10591202, name: "LUX - The Modern Dubai Marina Suite 1 With A Long Supplier Name For Testing" },
] };

async function openHotels(page: Page, width: number, query = "dest=Dubai&dk=region&did=6053839&in=2099-01-10&out=2099-01-12") {
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/hotels/search") return route.fulfill({ json: VIEW });
      if (url.pathname === "/v1/hotels/destinations") return route.fulfill({ json: DESTINATIONS });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => {
    localStorage.setItem("travelian.session.v1", JSON.stringify({
      email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
      accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
    }));
  });
  await page.goto(`/admin/search?tab=hotels${query ? `&${query}` : ""}`);
}

const noPageScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function insideViewport(page: Page, selector: string, width: number) {
  const box = await page.locator(selector).last().boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(width);
}

for (const width of [1440, 1280, 1024, 768, 390]) {
  test(`admin hotels: results with long names, no horizontal page scroll at ${width}px`, async ({ page }) => {
    await openHotels(page, width);
    const results = page.getByRole("region", { name: "Results" });
    await expect(results.getByText(VIEW.hotels[0].name, { exact: true })).toBeVisible();
    expect(await noPageScroll(page)).toBe(0);
    await docsShot(page, `admin-search-hotels-${width}`);
  });

  test(`admin hotels: Guests and Destination dropdowns open on screen at ${width}px`, async ({ page }) => {
    await openHotels(page, width, "");
    await page.getByRole("button", { name: "Guests and rooms" }).click();
    await page.getByRole("button", { name: "More children" }).click();
    await expect(page.getByRole("combobox", { name: "Child 1 age" })).toBeVisible();
    await insideViewport(page, "[data-radix-popper-content-wrapper]", width);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Done" })).toBeHidden();

    await page.getByRole("combobox", { name: "Destination" }).fill("Dub");
    await expect(page.getByRole("option", { name: /Dubai/ }).first()).toBeVisible();
    await insideViewport(page, "[data-radix-popper-content-wrapper]", width);
    await page.getByRole("option", { name: /Dubai/ }).first().click();
    await expect(page.getByRole("combobox", { name: "Destination" })).toHaveValue("Dubai");
    expect(await noPageScroll(page)).toBe(0);
  });
}
