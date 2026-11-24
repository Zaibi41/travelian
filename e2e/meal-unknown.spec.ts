import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #154/#198: "Meal" when the fare says one is served; otherwise, missing meal data included, the card says "No Meal" (#198), never
// "Meal info not available". Flight details (the per-flight WhatsApp message of #53 has no meal line and never says "No Meal"). Admin: a missing meal is a dash (like a missing refund), never "No Meal".
// Intercepted gateway responses only. MEAL_SHOTS_DIR saves screenshots; MEAL_SHOTS=before only takes them.

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const BEFORE = process.env.MEAL_SHOTS === "before";
const SHOTS = process.env.MEAL_SHOTS_DIR;

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const seg = (n: string, dep: string, arr: string) => ({ flight_number: n, origin: "LHE", destination: "DXB", departure_local: dep, arrival_local: arr, duration_minutes: 210 });
const flight = (id: string, code: string, name: string, n: string, dep: string, arr: string, fares: object[]) => ({
  id, airline_code: code, airline_name: name, flight_number: n, departure_local: dep, arrival_local: arr, duration_minutes: 210, stops: 0,
  stop_cities: [], segments: [seg(n, dep, arr)], fares,
});
const FLIGHTS = [
  flight("f1", "EK", "Emirates", "EK625", "2026-12-08T03:00", "2026-12-08T05:30", [{ id: "e", name: "Economy Saver", baggage: "7+25 kg", selling_price: rs(120_000) }]),
  flight("f2", "PA", "Airblue", "PA410", "2026-12-08T09:00", "2026-12-08T11:30", [{ id: "a", name: "Value", baggage: "7 kg", meal: "No meal", selling_price: rs(70_000) }]),
  flight("f3", "Z8", "South Air", "Z8266", "2026-12-08T13:00", "2026-12-08T15:30", [{ id: "z", name: "EP", baggage: "7+30 kg", meal: "Snacks", selling_price: rs(90_000) }]),
];
const answer = () => ({ search_id: "s-meal", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete",
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
const visible = (page: Page, airline: string, text: string) => card(page, airline).getByText(text, { exact: true }).locator("visible=true");

for (const width of [360, 390, 768, 1440]) {
  test(`website ${width}px: meal says what the fare says`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mock(page);
    await page.goto("/flights-search?from=LHE&to=DXB&depart=2026-12-08&trip=oneway&adults=1");
    await expect(page.getByRole("button", { name: "Flight Details" }).first()).toBeVisible({ timeout: 20_000 });
    await shot(page, `results-${width}`);
    if (BEFORE) return;
    await expect(visible(page, "Emirates", "No Meal")).toHaveCount(1); // #198: missing meal data is "No Meal"
    await expect(visible(page, "Emirates", "Meal info not available")).toHaveCount(0);
    await expect(visible(page, "Airblue", "No Meal")).toHaveCount(1);
    await expect(visible(page, "South Air", "Meal").first()).toBeVisible(); // "Snacks": a meal is served
    await expect(visible(page, "South Air", "No Meal")).toHaveCount(0);
    await expect(visible(page, "South Air", "Meal info not available")).toHaveCount(0);
    const wa = await card(page, "Emirates").getByRole("link").filter({ hasText: "WhatsApp" }).locator("visible=true").first().getAttribute("href");
    // #53: one WhatsApp message per flight (flight numbers, date, route, cabin, lowest price: no meal line); it never says "No Meal".
    expect(decodeURIComponent(wa!)).not.toContain("No Meal");
    await card(page, "Emirates").getByRole("button", { name: "Flight Details" }).click();
    const dialog = page.getByRole("dialog");
    // #163: Flight Details is the itinerary (fares, meal and price stay on the card); it never says "No Meal" here.
    await expect(dialog.getByRole("heading", { name: /–/ })).toBeVisible();
    await expect(dialog.getByText("No Meal", { exact: true })).toHaveCount(0);
    await shot(page, `details-${width}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}

test("admin search 1440px: a missing meal is a dash, an explicit one as sent", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mock(page);
  await page.addInitScript(() => {
    localStorage.setItem("travelian.session.v1", JSON.stringify({
      email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
      accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
    }));
  });
  await page.goto("/admin/search?tab=flights&from=LHE&to=DXB&date=2026-12-08");
  await expect(page.getByRole("region", { name: "Results" })).toBeVisible({ timeout: 20_000 });
  await shot(page, "admin-results-1440");
  if (BEFORE) return;
  const ek = page.getByRole("article", { name: /EK625$/ });
  await expect(ek).not.toContainText("No Meal");
  await expect(page.getByRole("article", { name: /PA410$/ })).toContainText("No meal");
  await expect(page.getByRole("article", { name: /Z8266$/ })).toContainText("Snacks");
});
