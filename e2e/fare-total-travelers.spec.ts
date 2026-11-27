import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #113: a search for several travelers shows the gateway's total for all of them on each fare (website and admin),
// the per-adult price under it, and checkout receives that total. A fare without a gateway total shows the per-adult
// price labelled "per adult". Intercepted gateway responses only. TOTAL_SHOTS_DIR saves screenshots; TOTAL_SHOTS=before
// only takes them (for the page before this change), with no checks.

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const BEFORE = process.env.TOTAL_SHOTS === "before";
const SHOTS = process.env.TOTAL_SHOTS_DIR;

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
// 3 adults, 1 child, 1 infant.
const priced = (id: string, name: string, adult: number, child: number, infant: number) => ({
  id, name, baggage: "7+20 kg", baggage_detail: "7 kg hand carry + 20 kg checked", selling_price: rs(adult),
  total_price: rs(adult * 3 + child + infant),
  passenger_prices: [{ type: "ADT", count: 3, selling_each: rs(adult) }, { type: "CHD", count: 1, selling_each: rs(child) }, { type: "INF", count: 1, selling_each: rs(infant) }],
});
const seg = (n: string, dep: string, arr: string, m: number) => ({ flight_number: n, origin: "LHE", destination: "DXB", departure_local: dep, arrival_local: arr, duration_minutes: m });
const FLIGHTS = [
  { id: "f1", airline_code: "PA", airline_name: "Airblue", flight_number: "PA410", departure_local: "2026-12-15T03:00", arrival_local: "2026-12-15T05:30",
    duration_minutes: 210, stops: 0, stop_cities: [], segments: [seg("PA410", "2026-12-15T03:00", "2026-12-15T05:30", 210)],
    fares: [priced("a", "Value", 79_392, 60_000, 12_000), priced("b", "Flexi", 85_000, 64_000, 12_500)] },
  // Southair live: only the adult price, so no total.
  { id: "f2", airline_code: "Z8", airline_name: "South Air", flight_number: "Z8266", departure_local: "2026-12-15T09:00", arrival_local: "2026-12-15T11:30",
    duration_minutes: 210, stops: 0, stop_cities: [], segments: [seg("Z8266", "2026-12-15T09:00", "2026-12-15T11:30", 210)],
    fares: [{ id: "z", name: "EV", baggage: "7+20 kg", selling_price: rs(90_000) }] },
];
const answer = () => ({ search_id: "s-total", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete",
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
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${BEFORE ? "before" : "after"}-${name}.png`, fullPage: false });
};
const card = (page: Page, airline: string) => page.locator("main .shadow-card").filter({ has: page.getByRole("button", { name: airline, exact: true }) }).first();
const QUERY = "from=LHE&to=DXB&depart=2026-12-15&trip=oneway&adults=3&children=1&infants=1";

for (const width of [390, 768, 1440]) {
  test(`website ${width}px: total for 5 travelers on each fare, per adult under it; checkout gets the total`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mock(page);
    await page.goto(`/flights-search?${QUERY}`);
    await expect(page.getByRole("button", { name: "Flight Details" }).first()).toBeVisible({ timeout: 20_000 });
    await shot(page, `results-${width}`);
    if (BEFORE) return;
    const airblue = card(page, "Airblue");
    // 3 x 79,392 + 60,000 + 12,000 = 310,176
    await expect(airblue.getByText("PKR 310,176", { exact: true }).locator("visible=true")).toHaveCount(1);
    await expect(airblue.getByText("total for 5 travelers", { exact: true }).locator("visible=true")).toHaveCount(1);
    await expect(airblue.getByText("PKR 79,392 per adult", { exact: true }).locator("visible=true")).toHaveCount(1);
    const southAir = card(page, "South Air");
    await expect(southAir.getByText("PKR 90,000", { exact: true }).locator("visible=true")).toHaveCount(1);
    await expect(southAir.getByText("per adult", { exact: true }).locator("visible=true")).toHaveCount(1);
    await expect(southAir).not.toContainText("total for");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);

    // Book carries the gateway total to checkout, which shows it as the total.
    const book = airblue.getByRole("link").filter({ hasText: "Book" }).locator("visible=true").first();
    const href = await book.getAttribute("href");
    expect(new URL(href!, "http://x").searchParams.get("total")).toBe("310176");
    expect(new URL(href!, "http://x").searchParams.get("price")).toBe("79392");

    // Flight details (#163): the itinerary.
    await airblue.getByRole("button", { name: "Flight Details" }).click();
    const dialog = page.getByRole("dialog");
    // #163: Flight Details is the itinerary only; the total stays on the card's fare rows (no per-adult price there either).
    await expect(dialog.getByRole("heading", { name: /–/ })).toBeVisible();
    await expect(dialog).not.toContainText("PKR 79,392");
    await shot(page, `details-${width}`);
  });
}

test("website 390px: one traveler shows the price as before (no total line)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await mock(page);
  await page.goto("/flights-search?from=LHE&to=DXB&depart=2026-12-15&trip=oneway&adults=1");
  await expect(page.getByRole("button", { name: "Flight Details" }).first()).toBeVisible({ timeout: 20_000 });
  await shot(page, "results-one-traveler-390");
  if (BEFORE) return;
  await expect(page.locator("main")).not.toContainText("total for");
  await expect(page.locator("main")).not.toContainText("per adult");
});

for (const width of [390, 1440]) {
  test(`admin search ${width}px: total for 5 travelers, no "per adult" wording (#80)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mock(page);
    await page.addInitScript(() => {
      localStorage.setItem("travelian.session.v1", JSON.stringify({
        email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
        accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
      }));
    });
    await page.goto("/admin/bookings/new?tab=flights&from=LHE&to=DXB&date=2026-12-15&adults=3&children=1&infants=1");
    await expect(page.getByRole("region", { name: "Results" })).toBeVisible({ timeout: 20_000 });
    await shot(page, `admin-results-${width}`);
    if (BEFORE) return;
    const pa = page.getByRole("article", { name: /PA410$/ });
    await expect(pa.getByText("Rs 310,176", { exact: true })).toBeVisible();
    await expect(pa.getByText("total for 5 travelers", { exact: true })).toHaveCount(2); // both fares
    await expect(page.getByRole("region", { name: "Results" })).not.toContainText(/per adult/i);
    const z8 = page.getByRole("article", { name: /Z8266$/ });
    await expect(z8.getByText("Rs 90,000", { exact: true })).toBeVisible();
    await expect(z8).not.toContainText("total for");
  });
}
