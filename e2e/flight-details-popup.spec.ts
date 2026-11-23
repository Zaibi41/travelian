import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #163: Flight Details opens the itinerary the owner drew (no "Fare Options" tab repeating the card, no repeated
// airline / route header): "Flight Details / Lahore – Doha", then per journey the date, duration and stops, each flight
// on a vertical line with its airline and "Economy • flight number", and a layover line between flights. Fare Rules and
// Baggage stay as tabs. 360/390/768/1440, one-way 1 stop and 2 stops with a long airline name, round trip.
// POPUP_SHOTS_DIR saves screenshots; POPUP_SHOTS=before only takes them.

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const BEFORE = process.env.POPUP_SHOTS === "before";
const SHOTS = process.env.POPUP_SHOTS_DIR;

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const seg = (n: string, o: string, d: string, dep: string, arr: string, m: number, layover?: number) =>
  ({ flight_number: n, origin: o, destination: d, departure_local: dep, arrival_local: arr, duration_minutes: m, ...(layover ? { layover_minutes: layover } : {}) });
const GF = { id: "gf", airline_code: "GF", airline_name: "Gulf Air", flight_number: "GF765 / GF530", departure_local: "2026-11-30T15:10",
  arrival_local: "2026-11-30T21:40", duration_minutes: 450, stops: 1, stop_cities: ["BAH"],
  segments: [seg("GF765", "LHE", "BAH", "2026-11-30T15:10", "2026-11-30T17:20", 250), seg("GF530", "BAH", "DOH", "2026-11-30T20:40", "2026-11-30T21:40", 60, 200)],
  fares: [{ id: "g1", name: "Economy Saver", baggage: "7+23 kg", selling_price: rs(140_000) }, { id: "g2", name: "Economy Classic", baggage: "7+30 kg", selling_price: rs(160_000) }] };
const LONG = { id: "xx", airline_code: "XY", airline_name: "Very Long Regional Airline Name International Airways Limited", flight_number: "XY1 / XY2 / XY3",
  departure_local: "2026-11-30T01:00", arrival_local: "2026-12-01T09:00", duration_minutes: 1920, stops: 2, stop_cities: ["DXB", "MCT"],
  segments: [seg("XY1", "LHE", "DXB", "2026-11-30T01:00", "2026-11-30T03:30", 210), seg("XY2", "DXB", "MCT", "2026-11-30T12:00", "2026-11-30T13:10", 70, 510),
             seg("XY3", "MCT", "DOH", "2026-12-01T07:00", "2026-12-01T09:00", 120, 1070)],
  fares: [{ id: "x1", name: "Basic", selling_price: rs(99_000) }] };
const BACK = { id: "gfr", airline_code: "GF", airline_name: "Gulf Air", flight_number: "GF531", departure_local: "2026-12-07T10:00", arrival_local: "2026-12-07T17:00",
  duration_minutes: 240, stops: 0, stop_cities: [], segments: [seg("GF531", "DOH", "LHE", "2026-12-07T10:00", "2026-12-07T17:00", 240)],
  fares: [{ id: "r1", name: "Economy Saver", selling_price: rs(100_000) }] };
const answer = (round: boolean) => ({ search_id: "s-pop", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete",
  journeys: [{ direction: "outbound", origin: "LHE", destination: "DOH", flights: round ? [GF] : [GF, LONG] },
             ...(round ? [{ direction: "return", origin: "DOH", destination: "LHE", flights: [BACK] }] : [])] });

