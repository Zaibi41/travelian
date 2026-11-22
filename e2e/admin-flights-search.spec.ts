import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";
import { docsShot } from "./support/docs-shot";
import { expectRowAligned } from "./support/row-alignment";

// Admin Search > Flights layout. Nothing reaches a real gateway or supplier: a local-only
// session (no real token) and intercepted gateway responses shaped like the gateway's output.

// PLAYWRIGHT_CHANNEL=chrome uses the installed Chrome when Playwright's own browser isn't downloaded.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
// Show classic scrollbars (headless hides them), so a vertical scrollbar takes width as on desktop.
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const fare = (id: string, name: string, baggage: string | null, price: number) =>
  ({ id, name, ...(baggage ? { baggage } : {}), selling_price: rs(price), supplier: "southair", supplier_cost: rs(price - 600) });

const SEARCH = {
  search_id: "s-e2e", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete",
  providers: [{ name: "southair", status: "responded" }],
  journeys: [{
    direction: "outbound", origin: "LHE", destination: "KHI",
    flights: [
      { id: "f1", airline_code: "Z8", airline_name: "South Air International Regional Airways Limited", flight_number: "Z8266",
        departure_local: "2026-11-19T00:25", arrival_local: "2026-11-19T02:35", duration_minutes: 130, stops: 0, stop_cities: [],
        fares: [fare("a", "EB", "No checked baggage", 13_997), fare("b", "EV", "20KG", 15_671), fare("c", "EP", "30KG", 17_344), fare("d", "EX", "40KG", 19_000)] },
      { id: "f2", airline_code: "Z8", airline_name: "South Air", flight_number: "Z8270",
        departure_local: "2026-11-19T18:10", arrival_local: "2026-11-19T21:40", duration_minutes: 210, stops: 1, stop_cities: ["ISB"],
        fares: [fare("e", "EB", null, 12_500)] },
    ],
  }],
};

const QUOTE = {
  quote_id: "q-e2e", expires_at: new Date(Date.now() + 10 * 60_000).toISOString(), selling_total: rs(13_997),
  passengers: [{ type: "ADT", count: 1, selling_each: rs(13_997) }], price_changed: true, booking_enabled: false, supplier_total: rs(13_330),
};

const ROUND = {
  ...SEARCH,
  journeys: [SEARCH.journeys[0], {
    direction: "return", origin: "KHI", destination: "LHE",
    flights: [{ id: "r1", airline_code: "Z8", airline_name: "South Air International Regional Airways Limited With A Long Name", flight_number: "Z8267",
      departure_local: "2026-11-22T06:00", arrival_local: "2026-11-22T08:10", duration_minutes: 130, stops: 2, stop_cities: ["MUX", "ISB"],
      fares: [fare("r", "EB", "Baggage allowance subject to the operating carrier's published conditions", 13_997)] }],
  }],
};

async function openFlights(page: Page, width: number, query = "from=LHE&to=KHI&date=2026-11-19") {
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/live-ticketing/flights/search") return route.fulfill({ json: query.includes("roundtrip") ? ROUND : SEARCH });
      if (url.pathname === "/v1/live-ticketing/flights/reprice") return route.fulfill({ json: QUOTE });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => {
    localStorage.setItem("travelian.session.v1", JSON.stringify({
      email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
      accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
    }));
  });
  await page.goto(`/admin/search?tab=flights&${query}`);
  await expect(page.getByRole("region", { name: "Results" })).toBeVisible();
}

const noPageScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const width of [1920, 1440, 1366, 1280, 1024, 768, 390]) {
  test(`admin flights: no horizontal page scroll at ${width}px`, async ({ page }) => {
    await openFlights(page, width);
    expect(await noPageScroll(page)).toBe(0);
    // The arrival time stays inside the viewport; wide fare tables scroll inside their card.
    const box = await page.getByText("02:35", { exact: true }).first().boundingBox();
    expect(box && box.x + box.width).toBeLessThanOrEqual(width);
    await page.getByRole("button", { name: "Show 2 more fares" }).click();
    // #80, #81: the Price column has no "per adult" text and the Actions column no Revalidate.
    await expect(page.getByRole("region", { name: "Results" })).not.toContainText(/per adult|Revalidate/);
    expect(await noPageScroll(page)).toBe(0);
  });

  test(`admin flights: round trip with long names, no horizontal page scroll at ${width}px`, async ({ page }) => {
    await openFlights(page, width, "trip=roundtrip&from=LHE&to=KHI&date=2026-11-19&return=2026-11-22");
    await expect(page.getByText("2 stops via MUX, ISB")).toBeVisible();
    expect(await noPageScroll(page)).toBe(0);
  });
}

