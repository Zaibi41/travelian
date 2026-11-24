import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #123: every fare's baggage is shown, not only the fare shown first. Public results: on the card's fare tiles (Flight
// Details shows Flight Info only, no Fare Rules or Baggage tab); a fare without baggage says "Check with airline".
// Intercepted gateway responses only.
// BAGGAGE_TAB_SHOTS_DIR saves screenshots; BAGGAGE_TAB_SHOTS=before only takes them (page before the change), no checks.

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const BEFORE = process.env.BAGGAGE_TAB_SHOTS === "before";
const SHOTS = process.env.BAGGAGE_TAB_SHOTS_DIR;

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const fare = (id: string, name: string, price: number, baggage?: [string, string]) =>
  ({ id, name, ...(baggage ? { baggage: baggage[0], baggage_detail: baggage[1] } : {}), selling_price: rs(price) });
const HAND: [string, string] = ["7 kg", "7 kg hand carry only, no checked bag"];
const B20: [string, string] = ["7+20 kg", "7 kg hand carry + 20 kg checked"];
const B30: [string, string] = ["7+30 kg", "7 kg hand carry + 30 kg checked"];
const PC: [string, string] = ["7+1×23 kg", "7 kg hand carry + 1 checked piece of up to 23 kg"];
const flight = (id: string, code: string, name: string, number: string, dep: string, arr: string, fares: object[]) =>
  ({ id, airline_code: code, airline_name: name, flight_number: number, departure_local: dep, arrival_local: arr, duration_minutes: 115, stops: 0, stop_cities: [], fares });

const LONG_FARE = "Economy Flexible Plus With Free Date Change And Extra Checked Baggage";
const ONE_WAY = {
  search_id: "s-bag", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete",
  journeys: [{ direction: "outbound", origin: "LHE", destination: "KHI", flights: [
    flight("f1", "PA", "Airblue", "PA401", "2026-12-10T08:00", "2026-12-10T09:55",
      [fare("a", "Value", 14_500, HAND), fare("b", "Flexi", 17_200, B20), fare("c", "Xtra", 19_900, B30), fare("d", LONG_FARE, 21_000, PC)]),
    flight("f2", "PF", "AirSial", "PF142", "2026-12-10T19:10", "2026-12-10T21:05", [fare("g", "Economy", 16_100)]), // no baggage sent
  ] }],
};
const ROUND_TRIP = {
  ...ONE_WAY,
  journeys: [
    { direction: "outbound", origin: "LHE", destination: "KHI", flights: [flight("o1", "PA", "Airblue", "PA401", "2026-12-10T08:00", "2026-12-10T09:55",
      [fare("a", "Value", 14_500, HAND), fare("b", "Flexi", 17_200, B20)])] },
    { direction: "return", origin: "KHI", destination: "LHE", flights: [flight("r1", "PA", "Airblue", "PA402", "2026-12-15T11:00", "2026-12-15T12:55",
      [fare("c", "Value", 14_000, B30)])] },
  ],
};

async function mock(page: Page, answer: object) {
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/public/flights/search") return route.fulfill({ json: answer });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
}
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${BEFORE ? "before" : "after"}-${name}.png` });
};
const card = (page: Page, airline: string) => page.locator("main .shadow-card").filter({ has: page.getByRole("button", { name: airline, exact: true }) }).first();

async function openResults(page: Page, width: number, query: string, answer: object) {
  await page.setViewportSize({ width, height: width < 600 ? 860 : 900 });
  await mock(page, answer);
  await page.goto(`/flights-search?${query}`);
  await expect(page.getByRole("button", { name: "Flight Details" }).first()).toBeVisible({ timeout: 20_000 });
}
const tiles = (page: Page, airline: string) => card(page, airline).getByRole("group", { name: /^Fares for / }).getByRole("button");

for (const width of [1440, 390]) {
  test(`one-way: every fare's baggage on the card, no Baggage tab at ${width}px`, async ({ page }) => {
    await openResults(page, width, "from=LHE&to=KHI&depart=2026-12-10&trip=oneway&adults=1", ONE_WAY);
    await shot(page, `baggage-card-oneway-${width}`);
    if (BEFORE) return;
    const pa = tiles(page, "Airblue");
    await expect(pa).toHaveCount(4);
    for (const [name, detail] of [["Value", HAND[1]], ["Flexi", B20[1]], ["Xtra", B30[1]], [LONG_FARE, PC[1]]]) {
      await expect(pa.filter({ has: page.getByText(name, { exact: true }) })).toContainText(detail); // the full words, for screen readers too
    }
    // A long fare name stays inside its tile.
    const long = pa.filter({ has: page.getByText(LONG_FARE, { exact: true }) });
    const [box, tile] = [await long.locator("span").first().boundingBox(), await long.boundingBox()];
    expect(box!.x + box!.width).toBeLessThanOrEqual(tile!.x + tile!.width + 1);

    await card(page, "Airblue").getByRole("button", { name: "Flight Details" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Flight Details", { exact: true })).toBeVisible();
    for (const tab of ["Flight Info", "Fare Rules", "Baggage"]) await expect(dialog.getByRole("button", { name: tab, exact: true })).toHaveCount(0);
  });

  test(`missing baggage and round trip on the card at ${width}px`, async ({ page }) => {
    await openResults(page, width, "from=LHE&to=KHI&depart=2026-12-10&trip=oneway&adults=1", ONE_WAY);
    await shot(page, `baggage-card-missing-${width}`);
    if (!BEFORE) await expect(card(page, "AirSial")).toContainText("Check with airline");
    await page.unrouteAll({ behavior: "ignoreErrors" });

    await openResults(page, width, "from=LHE&to=KHI&depart=2026-12-10&return=2026-12-15&trip=roundtrip&adults=1", ROUND_TRIP);
    await shot(page, `baggage-card-roundtrip-${width}`);
    if (BEFORE) return;
    const pa = tiles(page, "Airblue");
    await expect(pa).toHaveCount(2);
    await expect(pa.first()).not.toContainText(/undefined|null/);
  });
}