async function open(page: Page, width: number, round = false) {
  await page.setViewportSize({ width, height: width < 600 ? 800 : 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/public/flights/search") return route.fulfill({ json: answer(round) });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.goto(round ? "/flights-search?from=LHE&to=DOH&depart=2026-11-30&return=2026-12-07&trip=roundtrip&adults=1"
    : "/flights-search?from=LHE&to=DOH&depart=2026-11-30&trip=oneway&adults=1");
  await expect(page.getByRole("button", { name: "Flight Details" }).first()).toBeVisible({ timeout: 20_000 });
}
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${BEFORE ? "before" : "after"}-${name}.png`, fullPage: false });
};
const card = (page: Page, airline: string) => page.locator("main .shadow-card").filter({ has: page.getByRole("button", { name: airline, exact: true }) }).first();
async function details(page: Page, airline: string) {
  await card(page, airline).getByRole("button", { name: "Flight Details" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

for (const width of [360, 390, 768, 1440]) {
  test(`${width}px: Flight Details is the itinerary, without repeated info`, async ({ page }) => {
    await open(page, width);
    const dialog = await details(page, "Gulf Air");
    await page.waitForTimeout(250);
    await shot(page, `popup-1stop-${width}`);
    if (BEFORE) {
      await page.keyboard.press("Escape");
      await details(page, "Very Long Regional Airline Name International Airways Limited");
      await shot(page, `popup-2stops-${width}`);
      return;
    }
    await expect(dialog.getByRole("heading", { name: "Lahore – Doha" })).toBeVisible();
    await expect(dialog.getByText("Flight Details", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Fare Options" })).toHaveCount(0);
    await expect(dialog).not.toContainText("Gulf Air · GF765"); // the old repeated header line
    await expect(dialog).not.toContainText("Total Fare");        // fares and prices stay on the card
    await expect(dialog.getByText("Mon, Nov 30, 2026", { exact: true })).toBeVisible();
    await expect(dialog.getByText("6h 30m · 1 stop", { exact: true })).toBeVisible();
    await expect(dialog.getByTestId("itinerary-flight")).toHaveCount(2);
    await expect(dialog.getByText("Economy • GF765", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Economy • GF530", { exact: true })).toBeVisible();
    await expect(dialog.getByText("4h 10m", { exact: true })).toBeVisible();
    await expect(dialog.getByText("1h 0m", { exact: true })).toBeVisible();
    const stay = dialog.getByRole("region", { name: /^Stop at Manama/ });
    await expect(stay.getByText("3h 20m layover", { exact: true })).toBeVisible();
    await expect(stay).toContainText("Manama (BAH)");
    await expect(dialog.getByText("Lahore (LHE)", { exact: true })).toBeVisible();
    // Fare Rules and Baggage are still there.
    await dialog.getByRole("button", { name: "Baggage" }).click();
    await expect(dialog.getByRole("table", { name: "Baggage by fare" })).toBeVisible();
    await dialog.getByRole("button", { name: "Flight Info" }).click();
    // Inside the viewport, under the header; close with Escape.
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // 2 stops, long airline name: both stays, nothing wider than the dialog, the body scrolls inside it.
    const longDialog = await details(page, "Very Long Regional Airline Name International Airways Limited");
    await page.waitForTimeout(250);
    await shot(page, `popup-2stops-${width}`);
    await expect(longDialog.getByRole("region", { name: /^Stop at / })).toHaveCount(2);
    await expect(longDialog.getByText("2 stops", { exact: false }).first()).toBeVisible();
    const dialogBox = (await longDialog.boundingBox())!;
    expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual((width < 600 ? 800 : 900) + 1);
    for (const flight of await longDialog.getByTestId("itinerary-flight").all()) {
      const f = (await flight.boundingBox())!;
      expect(f.x + f.width).toBeLessThanOrEqual(dialogBox.x + dialogBox.width + 1);
    }
    await longDialog.getByRole("button", { name: "Close" }).click();
    await expect(longDialog).toBeHidden();
  });
}

for (const width of [390, 1440]) {
  test(`round trip ${width}px: an Outbound and a Return block`, async ({ page }) => {
    await open(page, width, true);
    const dialog = await details(page, "Gulf Air");
    await page.waitForTimeout(250);
    await shot(page, `popup-roundtrip-${width}`);
    if (BEFORE) return;
    const out = dialog.getByRole("region", { name: "Outbound" });
    const back = dialog.getByRole("region", { name: "Return" });
    await expect(out.getByText("Mon, Nov 30, 2026", { exact: true })).toBeVisible();
    await expect(back.getByText("Mon, Dec 07, 2026", { exact: true })).toBeVisible();
    await expect(back.getByText("Non-stop", { exact: false })).toBeVisible();
    await expect(dialog.getByRole("region", { name: /^Stop at Doha/ })).toHaveCount(0); // no stay between outbound and return
  });
}
