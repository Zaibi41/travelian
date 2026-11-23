import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #175: on the Flights results, a group-ticket return fare (legs with direction outbound / return) is an Outbound and a
// Return journey on the card and in Flight Details, each with its own route, times and stops; never one flight whose
// "stop" is the destination. The price stays the gateway's one total. Direct return, connecting return, a one-way
// connection; 390/1440. Intercepted gateway answers only. GR_SHOTS_DIR saves screenshots; GR_SHOTS=before only shots.

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const BEFORE = process.env.GR_SHOTS === "before";
const SHOTS = process.env.GR_SHOTS_DIR;

const money = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const leg = (over: Record<string, unknown>) => ({ direction: "outbound", baggage: "20", hand_carry: "7", baggage_label: "7+20 kg", meal: "No", ...over });
const ticket = (id: string, airline: string, sector: string, price: number, legs: object[]) => ({ id, sector, airline, tickets: [{
  id: `t-${id}`, sector, airline, flight_number: (legs[0] as { flight_number: string }).flight_number, departure_date: (legs[0] as { departure_date: string }).departure_date,
  departure_time: (legs[0] as { departure_time: string }).departure_time, remaining: 5, selling_price: money(price), fare_terms: { refund: "Non-refundable" }, legs }] });
const GROUPS = { data: [
  ticket("g1", "PA", "LHE - JED", 175_000, [
    leg({ flight_number: "PA470", origin: "LHE", destination: "JED", departure_date: "2026-12-08", departure_time: "23:00", arrival_date: "2026-12-09", arrival_time: "03:15" }),
    leg({ direction: "return", flight_number: "PA471", origin: "JED", destination: "LHE", departure_date: "2026-12-22", departure_time: "04:30", arrival_date: "2026-12-22", arrival_time: "11:35" }),
  ]),
  ticket("g2", "SALAM AIR", "LHE - MCT - JED", 160_000, [
    leg({ flight_number: "OV522", origin: "LHE", destination: "MCT", departure_date: "2026-12-08", departure_time: "03:25", arrival_time: "05:40" }),
    leg({ flight_number: "OV283", origin: "MCT", destination: "JED", departure_date: "2026-12-08", departure_time: "08:40", arrival_time: "11:10" }),
    leg({ direction: "return", flight_number: "OV284", origin: "JED", destination: "MCT", departure_date: "2026-12-20", departure_time: "12:00", arrival_time: "15:30" }),
    leg({ direction: "return", flight_number: "OV523", origin: "MCT", destination: "LHE", departure_date: "2026-12-20", departure_time: "17:30", arrival_time: "21:45" }),
  ]),
  ticket("g3", "SV", "LHE - RUH - JED", 120_000, [
    leg({ flight_number: "SV739", origin: "LHE", destination: "RUH", departure_date: "2026-12-08", departure_time: "04:00", arrival_time: "07:10" }),
    leg({ flight_number: "SV1020", origin: "RUH", destination: "JED", departure_date: "2026-12-08", departure_time: "09:10", arrival_time: "10:50" }),
  ]),
] };
const NO_FLIGHTS = () => ({ search_id: "s-gr", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete",
  journeys: [{ direction: "outbound", origin: "LHE", destination: "JED", flights: [] }] });

async function open(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/public/flights/search") return route.fulfill({ json: NO_FLIGHTS() });
      if (url.pathname === "/v1/public/group-ticketing/search") return route.fulfill({ json: GROUPS });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.goto("/flights-search?from=LHE&to=JED&depart=2026-12-08&trip=oneway&adults=2");
  await expect(page.getByRole("button", { name: "Flight Details" }).first()).toBeVisible({ timeout: 20_000 });
}
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${BEFORE ? "before" : "after"}-${name}.png`, fullPage: false });
};
const card = (page: Page, airline: string) => page.locator("main .shadow-card").filter({ has: page.getByRole("button", { name: airline, exact: true }) }).first();
const seen = (scope: ReturnType<Page["locator"]>, text: string | RegExp) => scope.getByText(text, { exact: typeof text === "string" }).locator("visible=true");

for (const width of [390, 1440]) {
  test(`${width}px: a group return fare is Outbound + Return, not a stop`, async ({ page }) => {
    await open(page, width);
    const direct = card(page, "Airblue");
    await direct.scrollIntoViewIfNeeded();
    await shot(page, `card-direct-return-${width}`);
    if (!BEFORE) {
      await expect(seen(direct, "Outbound")).toHaveCount(1);
      await expect(seen(direct, "Return")).toHaveCount(1);
      await expect(seen(direct, /1 Stop/)).toHaveCount(0);
      await expect(seen(direct, /^Non-stop/)).toHaveCount(2);
      await expect(direct).toContainText("PKR 175,000");
    }
    const dialog = (await direct.getByRole("button", { name: "Flight Details" }).click(), page.getByRole("dialog"));
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(250);
    await shot(page, `details-direct-return-${width}`);
    if (!BEFORE) {
      await expect(dialog.getByRole("region", { name: "Outbound" })).toContainText("Non-stop");
      await expect(dialog.getByRole("region", { name: "Return" })).toContainText("Tue, Dec 22, 2026");
      await expect(dialog.getByRole("region", { name: /^Stop at / })).toHaveCount(0); // Jeddah is the destination, not a stop
    }
    await page.keyboard.press("Escape");

    // Connecting return: 1 stop each way at MCT, none at JED.
    const salam = card(page, "SalamAir");
    await salam.scrollIntoViewIfNeeded();
    await shot(page, `card-connecting-return-${width}`);
    if (!BEFORE) {
      await expect(seen(salam, "Outbound")).toHaveCount(1);
      await expect(seen(salam, "Return")).toHaveCount(1);
      await expect(seen(salam, /1 Stop/)).toHaveCount(2);
      await expect(seen(salam, /2 Stops|3 Stops/)).toHaveCount(0);
    }
    await salam.getByRole("button", { name: "Flight Details" }).click();
    const salamDialog = page.getByRole("dialog");
    await page.waitForTimeout(250);
    await shot(page, `details-connecting-return-${width}`);
    if (!BEFORE) {
      await expect(salamDialog.getByRole("region", { name: /^Stop at / })).toHaveCount(2);
      await expect(salamDialog.getByRole("region", { name: /^Stop at Muscat/ })).toHaveCount(2);
      await expect(salamDialog.getByRole("region", { name: /^Stop at Jeddah/ })).toHaveCount(0);
    }
    await page.keyboard.press("Escape");

    // A one-way connection stays one flight with its stop.
    const saudia = card(page, "Saudia");
    if (!BEFORE) {
      await expect(seen(saudia, "Outbound")).toHaveCount(0);
      await expect(seen(saudia, /1 Stop/).first()).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}
