import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// Flight Details shows each flight's own airline: a connection that changes airline at the stop shows both, and a
// codeshare (sold as TK8050, flown by Etihad) shows the airline that flies it with "Operated by". A single-airline trip
// is unchanged. 390/768/1024/1440. CODESHARE_SHOTS_DIR saves screenshots.

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const SHOTS = process.env.CODESHARE_SHOTS_DIR;

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const TK = { id: "tk", airline_code: "TK", airline_name: "Turkish Airlines", flight_number: "TK715 / TK8050", departure_local: "2026-12-05T06:00",
  arrival_local: "2026-12-05T19:25", duration_minutes: 865, stops: 1, stop_cities: ["IST"], segments: [
    { flight_number: "TK715", airline_code: "TK", airline_name: "Turkish Airlines", origin: "LHE", destination: "IST",
      departure_local: "2026-12-05T06:00", arrival_local: "2026-12-05T10:30", duration_minutes: 390 },
    { flight_number: "TK8050", airline_code: "TK", airline_name: "Turkish Airlines", operating_code: "EY", operating_name: "Etihad Airways",
      origin: "IST", destination: "AUH", departure_local: "2026-12-05T13:55", arrival_local: "2026-12-05T19:25", duration_minutes: 270, layover_minutes: 205 }],
  fares: [{ id: "t1", name: "Economy", selling_price: rs(150_000) }] };
const PK = { id: "pk", airline_code: "PK", airline_name: "PIA", flight_number: "PK303 / GF530", departure_local: "2026-12-05T08:00",
  arrival_local: "2026-12-05T15:00", duration_minutes: 420, stops: 1, stop_cities: ["BAH"], segments: [
    { flight_number: "PK303", airline_code: "PK", origin: "LHE", destination: "BAH", departure_local: "2026-12-05T08:00", arrival_local: "2026-12-05T10:30", duration_minutes: 270 },
    { flight_number: "GF530", airline_code: "GF", airline_name: "Gulf Air", origin: "BAH", destination: "AUH",
      departure_local: "2026-12-05T13:00", arrival_local: "2026-12-05T15:00", duration_minutes: 60, layover_minutes: 150 }],
  fares: [{ id: "p1", name: "Economy", selling_price: rs(160_000) }] };
const EY = { id: "ey", airline_code: "EY", airline_name: "Etihad Airways", flight_number: "EY244", departure_local: "2026-12-05T04:00",
  arrival_local: "2026-12-05T06:30", duration_minutes: 210, stops: 0, stop_cities: [], segments: [
    { flight_number: "EY244", airline_code: "EY", airline_name: "Etihad Airways", origin: "LHE", destination: "AUH",
      departure_local: "2026-12-05T04:00", arrival_local: "2026-12-05T06:30", duration_minutes: 210 }],
  fares: [{ id: "e1", name: "Economy", selling_price: rs(170_000) }] };
const answer = { search_id: "s-cs", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete",
  journeys: [{ direction: "outbound", origin: "LHE", destination: "AUH", flights: [TK, PK, EY] }] };

async function open(page: Page, width: number) {
  await page.setViewportSize({ width, height: width < 600 ? 800 : 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/public/flights/search") return route.fulfill({ json: answer });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.goto("/flights-search?from=LHE&to=AUH&depart=2026-12-05&trip=oneway&adults=1");
  await expect(page.getByRole("button", { name: "Flight Details" }).first()).toBeVisible({ timeout: 20_000 });
}
const card = (page: Page, airline: string) => page.locator("main .shadow-card").filter({ has: page.getByRole("button", { name: airline, exact: true }) }).first();
async function details(page: Page, airline: string) {
  await card(page, airline).getByRole("button", { name: "Flight Details" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}
const logoOf = (row: ReturnType<Page["getByTestId"]>) => row.getByRole("img").first();

for (const width of [390, 768, 1024, 1440]) {
  test(`${width}px: each flight shows its own airline; a codeshare says who operates it`, async ({ page }) => {
    await open(page, width);

    // The card: a trip on two airlines shows both logos in its logo tile; a one-airline trip one logo, as before.
    const logos = (airline: string) => card(page, airline).getByTestId("card-airline-logos").getByRole("img");
    await expect(logos("Turkish Airlines")).toHaveCount(2);
    await expect(logos("Turkish Airlines").nth(0)).toHaveAttribute("src", "/airline-logos/turkish-airlines.png");
    await expect(logos("Turkish Airlines").nth(1)).toHaveAttribute("src", "/airline-logos/etihad.png");
    await expect(logos("PIA").nth(0)).toHaveAttribute("src", "/airline-logos/pia.png");
    await expect(logos("PIA").nth(1)).toHaveAttribute("src", "/airline-logos/gulf-air.png");
    await expect(card(page, "Etihad Airways").getByTestId("card-airline-logos")).toHaveCount(0);
    await expect(card(page, "Etihad Airways").getByRole("img", { name: "Etihad Airways logo" })).toHaveAttribute("src", "/airline-logos/etihad.png");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/cards-${width}.png` });

    let dialog = await details(page, "Turkish Airlines");
    let rows = dialog.getByTestId("itinerary-flight");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("Turkish Airlines");
    await expect(logoOf(rows.nth(0))).toHaveAttribute("src", "/airline-logos/turkish-airlines.png");
    await expect(rows.nth(0)).not.toContainText("Operated by");
    await expect(rows.nth(1)).toContainText("Etihad Airways");
    await expect(rows.nth(1).getByText("Economy • TK8050", { exact: true })).toBeVisible();
    await expect(rows.nth(1).getByText("Operated by Etihad Airways", { exact: true })).toBeVisible();
    await expect(logoOf(rows.nth(1))).toHaveAttribute("src", "/airline-logos/etihad.png");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/codeshare-${width}.png` });
    // Nothing spills sideways out of the dialog.
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.keyboard.press("Escape");

    dialog = await details(page, "PIA");
    rows = dialog.getByTestId("itinerary-flight");
    await expect(logoOf(rows.nth(0))).toHaveAttribute("src", "/airline-logos/pia.png");
    await expect(rows.nth(1)).toContainText("Gulf Air");
    await expect(logoOf(rows.nth(1))).toHaveAttribute("src", "/airline-logos/gulf-air.png");
    await expect(dialog).not.toContainText("Operated by");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/mixed-${width}.png` });
    await page.keyboard.press("Escape");

    dialog = await details(page, "Etihad Airways");
    rows = dialog.getByTestId("itinerary-flight");
    await expect(rows).toHaveCount(1);
    await expect(rows.nth(0).getByText("Economy • EY244", { exact: true })).toBeVisible();
    await expect(dialog).not.toContainText("Operated by");
  });
}
