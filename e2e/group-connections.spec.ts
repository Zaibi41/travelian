import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// Group Ticketing results are the Flights results page with group fares only: the same cards (stops, layovers, fare),
// and Book opens the same booking steps. Intercepted gateway answers only (shapes read live on 22 Nov 2026).
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
// The group results are the Flights results page (group fares only): the same card per fare, with its Book button.
const card = (page: Page, text: string) => page.locator("article, div").filter({ hasText: text })
  .filter({ has: page.getByRole("button", { name: "Book", exact: true }) }).last();

for (const width of [1440, 768, 390]) {
  test(`group results are the Flights list, and Book opens the same booking steps, at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 600 ? 860 : 900 });
    await mock(page);
    // An old results link opens the new results page.
    await page.goto("/group-ticketing?from=LHE&to=JED");
    await expect(page).toHaveURL(/\/group-ticketing\/results\?from=LHE&to=JED/);
    const salam = card(page, "SalamAir");
    await expect(salam).toBeVisible({ timeout: 20_000 });
    await shot(page, `results-${width}`);
    await expect(page.getByText("Any date").first()).toBeVisible();
    await expect(salam.getByText("1 Stop").filter({ visible: true }).first()).toBeVisible();
    await expect(salam.getByText(/Muscat/).filter({ visible: true }).first()).toBeVisible();         // the stop and its layover
    await expect(salam.getByText("Non-refundable").filter({ visible: true }).first()).toBeVisible();
    await expect(card(page, "Saudia")).toBeVisible();                       // a carrier code reads as the airline's name
    expect(await sideScroll(page)).toBe(0);

    await salam.getByRole("button", { name: "Book", exact: true }).click();
    await expect(page).toHaveURL(/\/booking\?.*groupTicketId=t1/);
    await expect(page).toHaveURL(/date=Dec\+27%2C\+2026/);                // the fare's own date
    for (const step of ["Traveler Details", "Review", "Payment", "Confirmation"]) await expect(page.getByText(step, { exact: true }).first()).toBeVisible();
    await shot(page, `booking-${width}`);
    expect(await sideScroll(page)).toBe(0);
  });
}

test("a two-stop group fare with a long airline name stays inside its card at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 860 });
  await mock(page);
  await page.goto("/group-ticketing/results?from=ISB&to=DMM&adults=1");
  const long = card(page, "2 Stops");
  await expect(long).toBeVisible({ timeout: 20_000 });
  await long.scrollIntoViewIfNeeded();
  await shot(page, "results-two-stop-390");
  expect(await sideScroll(page)).toBe(0);
  const box = await long.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
});
