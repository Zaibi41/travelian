import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";
import { docsShot } from "./support/docs-shot";

// Agency flight search (/admin/flights-search, #130). An agency owner searches through the signed-in gateway route
// (/v1/live-ticketing/flights/search), which leaves supplier fields out for agency roles. Nothing reaches a real
// gateway, supplier or the legacy API: a local-only session (no real token) and intercepted responses.

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

const LEGACY_API = new URL(process.env.VITE_TRAVELIAN_API_BASE_URL?.trim() || "https://api.travelian.pk");
const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });

// What the gateway returns to an agency owner: opaque IDs and selling prices only.
const SEARCH = {
  search_id: "s-agency", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete",
  journeys: [{
    direction: "outbound", origin: "KHI", destination: "LHE",
    flights: [
      { id: "f1", airline_code: "PA", airline_name: "Airblue", flight_number: "PA400", departure_local: "2026-12-10T08:00",
        arrival_local: "2026-12-10T10:00", duration_minutes: 120, stops: 0, stop_cities: [],
        fares: [{ id: "a", name: "Value", baggage: "7+20 kg", baggage_detail: "7 kg hand carry + 20 kg checked", selling_price: rs(22_511) },
                { id: "b", name: "Xtra", baggage: "7+30 kg", selling_price: rs(25_050) }] },
      { id: "f2", airline_code: "Z8", airline_name: "South Air International Regional Airways Limited", flight_number: "Z8266",
        departure_local: "2026-12-10T18:10", arrival_local: "2026-12-10T21:40", duration_minutes: 210, stops: 1, stop_cities: ["ISB"],
        fares: [{ id: "c", name: "EB", selling_price: rs(19_997) }] },
    ],
  }],
};

// What the legacy API used to send: supplier names, supplier airline IDs and CDN logos. The page must never ask for it.
const LEGACY = { searchId: "legacy", providerStatus: { sooperfare: "ok", AIRSIALAPI: "ok" }, results: [{
  provider: "sooperfare", offerId: "FLYJINNAHONEAPI-1", airline: "Fly Jinnah", airlineImage: "https://cdn.sooperfare.com/assets/9P.png",
  flightNumber: "9P848", origin: "KHI", destination: "LHE", departureTime: "2026-12-10 19:00", arrivalTime: "2026-12-10 21:00", cabin: "Economy",
  price: { currency: "PKR", total: 18_000 } }] };
const SUPPLIER_TEXT = /sooperfare|southair|AIRSIALAPI|FLYJINNAHONEAPI|ONEAPI|supplier/i;

async function openAgencySearch(page: Page, width: number, query = "from=KHI&to=LHE&depart=2026-12-10&adults=1") {
  const calls: { url: URL; auth: string | null }[] = [];
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const raw = route.request().url();
    const url = gatewayView(raw);
    calls.push({ url, auth: route.request().headers().authorization ?? null });
    if (isGateway(url)) {
      // Before #130 the page used the public route: answered the same, so a "before" render shows the same results.
      if (["/v1/live-ticketing/flights/search", "/v1/public/flights/search"].includes(url.pathname)) return route.fulfill({ json: SEARCH });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    if (url.host === LEGACY_API.host && !url.pathname.startsWith("/v1/")) return route.fulfill({ json: { result: LEGACY, ...LEGACY } });
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => {
    localStorage.setItem("travelian.session.v1", JSON.stringify({
      email: "agency-test@travelian.com", groups: ["agency_owner"], name: "Agency Test", createdAt: new Date().toISOString(),
      accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
    }));
  });
  await page.goto(`/admin/flights-search?${query}`);
  await expect(page.getByRole("button", { name: "Airblue", exact: true })).toBeVisible({ timeout: 15_000 });
  return calls;
}

for (const width of [1440, 1024, 768, 390]) {
  test(`agency flight search uses the signed-in gateway route, never the legacy API, at ${width}px`, async ({ page }) => {
    const calls = await openAgencySearch(page, width);
    await docsShot(page, `agency-flights-search-${width}`);

    const legacy = calls.filter(({ url }) => url.host === LEGACY_API.host && !url.pathname.startsWith("/v1/"));
    expect(legacy.map(({ url }) => url.pathname)).toEqual([]);
    const searches = calls.filter(({ url }) => isGateway(url) && url.pathname.endsWith("/flights/search"));
    expect(searches.map(({ url }) => url.pathname)).toEqual(["/v1/live-ticketing/flights/search"]);
    expect(searches[0].auth).toBe("Bearer local-test-only");

    await expect(page.getByRole("button", { name: "South Air International Regional Airways Limited" })).toBeVisible();
    expect(await page.locator("body").innerText()).not.toMatch(SUPPLIER_TEXT);
    expect(await page.content()).not.toMatch(/sooperfare|AIRSIALAPI|FLYJINNAHONEAPI|cdn\.sooperfare/i);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}

test("agency round trip request goes to the signed-in route with the return date", async ({ page }) => {
  const requests: { path: string; body: unknown }[] = [];
  page.on("request", request => {
    const url = gatewayView(request.url());
    if (isGateway(url) && url.pathname.endsWith("/flights/search")) requests.push({ path: url.pathname, body: request.postDataJSON() });
  });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) return route.fulfill({ json: { ...SEARCH, journeys: [] } });
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => {
    localStorage.setItem("travelian.session.v1", JSON.stringify({
      email: "agency-test@travelian.com", groups: ["agency_owner"], name: "Agency Test", createdAt: new Date().toISOString(),
      accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
    }));
  });
  await page.goto("/admin/flights-search?from=KHI&to=LHE&depart=2026-12-10&return=2026-12-15&trip=roundtrip&adults=2");
  await expect.poll(() => requests.length, { timeout: 15_000 }).toBeGreaterThan(0);
  expect(requests[0]).toMatchObject({ path: "/v1/live-ticketing/flights/search",
    body: { origin: "KHI", destination: "LHE", departure_date: "2026-12-10", return_date: "2026-12-15", adults: 2 } });
});
