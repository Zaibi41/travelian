import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #158: on phones every control on the Flights and Group Ticketing results is at least 44px tall and wide (its hit
// area), with at least 8px between Flight Details and WhatsApp (#53). One-way, round trip, long airline names. Intercepted gateway
// answers only. TOUCH_SHOTS_DIR saves screenshots; TOUCH_SHOTS=before only takes them and prints what is too small.

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const BEFORE = process.env.TOUCH_SHOTS === "before";
const SHOTS = process.env.TOUCH_SHOTS_DIR;

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const seg = (n: string, o: string, d: string, dep: string, arr: string) => ({ flight_number: n, origin: o, destination: d, departure_local: dep, arrival_local: arr, duration_minutes: 150 });
const fl = (id: string, code: string, name: string, n: string, o: string, d: string, dep: string, arr: string, prices: number[]) => ({
  id, airline_code: code, airline_name: name, flight_number: n, departure_local: dep, arrival_local: arr, duration_minutes: 150, stops: 0, stop_cities: [],
  segments: [seg(n, o, d, dep, arr)], fares: prices.map((p, i) => ({ id: `${id}-${i}`, name: ["Value", "Flexi", "Extra"][i], baggage: "7+20 kg", selling_price: rs(p) })),
});
const flights = () => ({ search_id: "s-touch", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete", journeys: [
  { direction: "outbound", origin: "LHE", destination: "DXB", flights: [
    fl("o1", "PK", "Pakistan International Airlines", "PK203", "LHE", "DXB", "2026-12-08T03:00", "2026-12-08T05:30", [90_000, 99_000, 120_000]),
    fl("o2", "PA", "Airblue", "PA410", "LHE", "DXB", "2026-12-08T09:00", "2026-12-08T11:30", [70_000]),
  ] },
  { direction: "return", origin: "DXB", destination: "LHE", flights: [
    fl("r1", "PK", "Pakistan International Airlines", "PK204", "DXB", "LHE", "2026-12-15T07:00", "2026-12-15T11:30", [80_000]),
    fl("r2", "PA", "Airblue", "PA411", "DXB", "LHE", "2026-12-15T13:00", "2026-12-15T17:30", [60_000]),
  ] },
] });
const money = { amount_minor: 9_000_000, currency: "PKR" };
const leg = (over: Record<string, unknown>) => ({ direction: "outbound", baggage: "20", hand_carry: "7", baggage_label: "7+20 kg", meal: "No", ...over });
const GROUPS = { data: [
  { id: "g1", sector: "LHE - JED", airline: "Very Long Regional Airline Name International Airways Limited", tickets: [{
    id: "t1", sector: "LHE - JED", airline: "Very Long Regional Airline Name International Airways Limited", flight_number: "PA470", departure_date: "2026-12-28",
    departure_time: "23:00", remaining: 9, selling_price: money, fare_terms: { refund: "Non-refundable" },
    legs: [leg({ flight_number: "PA470", origin: "LHE", destination: "JED", departure_date: "2026-12-28", departure_time: "23:00", arrival_date: "2026-12-29", arrival_time: "03:15" }),
           leg({ direction: "return", flight_number: "PA471", origin: "JED", destination: "LHE", departure_date: "2027-01-12", departure_time: "04:30", arrival_time: "11:35" })] }] },
  { id: "g2", sector: "LHE - DXB", airline: "SV", tickets: [{ id: "t2", sector: "LHE - DXB", airline: "SV", flight_number: "SV739", departure_date: "2026-12-29",
    departure_time: "04:00", remaining: 4, selling_price: money, legs: [leg({ flight_number: "SV739", origin: "LHE", destination: "DXB", departure_date: "2026-12-29", departure_time: "04:00", arrival_time: "07:10" })] }] },
] };

