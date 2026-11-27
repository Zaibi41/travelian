import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// Round-trip and multi-city on the website and the admin. Intercepted gateway responses only (nothing reaches a real
// gateway or supplier). TRIP_SHOTS_DIR saves screenshots.

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const SHOTS = process.env.TRIP_SHOTS_DIR;

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const fare = (id: string, name: string, rupees: number, request = false) =>
  ({ id, name, baggage: "7+20 kg", baggage_detail: "7 kg hand carry + 20 kg checked", selling_price: rs(rupees), ...(request ? { booking_mode: "request" } : {}) });
const flight = (id: string, code: string, name: string, number: string, origin: string, destination: string, dep: string, arr: string, fares: object[]) => ({
  id, airline_code: code, airline_name: name, flight_number: number, departure_local: dep, arrival_local: arr, duration_minutes: 130, stops: 0, stop_cities: [],
  segments: [{ flight_number: number, origin, destination, departure_local: dep, arrival_local: arr, duration_minutes: 130 }], fares,
});
const base = () => ({ search_id: "s-trip", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete" });
const ROUND = () => ({ ...base(), journeys: [
  { direction: "outbound", origin: "LHE", destination: "KHI", flights: [flight("o1", "PA", "Airblue", "PA401", "LHE", "KHI", "2026-12-15T08:00", "2026-12-15T10:10", [fare("a", "Value", 22_050)])] },
  { direction: "return", origin: "KHI", destination: "LHE", flights: [flight("r1", "PA", "Airblue", "PA402", "KHI", "LHE", "2026-12-20T18:00", "2026-12-20T20:10", [fare("b", "Value", 21_000)])] },
] });
const MULTI = () => ({ ...base(), journeys: [
  { direction: "outbound", leg: 1, origin: "LHE", destination: "KHI", flights: [flight("m1", "PA", "Airblue", "PA401", "LHE", "KHI", "2026-12-15T08:00", "2026-12-15T10:10", [fare("c", "Value", 22_050, true)])] },
  { direction: "outbound", leg: 2, origin: "KHI", destination: "DXB", flights: [flight("m2", "EK", "Emirates Airline With A Very Long Display Name", "EK601", "KHI", "DXB", "2026-12-18T04:00", "2026-12-18T05:40", [fare("d", "Saver", 60_000, true)])] },
  { direction: "outbound", leg: 3, origin: "DXB", destination: "LHE", flights: [flight("m3", "PK", "PIA", "PK204", "DXB", "LHE", "2026-12-22T12:00", "2026-12-22T16:00", [fare("e", "Lite", 45_000, true)])] },
] });

async function mock(page: Page, bodies: unknown[]) {
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname.endsWith("/flights/search")) {
        const body = route.request().postDataJSON();
        bodies.push(body);
        return route.fulfill({ json: body.legs ? MULTI() : ROUND() });
      }
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
}
const signIn = (page: Page) => page.addInitScript(() => {
  localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  }));
});
const shot = async (page: Page, name: string) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); };
const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

const SEGMENTS = JSON.stringify([{ from: "LHE", to: "KHI", date: "2026-12-15" }, { from: "KHI", to: "DXB", date: "2026-12-18" }, { from: "DXB", to: "LHE", date: "2026-12-22" }]);

for (const width of [390, 768, 1440]) {
  test(`website ${width}px: round trip and multi-city search, show every flight and link to checkout with every fare`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const bodies: Record<string, unknown>[] = [];
    await mock(page, bodies);
    await page.goto("/flights-search?from=LHE&to=KHI&depart=2026-12-15&return=2026-12-20&trip=roundtrip&adults=1&children=0&infants=0&cabin=Economy");
    await expect(page.getByRole("button", { name: "Flight Details" }).first()).toBeVisible({ timeout: 20_000 });
    expect(bodies.at(-1)).toMatchObject({ origin: "LHE", destination: "KHI", departure_date: "2026-12-15", return_date: "2026-12-20" });
    await expect(page.getByText("Return", { exact: true }).locator("visible=true").first()).toBeVisible();
    await shot(page, `website-roundtrip-${width}`);
    expect(await noSideScroll(page)).toBe(true);

    await page.goto(`/flights-search?from=LHE&to=KHI&depart=2026-12-15&trip=multicity&segments=${encodeURIComponent(SEGMENTS)}&adults=1&children=0&infants=0&cabin=Economy`);
    await expect(page.getByRole("button", { name: "Flight Details" }).first()).toBeVisible({ timeout: 20_000 });
    expect(bodies.at(-1)).toMatchObject({ legs: [{ origin: "LHE", destination: "KHI", departure_date: "2026-12-15" },
      { origin: "KHI", destination: "DXB", departure_date: "2026-12-18" }, { origin: "DXB", destination: "LHE", departure_date: "2026-12-22" }] });
    await expect(page.getByText("Multi-city search isn't available")).toHaveCount(0);
    for (const label of ["Flight 1", "Flight 2", "Flight 3"]) await expect(page.getByText(label, { exact: true }).locator("visible=true").first()).toBeVisible();
    // 22,050 + 60,000 + 45,000
    await expect(page.getByText(/127,050/).locator("visible=true").first()).toBeVisible();
    const href = await page.locator("a[href*='fareIds=']").first().getAttribute("href");
    expect(new URL(href!, "http://x").searchParams.get("fareIds")).toBe("c,d,e");
    await shot(page, `website-multicity-${width}`);
    expect(await noSideScroll(page)).toBe(true);
  });

  test(`admin ${width}px: round trip and multi-city search, one section per flight, request to book needs every flight`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const bodies: Record<string, unknown>[] = [];
    await mock(page, bodies);
    await signIn(page);
    await page.goto("/admin/search?tab=flights&trip=roundtrip&from=LHE&to=KHI&date=2026-12-15&return=2026-12-20");
    await expect(page.getByRole("heading", { name: "Return · KHI → LHE" })).toBeVisible({ timeout: 20_000 });
    expect(bodies.at(-1)).toMatchObject({ return_date: "2026-12-20" });
    await shot(page, `admin-roundtrip-${width}`);

    await page.goto("/admin/search?tab=flights&from=LHE&to=KHI&date=2026-12-15");
    await page.getByRole("radio", { name: "Multi-city" }).click();
    const second = page.getByRole("group", { name: "Flight 2" });
    await expect(second).toBeVisible();
    await expect(page.getByRole("button", { name: "Search flights" })).toBeDisabled();
    await shot(page, `admin-multicity-form-${width}`);
    expect(await noSideScroll(page)).toBe(true);

    await page.goto("/admin/search?tab=flights&trip=multicity&from=LHE&to=KHI&date=2026-12-15&leg=KHI,DXB,2026-12-18&leg=DXB,LHE,2026-12-22");
    await expect(page.getByRole("heading", { name: "Flight 3 · DXB → LHE" })).toBeVisible({ timeout: 20_000 });
    expect(bodies.at(-1)).toMatchObject({ legs: [{ origin: "LHE", destination: "KHI" }, { origin: "KHI", destination: "DXB" }, { origin: "DXB", destination: "LHE" }] });
    await page.getByRole("button", { name: "Request to book EK601 Saver" }).click();
    const panel = page.getByRole("region", { name: "Selected fare" });
    await expect(panel).toContainText("Flight 2:");
    await expect(panel).toContainText("Flight 1: choose a fare");
    await shot(page, `admin-multicity-results-${width}`);
    expect(await noSideScroll(page)).toBe(true);
  });
}
