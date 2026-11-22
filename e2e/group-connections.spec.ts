import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #152: a connecting group ticket (LHE → MCT → JED, one-way) shows its whole route, stop and final arrival on the
// Group Ticketing results, and its Flight Details name the flights "Flight 1" / "Flight 2", never "Return". A real
// return fare still shows Outbound and Return. Intercepted gateway answers only (shapes read live on 22 Nov 2026).
// GROUP_SHOTS_DIR saves screenshots; GROUP_SHOTS=before only takes them (for the origin/main before shots).

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const SHOTS = process.env.GROUP_SHOTS_DIR;
const BEFORE = process.env.GROUP_SHOTS === "before";

const money = { amount_minor: 9_000_000, currency: "PKR" };
const leg = (over: Record<string, unknown>) => ({ direction: "outbound", baggage: "20", hand_carry: "5", baggage_label: "5+20 kg", meal: "No", ...over });
const terms = { notice: "Group fares are non-refundable and non-changeable.", refund: "Non-refundable" };
const SEARCH = {
  data: [
    { id: "g1", sector: "LHE - MCT - JED", airline: "SALAM AIR", tickets: [{
      id: "t1", sector: "LHE - MCT - JED", airline: "SALAM AIR", flight_number: "OV522", departure_date: "2026-12-27", departure_time: "03:25",
      ticket_type: "KSA ONEWAY", remaining: 3, baggage: "20", hand_carry: "5", baggage_label: "5+20 kg", selling_price: money, fare_terms: terms, legs: [
        leg({ flight_number: "OV522", origin: "LHE", destination: "MCT", departure_date: "2026-12-27", departure_time: "03:25", arrival_time: "05:40" }),
        leg({ flight_number: "OV283", origin: "MCT", destination: "JED", departure_date: "2026-12-27", departure_time: "08:40", arrival_time: "11:10" }),
      ] }] },
    { id: "g2", sector: "LHE - JED", airline: "PA", tickets: [{
      id: "t2", sector: "LHE - JED", airline: "PA", flight_number: "PA470", departure_date: "2026-12-28", departure_time: "23:00",
      ticket_type: "2", remaining: 9, baggage: "20", hand_carry: "7", selling_price: { ...money, amount_minor: 17_500_000 }, fare_terms: terms, legs: [
        leg({ flight_number: "PA470", origin: "LHE", destination: "JED", departure_date: "2026-12-28", departure_time: "23:00", arrival_date: "2026-12-29", arrival_time: "03:15" }),
        leg({ direction: "return", flight_number: "PA471", origin: "JED", destination: "LHE", departure_date: "2027-01-12", departure_time: "04:30", arrival_date: "2027-01-12", arrival_time: "11:35" }),
      ] }] },
    { id: "g3", sector: "LHE - JED", airline: "SV", tickets: [{
      id: "t3", sector: "LHE - JED", airline: "SV", flight_number: "SV739", departure_date: "2026-12-29", departure_time: "04:00", remaining: 4,
      selling_price: { ...money, amount_minor: 11_000_000 }, fare_terms: terms,
      legs: [leg({ flight_number: "SV739", origin: "LHE", destination: "JED", departure_date: "2026-12-29", departure_time: "04:00", arrival_time: "07:10" })] }] },
    { id: "g4", sector: "ISB - MCT - DXB - DMM", airline: "Very Long Regional Airline Name International Airways Limited", tickets: [{
      id: "t4", sector: "ISB - MCT - DXB - DMM", airline: "Very Long Regional Airline Name International Airways Limited", flight_number: "XY101",
      departure_date: "2026-12-30", departure_time: "22:00", remaining: 2, selling_price: money, fare_terms: terms, legs: [
        leg({ flight_number: "XY101", origin: "ISB", destination: "MCT", departure_date: "2026-12-30", departure_time: "22:00", arrival_time: "00:10" }),
        leg({ flight_number: "XY102", origin: "MCT", destination: "DXB", departure_date: "2026-12-31", departure_time: "02:00", arrival_time: "03:00" }),
        leg({ flight_number: "XY103", origin: "DXB", destination: "DMM", departure_date: "2026-12-31", departure_time: "05:00", arrival_time: "06:10" }),
      ] }] },
  ],
};

