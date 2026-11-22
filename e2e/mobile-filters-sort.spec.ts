import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #150: on phones the results have a sticky Filters + Sort bar. Filters opens a full-height sheet with the desktop
// filter groups, a "Clear all" and "Show N flights" footer; Sort opens a sheet with the five sort options. Filters and
// sort are kept in the URL, so a reload keeps them. Intercepted gateway responses only (nothing reaches a supplier).
// MFS_SHOTS_DIR saves screenshots; MFS_SHOTS=before only takes them (for the page before this change), with no checks.

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const BEFORE = process.env.MFS_SHOTS === "before";
const SHOTS = process.env.MFS_SHOTS_DIR;

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const seg = (flight_number: string, origin: string, destination: string, departure_local: string, arrival_local: string, duration_minutes: number) =>
  ({ flight_number, origin, destination, departure_local, arrival_local, duration_minutes });
const flight = (id: string, code: string, name: string, number: string, dep: string, arr: string, minutes: number, stops: number, price: number, from = "LHE", to = "DXB") => ({
  id, airline_code: code, airline_name: name, flight_number: number, departure_local: dep, arrival_local: arr, duration_minutes: minutes,
  stops, stop_cities: stops ? ["DOH"] : [], segments: [seg(number, from, to, dep, arr, minutes)],
  fares: [{ id: `${id}-1`, name: "Economy", baggage: "7+20 kg", baggage_detail: "7 kg hand carry + 20 kg checked", selling_price: rs(price) }],
});
const FLIGHTS = [
  flight("f1", "PK", "Pakistan International Airlines", "PK203", "2026-12-08T03:00", "2026-12-08T05:30", 210, 0, 90_000),
  flight("f2", "EK", "Emirates", "EK625", "2026-12-08T10:00", "2026-12-08T12:15", 135, 0, 120_000),
  flight("f3", "QR", "Qatar Airways", "QR629", "2026-12-08T04:10", "2026-12-08T12:00", 530, 1, 80_000),
  flight("f4", "PA", "Airblue", "PA410", "2026-12-08T19:00", "2026-12-08T21:20", 200, 0, 70_000),
];
const RETURNS = [
  flight("r1", "PK", "Pakistan International Airlines", "PK204", "2026-12-15T07:00", "2026-12-15T11:30", 210, 0, 80_000, "DXB", "LHE"),
  flight("r2", "EK", "Emirates", "EK624", "2026-12-15T13:00", "2026-12-15T17:15", 195, 0, 100_000, "DXB", "LHE"),
];
const expires = () => new Date(Date.now() + 15 * 60_000).toISOString();
const ONE_WAY = { search_id: "s-mfs", status: "complete", journeys: [{ direction: "outbound", origin: "LHE", destination: "DXB", flights: FLIGHTS }] };
const ROUND_TRIP = { search_id: "s-mfs-rt", status: "complete", journeys: [...ONE_WAY.journeys, { direction: "return", origin: "DXB", destination: "LHE", flights: RETURNS }] };