test("cabin, provider and flight details open attached, above the page, and close", async ({ page }) => {
  await openFlights(page, 1440);
  await page.getByRole("combobox", { name: "Cabin Class" }).click();
  await expect(page.getByRole("option", { name: "Economy", exact: true })).toBeEnabled();
  for (const cabin of ["Premium Economy", "Business", "First"]) {
    await expect(page.getByRole("option", { name: new RegExp(`^${cabin}`) })).toHaveAttribute("aria-disabled", "true");
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  // Travelers opens attached under its button, above the page.
  const travelers = page.getByRole("button", { name: "Travelers: 1 adult" });
  await travelers.click();
  const popup = page.getByRole("dialog");
  await expect(popup.getByRole("button", { name: "Fewer adults" })).toBeDisabled();
  expect((await popup.boundingBox())!.y).toBeGreaterThanOrEqual((await travelers.boundingBox())!.y);
  await page.keyboard.press("Escape");
  await expect(popup).toHaveCount(0);

  await page.getByRole("combobox", { name: "Provider" }).click();
  await expect(page.getByRole("option", { name: "southair" })).toBeVisible();
  await page.getByRole("option", { name: "southair" }).click();

  await page.getByRole("button", { name: "Flight details" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Flight details" });
  await expect(dialog).toBeVisible();
  const details = await dialog.boundingBox();
  expect(details && details.y >= 0 && details.y + details.height <= 900).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

// Docs only (DOCS_RENDER_DIR=docs/2026-11-15): the admin Flights tab next to the public results page it
// takes its layout from. Both answered locally with made-up fares; skipped in normal runs.
test("docs render: admin Flights tab and the public results page at 1440px", async ({ page }) => {
  test.skip(!process.env.DOCS_RENDER_DIR, "only when rendering docs");
  await openFlights(page, 1440);
  await expect(page.getByLabel("Search status")).toContainText("Providers responding 1 of 1");
  await docsShot(page, "flights-tab-admin-1440");

  const offer = (id: string, flightNumber: string, departure: string, arrival: string, stops: number, total: number, baggage: string) => ({
    provider: "public-e2e", offerId: id, airline: "South Air", flightNumber, origin: "LHE", destination: "KHI",
    originAirport: "Allama Iqbal International Airport", destinationAirport: "Jinnah International Airport",
    departureTime: departure, arrivalTime: arrival, cabin: "Economy", duration: stops ? "3h 30m" : "2h 10m", stops, baggage,
    seats: 9, price: { currency: "PKR", total }, segments: [],
  });
  await page.route(/\/flights\/search$/, route => route.fulfill({ json: { searchId: "public-e2e", providerStatus: {}, results: [
    offer("p1", "Z8266", "2026-11-19T00:25:00+05:00", "2026-11-19T02:35:00+05:00", 0, 13_997, "20 kg"),
    offer("p2", "Z8270", "2026-11-19T18:10:00+05:00", "2026-11-19T21:40:00+05:00", 1, 12_500, "30 kg"),
  ] } }));
  await page.goto("/flights-search?from=LHE&to=KHI&date=2026-11-19&adults=1");
  await expect(page.getByText("PKR 12,500").first()).toBeVisible({ timeout: 15_000 });
  await docsShot(page, "flights-results-public-1440");
});

// A chosen airport is one line ("Lahore – LHE"), so From and To keep the height of the other boxes.
for (const width of [1920, 1440, 1280]) {
  test(`chosen airports keep the search row aligned at ${width}px`, async ({ page }) => {
    await openFlights(page, width);
    await expect(page.getByRole("button", { name: "From Lahore – LHE" })).toBeVisible();
    await expect(page.getByRole("button", { name: "To Karachi – KHI" })).toBeVisible();
    await expect(page.locator(".admin-search-row")).not.toContainText("Allama Iqbal");
    await expectRowAligned(page, [
      "[data-route-row] > div:first-child .h-14", "[data-route-row] > div:last-child .h-14",
      "[data-size='date'] input",
    ]);
    // Line 1 holds trip type, Travelers and Cabin, above the field row.
    const line1 = (await page.getByRole("radiogroup", { name: "Trip type" }).boundingBox())!;
    const fields = (await page.locator(".admin-search-row").boundingBox())!;
    expect(line1.y + line1.height).toBeLessThanOrEqual(fields.y);
    // With Trip and Travelers out of the row, the chosen cities fit from 1440px, Provider shown (narrower: ellipsis).
    for (const name of width >= 1440 ? ["From Lahore – LHE", "To Karachi – KHI"] : []) {
      const text = page.getByRole("button", { name }).locator("[data-airport-selected]");
      expect(await text.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
    // The search button: same height wherever the row puts it (it moves to a second line when Provider is shown).
    expect(Math.round((await page.locator("[data-size='submit'] button").boundingBox())!.height)).toBe(56);
    if (width === 1440 || width === 1920) await docsShot(page, `search-two-lines-flights-${width}`);
  });
}