async function mock(page: Page) {
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/public/group-ticketing/search") return route.fulfill({ json: SEARCH });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
}

const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${BEFORE ? "before" : "after"}-${name}.png`, fullPage: false });
};
const sideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const card = (page: Page, flight: string) => (BEFORE
  // origin/main has no test id on the card: the smallest block with the flight and its Flight Details button.
  ? page.locator("div").filter({ hasText: `Flight ${flight}` }).filter({ has: page.getByRole("button", { name: "Flight Details" }) }).last()
  : page.getByTestId("group-card").filter({ hasText: `Flight ${flight}` }));

for (const width of [1440, 768, 390]) {
  test(`connecting group tickets show the whole route at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 600 ? 860 : 900 });
    await mock(page);
    await page.goto("/group-ticketing?from=LHE&to=JED");
    const salam = card(page, "OV522");
    await expect(salam).toBeVisible({ timeout: 20_000 });
    await salam.scrollIntoViewIfNeeded();
    await shot(page, `results-${width}`);
    await salam.getByRole("button", { name: "Flight Details" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await shot(page, `details-connecting-${width}`);
    if (BEFORE) return;

    // The card: the final destination, the stop and the last flight's arrival; one-way, no return.
    await expect(salam.getByText("LHE → JED", { exact: true })).toBeVisible();
    await expect(salam.getByText("1 stop · via MCT (3h 0m)")).toBeVisible();
    await expect(salam.getByText("03:25 → 11:10")).toBeVisible();
    await expect(salam.getByText("One-Way", { exact: true })).toBeVisible();
    await expect(salam.getByText("LHE → MCT", { exact: true })).toHaveCount(0);
    await expect(salam.getByText(/Return/)).toHaveCount(0);

    // Flight Details: Flight 1 and Flight 2 with the change of planes between them; "Direct" never repeated, no "Return".
    await expect(dialog.getByText("Flight 1", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Flight 2", { exact: true })).toBeVisible();
    await expect(dialog.getByTestId("group-connection")).toHaveText(/Change planes in MCT .* · 3h 0m/);
    await expect(dialog.getByText(/OV522/).first()).toBeVisible();
    await expect(dialog.getByText(/OV283/).first()).toBeVisible();
    await expect(dialog.getByText(/^Return$/)).toHaveCount(0);
    await expect(dialog.getByText(/Direct · Direct/)).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // A real return fare keeps Outbound and Return.
    const airblue = card(page, "PA470");
    await expect(airblue.getByText("Return", { exact: true })).toBeVisible();
    await expect(airblue.getByText("Direct · Arrives 29 Dec 2026")).toBeVisible();
    await airblue.getByRole("button", { name: "Flight Details" }).click();
    await expect(dialog.getByText("Outbound", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Return", { exact: true }).first()).toBeVisible();
    await page.keyboard.press("Escape");

    // A carrier code reads as the airline's name.
    await expect(card(page, "SV739").getByText("Saudia", { exact: true })).toBeVisible();
    expect(await sideScroll(page)).toBe(0);
  });
}

test("a two-stop ticket with a long airline name stays inside its card at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 860 });
  await mock(page);
  await page.goto("/group-ticketing?from=ISB&to=DMM");
  const long = card(page, "XY101");
  await expect(long).toBeVisible({ timeout: 20_000 });
  await long.scrollIntoViewIfNeeded();
  await shot(page, "results-two-stop-390");
  if (BEFORE) return;
  await expect(long.getByText("ISB → DMM", { exact: true })).toBeVisible();
  await expect(long.getByText("2 stops · via MCT (1h 50m), DXB (2h 0m) · Arrives 31 Dec 2026")).toBeVisible();
  expect(await sideScroll(page)).toBe(0);
  const box = await long.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
});