async function mock(page: Page) {
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/public/flights/search") return route.fulfill({ json: flights() });
      if (url.pathname === "/v1/public/group-ticketing/search") return route.fulfill({ json: GROUPS });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
}
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${BEFORE ? "before" : "after"}-${name}.png`, fullPage: false });
};

/** Visible controls in the results area smaller than 44 x 44 (their hit area, including a ::before overlay). */
async function smallTargets(page: Page, scope: string) {
  return page.evaluate((selector) => {
    const root = document.querySelector(selector) ?? document.body;
    const out: string[] = [];
    for (const el of Array.from(root.querySelectorAll<HTMLElement>("button, a[href], [role=button], [role=radio], [role=tab]"))) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).visibility === "hidden" || el.closest("[aria-hidden=true], .sr-only, nav, footer, header, [role=dialog]")) continue;
      if (el.tagName === "A" && el.querySelector("button")) continue; // a link around a button: the button is measured
      const before = getComputedStyle(el, "::before");
      const pseudo = before.content !== "none" && before.position === "absolute";
      const height = pseudo ? Math.max(r.height, parseFloat(before.height) || 0) : r.height;
      const width = pseudo ? Math.max(r.width, parseFloat(before.width) || 0) : r.width;
      if (height < 44 || width < 44) out.push(`${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40)} ${Math.round(width)}x${Math.round(height)}`);
    }
    return out;
  }, scope);
}

for (const width of [390, 360]) {
  for (const trip of [
    { name: "one-way", query: "from=LHE&to=DXB&depart=2026-12-08&trip=oneway&adults=1" },
    { name: "round-trip", query: "from=LHE&to=DXB&depart=2026-12-08&return=2026-12-15&trip=roundtrip&adults=1" },
  ]) {
    test(`flights ${trip.name} ${width}px: every control at least 44px; WhatsApp and Flight Details 8px apart`, async ({ page }) => {
      await page.setViewportSize({ width, height: 860 });
      await mock(page);
      await page.goto(`/flights-search?${trip.query}`);
      await expect(page.getByRole("button", { name: "Flight Details" }).first()).toBeVisible({ timeout: 20_000 });
      await page.getByRole("button", { name: /^Show \d+ more fares?/ }).first().scrollIntoViewIfNeeded();
      await shot(page, `flights-${trip.name}-${width}`);
      const small = await smallTargets(page, "main");
      if (BEFORE) { console.log(`flights ${trip.name} ${width}:`, small); return; }
      expect(small).toEqual([]);
      // #53: WhatsApp is one per flight, beside Flight Details (8px apart); Book stays on each fare row.
      const details = page.getByRole("button", { name: "Flight Details" }).locator("visible=true").first();
      const wa = page.getByRole("link", { name: /on WhatsApp$/ }).locator("visible=true").first();
      const [d, w] = [await details.boundingBox(), await wa.boundingBox()];
      expect(Math.abs(d!.x - (w!.x + w!.width))).toBeGreaterThanOrEqual(8);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    });
  }

  test(`group ticketing ${width}px: every control at least 44px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 860 });
    await mock(page);
    await page.goto("/group-ticketing?from=LHE&to=JED");
    await expect(page.getByRole("button", { name: "Flight Details" }).first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Flight Details" }).first().scrollIntoViewIfNeeded();
    await shot(page, `group-${width}`);
    const small = await smallTargets(page, "main");
    if (BEFORE) { console.log(`group ${width}:`, small); return; }
    expect(small).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}

for (const width of [768, 1440]) {
  test(`${width}px: the results look as before (screenshots only)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mock(page);
    await page.goto("/flights-search?from=LHE&to=DXB&depart=2026-12-08&trip=oneway&adults=1");
    await expect(page.getByRole("button", { name: "Flight Details" }).first()).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(300);
    await shot(page, `flights-${width}`);
    await page.goto("/group-ticketing?from=LHE&to=JED");
    await expect(page.getByRole("button", { name: "Flight Details" }).first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Flight Details" }).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await shot(page, `group-${width}`);
  });
}
