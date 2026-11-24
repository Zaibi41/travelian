import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #194: on a phone the flight card's time row was lopsided: the departure column took a fixed 7.5rem, the arrival
// column was pushed to the card's edge, and the middle (duration, line, stops) was squeezed until the stop cities
// wrapped onto two lines. The time row is now three balanced columns (departure left, arrival right-aligned, the line
// between them getting the rest) and the stop cities stay on one line with an ellipsis. Intercepted gateway answers
// only. 2-stop with long stop cities, 1-stop, non-stop, long airline name, round trip; 320, 360, 390, 768, 1024, 1440.
// M194_SHOTS_DIR saves screenshots.

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const SHOTS = process.env.M194_SHOTS_DIR;
const TAG = process.env.M194_TAG || "after";

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const seg = (n: string, o: string, d: string, dep: string, arr: string, m: number, layover?: number) =>
  ({ flight_number: n, origin: o, destination: d, departure_local: dep, arrival_local: arr, duration_minutes: m, ...(layover ? { layover_minutes: layover } : {}) });
const fares = (id: string, prices: number[]) => prices.map((p, i) => ({ id: `${id}-${i}`, name: ["Eco Fly", "Extra Fly", "Prime Fly", "Business"][i], baggage: "7+20 kg", selling_price: rs(p) }));
const TK = { id: "o1", airline_code: "TK", airline_name: "Turkish Airlines", flight_number: "TK715 / TK1979", departure_local: "2026-12-08T15:10",
  arrival_local: "2026-12-09T14:15", duration_minutes: 1685, stops: 2, stop_cities: ["BAH", "IST"],
  segments: [seg("GF767", "LHE", "BAH", "2026-12-08T15:10", "2026-12-08T17:30", 260), seg("TK785", "BAH", "IST", "2026-12-08T23:30", "2026-12-09T04:00", 270, 360),
    seg("TK1979", "IST", "LHR", "2026-12-09T11:00", "2026-12-09T14:15", 255, 420)],
  fares: fares("o1", [496_150, 520_000, 610_000, 900_000]) };
const QR = { id: "o2", airline_code: "QR", airline_name: "Qatar Airways", flight_number: "QR629 / QR3", departure_local: "2026-12-08T04:10",
  arrival_local: "2026-12-08T13:00", duration_minutes: 830, stops: 1, stop_cities: ["DOH"],
  segments: [seg("QR629", "LHE", "DOH", "2026-12-08T04:10", "2026-12-08T06:00", 230), seg("QR3", "DOH", "LHR", "2026-12-08T08:00", "2026-12-08T13:00", 480, 120)],
  fares: fares("o2", [310_000]) };
const PK = { id: "o3", airline_code: "PK", airline_name: "Pakistan International Airlines", flight_number: "PK757", departure_local: "2026-12-08T09:00",
  arrival_local: "2026-12-08T14:00", duration_minutes: 540, stops: 0, stop_cities: [], segments: [seg("PK757", "LHE", "LHR", "2026-12-08T09:00", "2026-12-08T14:00", 540)],
  fares: fares("o3", [280_000, 300_000]) };
const BACK = { id: "r1", airline_code: "PK", airline_name: "Pakistan International Airlines", flight_number: "PK758", departure_local: "2026-12-15T16:00",
  arrival_local: "2026-12-16T05:00", duration_minutes: 480, stops: 0, stop_cities: [], segments: [seg("PK758", "LHR", "LHE", "2026-12-15T16:00", "2026-12-16T05:00", 480)],
  fares: fares("r1", [250_000]) };
const answer = (round: boolean) => ({ search_id: "s-194", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete",
  journeys: [{ direction: "outbound", origin: "LHE", destination: "LHR", flights: [TK, QR, PK] },
             ...(round ? [{ direction: "return", origin: "LHR", destination: "LHE", flights: [BACK] }] : [])] });

async function open(page: Page, width: number, round = false) {
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/public/flights/search") return route.fulfill({ json: answer(round) });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.goto(round ? "/flights-search?from=LHE&to=LHR&depart=2026-12-08&return=2026-12-15&trip=roundtrip&adults=1"
    : "/flights-search?from=LHE&to=LHR&depart=2026-12-08&trip=oneway&adults=1&sort=cheapest");
  await expect(page.getByRole("button", { name: "Flight Details" }).first()).toBeVisible({ timeout: 20_000 });
}
const card = (page: Page, airline: string) => page.locator("main .shadow-card").filter({ has: page.getByRole("button", { name: airline, exact: true }) }).first();
const shotCard = async (page: Page, airline: string, name: string) => {
  if (SHOTS) await card(page, airline).screenshot({ path: `${SHOTS}/${TAG}-${name}.png` });
};
/** The visible time row of a card: departure, middle, arrival boxes. */
async function timeRow(page: Page, airline: string) {
  return card(page, airline).evaluate((el) => {
    const row = [...el.querySelectorAll<HTMLElement>("[data-testid='flight-time-row']")].find((r) => r.offsetParent !== null);
    if (!row) return null;
    const [dep, mid, arr] = [...row.children].map((c) => c.getBoundingClientRect());
    const stops = row.querySelector<HTMLElement>("[data-testid='stop-places']");
    const lineHeight = stops ? parseFloat(getComputedStyle(stops).lineHeight) : 0;
    const content = el.querySelector(".p-4, .sm\\:p-5")!.getBoundingClientRect();
    return { dep, mid, arr, rowRight: row.getBoundingClientRect().right, contentRight: content.right - 16,
      stopsHeight: stops?.getBoundingClientRect().height ?? 0, lineHeight };
  });
}

for (const width of [320, 360, 390, 768]) {
  test(`one-way ${width}px: balanced time row, stop cities on one line`, async ({ page }) => {
    await open(page, width);
    for (const airline of ["Turkish Airlines", "Qatar Airways", "PIA"]) await shotCard(page, airline, `${airline.split(" ")[0]}-${width}`);
    for (const airline of ["Turkish Airlines", "Qatar Airways", "PIA"]) {
      const r = (await timeRow(page, airline))!;
      expect(r).not.toBeNull();
      // Arrival ends at the row's right edge; the middle sits between the two with room for the line.
      expect(Math.abs(r.arr.right - r.rowRight)).toBeLessThan(2);
      expect(r.mid.left).toBeGreaterThanOrEqual(r.dep.right - 1);
      expect(r.arr.left).toBeGreaterThanOrEqual(r.mid.right - 1);
      expect(r.mid.width).toBeGreaterThanOrEqual(64);
      if (r.lineHeight) expect(r.stopsHeight).toBeLessThanOrEqual(r.lineHeight + 1); // one line, not two
    }
    await expect(card(page, "Turkish Airlines").getByText("2 Stops").locator("visible=true")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}

for (const width of [1024, 1440]) {
  test(`one-way ${width}px: wide layout unchanged, no overflow`, async ({ page }) => {
    await open(page, width);
    await shotCard(page, "Turkish Airlines", `Turkish-${width}`);
    await expect(card(page, "Turkish Airlines").getByText("2 Stops").locator("visible=true")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}

for (const width of [360, 390]) {
  test(`round trip ${width}px: both legs shown, no overflow`, async ({ page }) => {
    await open(page, width, true);
    await shotCard(page, "PIA", `roundtrip-${width}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}
