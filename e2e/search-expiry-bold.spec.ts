import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #35: the search-results expiry time ("Expires in 14:59") is bold. Intercepted gateway responses only.
// EXPIRY_SHOTS_DIR saves screenshots; EXPIRY_SHOTS=before only takes them (page before the change), with no checks.

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const BEFORE = process.env.EXPIRY_SHOTS === "before";
const SHOTS = process.env.EXPIRY_SHOTS_DIR;

const SEARCH = {
  search_id: "s-expiry", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete",
  journeys: [{ direction: "outbound", origin: "LHE", destination: "KHI", flights: [
    { id: "f1", airline_code: "PA", airline_name: "Airblue", flight_number: "PA401", departure_local: "2026-12-10T08:00",
      arrival_local: "2026-12-10T09:55", duration_minutes: 115, stops: 0, stop_cities: [],
      fares: [{ id: "a", name: "Value", baggage: "7 kg", baggage_detail: "7 kg hand carry only, no checked bag", selling_price: { amount_minor: 1_450_000, currency: "PKR" } }] },
  ] }],
};

async function mock(page: Page) {
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/public/flights/search") return route.fulfill({ json: SEARCH });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
}

for (const width of [1440, 390]) {
  test(`search results: the expiry time is bold at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 600 ? 860 : 900 });
    await mock(page);
    await page.goto("/flights-search?from=LHE&to=KHI&depart=2026-12-10&trip=oneway&adults=1");
    const timer = page.getByRole("timer", { name: "Search expiry" });
    await expect(timer).toContainText(/Expires in \d+:\d\d/, { timeout: 20_000 });
    if (SHOTS) await timer.screenshot({ path: `${SHOTS}/${BEFORE ? "before" : "after"}-expiry-badge-${width}.png` });
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${BEFORE ? "before" : "after"}-results-top-${width}.png` });
    if (BEFORE) return;
    const time = timer.getByText(/^\d+:\d\d$/);
    await expect(time).toBeVisible();
    const weight = Number(await time.evaluate(element => getComputedStyle(element).fontWeight));
    expect(weight).toBeGreaterThanOrEqual(700);
    // "Expires in" itself keeps the badge's weight; only the time stands out.
    const badgeWeight = Number(await timer.evaluate(element => getComputedStyle(element).fontWeight));
    expect(weight).toBeGreaterThan(badgeWeight);
  });
}
