import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #123: Flight details > Baggage lists every fare's baggage (hand carry and checked), not only the fare shown first;
// a round trip shows the outbound and the return allowance. Intercepted gateway responses only.
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

async function baggageTab(page: Page, width: number, query: string, answer: object, airline: string) {
  await page.setViewportSize({ width, height: width < 600 ? 860 : 900 });
  await mock(page, answer);
  await page.goto(`/flights-search?${query}`);
  await card(page, airline).getByRole("button", { name: "Flight Details" }).click({ timeout: 20_000 });
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Baggage" }).click();
  return dialog;
}

const rowText = (dialog: ReturnType<Page["getByRole"]>) =>
  dialog.getByRole("row").evaluateAll(rows => rows.slice(1).map(row => [...row.querySelectorAll('[role="cell"]')].map(cell => cell.textContent?.trim())));

for (const width of [1440, 390]) {
  test(`one-way: every fare's baggage in the Baggage tab at ${width}px`, async ({ page }) => {
    const dialog = await baggageTab(page, width, "from=LHE&to=KHI&depart=2026-12-10&trip=oneway&adults=1", ONE_WAY, "Airblue");
    await shot(page, `baggage-tab-oneway-${width}`);
    if (BEFORE) return;
    expect(await rowText(dialog)).toEqual([
      ["Value7 kg hand carry only, no checked bag", "7 kg", "No checked bag"],
      ["Flexi7 kg hand carry + 20 kg checked", "7 kg", "20 kg"],
      ["Xtra7 kg hand carry + 30 kg checked", "7 kg", "30 kg"],
      [`${LONG_FARE}7 kg hand carry + 1 checked piece of up to 23 kg`, "7 kg", "1×23 kg"],
    ]);
    // A long fare name stays on one line inside the dialog.
    const long = dialog.getByText(LONG_FARE, { exact: true });
    const [box, dialogBox] = [await long.boundingBox(), await dialog.boundingBox()];
    expect(box!.x + box!.width).toBeLessThanOrEqual(dialogBox!.x + dialogBox!.width);
    expect(box!.height).toBeLessThan(30);
  });

  test(`missing baggage and round trip in the Baggage tab at ${width}px`, async ({ page }) => {
    const missing = await baggageTab(page, width, "from=LHE&to=KHI&depart=2026-12-10&trip=oneway&adults=1", ONE_WAY, "AirSial");
    await shot(page, `baggage-tab-missing-${width}`);
    if (!BEFORE) expect(await rowText(missing)).toEqual([["EconomyBaggage: check with airline", "Check with airline", "Check with airline"]]);
    await page.keyboard.press("Escape");

    const dialog = await baggageTab(page, width, "from=LHE&to=KHI&depart=2026-12-10&return=2026-12-15&trip=roundtrip&adults=1", ROUND_TRIP, "Airblue");
    await shot(page, `baggage-tab-roundtrip-${width}`);
    if (BEFORE) return;
    expect(await rowText(dialog)).toEqual([
      ["ValueOutbound7 kg hand carry only, no checked bag", "7 kg", "No checked bag"],
      ["Return7 kg hand carry + 30 kg checked", "7 kg", "30 kg"],
      ["FlexiOutbound7 kg hand carry + 20 kg checked", "7 kg", "20 kg"],
      ["Return7 kg hand carry + 30 kg checked", "7 kg", "30 kg"],
    ]);
  });
}