async function mock(page: Page, answer: object) {
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/public/flights/search") return route.fulfill({ json: { ...answer, expires_at: expires() } });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
}
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${BEFORE ? "before" : "after"}-${name}.png`, fullPage: false });
};
const QUERY = "from=LHE&to=DXB&depart=2026-12-08&trip=oneway&adults=1";
const cards = (page: Page) => page.locator("main .shadow-card").filter({ has: page.getByRole("button", { name: "Flight Details" }) });
const bar = (page: Page) => page.getByRole("region", { name: "Filter and sort results" });
const loaded = (page: Page) => expect(page.getByRole("button", { name: "Flight Details" }).first()).toBeVisible({ timeout: 20_000 });

async function open(page: Page, width: number, query = QUERY, answer: object = ONE_WAY) {
  await page.setViewportSize({ width, height: width < 600 ? 800 : 900 });
  await mock(page, answer);
  await page.goto(`/flights-search?${query}`);
}

for (const width of [390, 360]) {
  test(`phone ${width}px: Filters and Sort sheets, count, clear all, URL`, async ({ page }) => {
    await open(page, width);
    await loaded(page);
    await shot(page, `results-top-${width}`);
    if (BEFORE) return;

    await expect(bar(page)).toBeVisible();
    await expect(bar(page)).toContainText("4 flights");
    const filtersButton = bar(page).getByRole("button", { name: /^Filters/ });
    const sortButton = bar(page).getByRole("button", { name: /^Sort/ });
    for (const button of [filtersButton, sortButton]) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(sortButton).toContainText("Cheapest");

    // Filters: Non-stop + Emirates.
    await filtersButton.click();
    const sheet = page.getByRole("dialog", { name: "Filters" });
    await expect(sheet).toBeVisible();
    await shot(page, `filters-sheet-${width}`);
    for (const group of ["Stops", "Price Range (PKR)", "Departure Time", "Baggage", "Airlines"]) await expect(sheet.getByRole("heading", { name: group })).toBeVisible();
    await expect(sheet.getByRole("heading", { name: "Sort By" })).toHaveCount(0); // Sort has its own sheet on phones
    expect((await sheet.getByRole("button", { name: "Close" }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await sheet.getByText("Non-stop", { exact: true }).click();
    await expect(sheet.getByRole("button", { name: "Show 3 flights" })).toBeVisible();
    await sheet.getByText("Emirates", { exact: true }).click();
    const show = sheet.getByRole("button", { name: "Show 1 flight" });
    await expect(show).toBeVisible();
    // The sheet sits above the WhatsApp float: a tap on the right of its footer button hits the button.
    const box = (await show.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("button")?.textContent?.trim(), [box.x + box.width - 8, box.y + box.height / 2])).toBe("Show 1 flight");
    await shot(page, `filters-sheet-chosen-${width}`);
    await show.click();
    await expect(sheet).toBeHidden();
    await expect(cards(page)).toHaveCount(1);
    await expect(bar(page)).toContainText("1 flight");
    await expect(filtersButton).toContainText("2");
    expect(new URL(page.url()).searchParams.getAll("stop")).toEqual(["nonstop"]);
    expect(new URL(page.url()).searchParams.getAll("airline")).toEqual(["Emirates"]);

    // Reload: filters come back from the URL.
    await page.reload();
    await loaded(page);
    await expect(cards(page)).toHaveCount(1);
    await expect(bar(page).getByRole("button", { name: /^Filters/ })).toContainText("2");

    // Clear all from the sheet.
    await bar(page).getByRole("button", { name: /^Filters/ }).click();
    await page.getByRole("dialog", { name: "Filters" }).getByRole("button", { name: "Clear all" }).click();
    await expect(page.getByRole("dialog", { name: "Filters" }).getByRole("button", { name: "Show 4 flights" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(cards(page)).toHaveCount(4);
    expect(new URL(page.url()).searchParams.getAll("stop")).toEqual([]);

    // Sort: Shortest Duration applies and closes.
    await bar(page).getByRole("button", { name: /^Sort/ }).click();
    const sortSheet = page.getByRole("dialog", { name: "Sort by" });
    await expect(sortSheet).toBeVisible();
    await shot(page, `sort-sheet-${width}`);
    const option = sortSheet.getByRole("radio", { name: "Shortest Duration" });
    expect((await option.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await option.click();
    await expect(sortSheet).toBeHidden();
    await expect(cards(page).first()).toContainText("Emirates");
    await expect(bar(page).getByRole("button", { name: /^Sort/ })).toContainText("Shortest");
    expect(new URL(page.url()).searchParams.get("sort")).toBe("duration-asc");
    await page.reload();
    await loaded(page);
    await expect(cards(page).first()).toContainText("Emirates");

    // The bar stays at the top while scrolling.
    await page.mouse.wheel(0, 900);
    await expect.poll(async () => (await bar(page).boundingBox())!.y).toBeLessThan(80);
    expect((await bar(page).boundingBox())!.y).toBeGreaterThanOrEqual(56); // just under the header, not hidden behind it
    await shot(page, `bar-sticky-${width}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}

test("phone 390px: the bar on a round-trip search", async ({ page }) => {
  await open(page, 390, "from=LHE&to=DXB&depart=2026-12-08&return=2026-12-15&trip=roundtrip&adults=1", ROUND_TRIP);
  await loaded(page);
  await shot(page, "results-top-round-trip-390");
  if (BEFORE) return;
  await expect(bar(page)).toContainText("2 flights");
  await bar(page).getByRole("button", { name: /^Filters/ }).click();
  await page.getByRole("dialog", { name: "Filters" }).getByText("Emirates", { exact: true }).click();
  await page.getByRole("dialog", { name: "Filters" }).getByRole("button", { name: "Show 1 flight" }).click();
  await expect(cards(page)).toHaveCount(1);
});

test("phone 390px: multi-city (searched by Travelian, not online) shows its message and no bar", async ({ page }) => {
  const legs = encodeURIComponent(JSON.stringify([{ from: "LHE", to: "DXB", date: "2026-12-08" }, { from: "DXB", to: "IST", date: "2026-12-12" }]));
  await open(page, 390, `from=LHE&to=DXB&depart=2026-12-08&trip=multicity&adults=1&segments=${legs}`);
  await expect(page.getByText("Multi-city search isn't available online yet. Please contact Travelian.")).toBeVisible({ timeout: 20_000 });
  await shot(page, "results-top-multi-city-390");
  if (BEFORE) return;
  await expect(bar(page)).toHaveCount(0);
});

for (const width of [768, 1440]) {
  test(`${width}px: the sidebar filters stay, no phone bar; sort and filters are in the URL`, async ({ page }) => {
    await open(page, width);
    await loaded(page);
    await shot(page, `results-${width}`);
    if (BEFORE) return;
    await expect(bar(page)).toBeHidden();
    const aside = page.locator("aside");
    await expect(aside).toBeVisible();
    await aside.getByText("Non-stop", { exact: true }).click();
    await expect(cards(page)).toHaveCount(3);
    await aside.getByText("Shortest Duration", { exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("sort")).toBe("duration-asc");
    expect(new URL(page.url()).searchParams.getAll("stop")).toEqual(["nonstop"]);
  });
}
