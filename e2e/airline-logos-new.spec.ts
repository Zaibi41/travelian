import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #164 British Airways, #97 SriLankan, #136 Centrum Air, and AirSial (was a near-empty box at phone size): the logo
// from the shared manifest (public/airline-logos/index.json) on the public and admin results, never an empty box.
// Made-up gateway answers; nothing reaches a real gateway or supplier. SHOTS_DIR + SHOT_TAG: screenshots too.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

const SHOTS = process.env.SHOTS_DIR;
const TAG = process.env.SHOT_TAG || "after";
const ONLY_SHOTS = process.env.SHOT_ONLY === "1";
const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const fare = (id: string, price: number) => ({ id, name: "Economy", selling_price: rs(price), supplier: "sooperfare", supplier_cost: rs(price - 900), booking_mode: "hold", baggage: "7+20 kg" });
const flight = (id: string, code: string, name: string, number: string, price: number) => ({
  id, airline_code: code, airline_name: name, flight_number: number, departure_local: "2026-12-15T12:10", arrival_local: "2026-12-15T14:55",
  duration_minutes: 225, stops: 0, stop_cities: [],
  segments: [{ flight_number: number, origin: "LHE", destination: "DXB", departure_local: "2026-12-15T12:10", arrival_local: "2026-12-15T14:55", duration_minutes: 225 }],
  fares: [fare(`${id}-f`, price)],
});
const FLIGHTS = [
  flight("f1", "PF", "AirSial", "PF786", 79_405),
  flight("f2", "BA", "British Airways", "BA260", 81_000),
  flight("f3", "UL", "SriLankan Airlines", "UL184", 82_000),
  flight("f4", "C6", "Centrum Air", "C6512", 83_000),
];
const EXPECTED = [["AirSial", "/airline-logos/airsial-mark.png"], ["British Airways", "/airline-logos/british-airways.png"],
  ["SriLankan Airlines", "/airline-logos/srilankan-airlines.png"], ["Centrum Air", "/airline-logos/centrum-air.png"]] as const;
const answer = () => ({ search_id: "s-logos", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete",
  providers: [{ name: "sooperfare", status: "responded" }],
  journeys: [{ direction: "outbound", origin: "LHE", destination: "DXB", flights: FLIGHTS }] });

async function mock(page: Page) {
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/public/flights/search" || url.pathname === "/v1/live-ticketing/flights/search") return route.fulfill({ json: answer() });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
}

async function expectLogos(page: Page) {
  for (const [airline, src] of EXPECTED) {
    const logo = page.getByAltText(`${airline} logo`).first();
    await expect(logo).toHaveAttribute("src", src);
    await expect.poll(() => logo.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    // Square marks: drawn at least 28px tall in the logo box (the old wide AirSial file drew about 7px).
    const box = await logo.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(28);
  }
}

for (const width of [390, 1440]) {
  test(`public results show the new logos at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mock(page);
    await page.goto("/flights-search?from=LHE&to=DXB&depart=2026-12-15&adults=1&children=0&infants=0&cabin=Economy&trip=oneway&currency=PKR");
    await expect(page.getByRole("button", { name: "Flight Details" }).first()).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(600);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/public-results-${width}-${TAG}.png`, fullPage: width === 1440 ? false : true });
    if (!ONLY_SHOTS) await expectLogos(page);
  });

  test(`admin results show the new logos at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mock(page);
    await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
      email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
      accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
    })));
    await page.goto("/admin/bookings/new?tab=flights&from=LHE&to=DXB&date=2026-12-15");
    await expect(page.getByRole("region", { name: "Results" })).toBeVisible();
    await expect(page.getByText("PF786").first()).toBeVisible();
    await page.waitForTimeout(600);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin-results-${width}-${TAG}.png`, fullPage: true });
    if (ONLY_SHOTS) return;
    for (const [airline, src] of EXPECTED) {
      const logo = page.getByRole("region", { name: "Results" }).locator(`img[src="${src}"]`).first();
      await expect(logo, airline).toBeVisible();
      await expect.poll(() => logo.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    }
  });
}
