import { expect, test, type Page } from "@playwright/test";

// Flights booking flow pages (fare check, hold form, hold result): no horizontal page scroll.
// Local-only session and intercepted gateway answers; nothing reaches a real gateway or supplier.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const FARE = { id: "x1", name: "EB", baggage: "No checked baggage", selling_price: rs(13_597), supplier: "southair", supplier_cost: rs(13_330) };
const SEARCH = {
  search_id: "s-e2e", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete",
  providers: [{ name: "southair", status: "responded" }],
  journeys: [{
    direction: "outbound", origin: "LHE", destination: "KHI",
    flights: [{ id: "f1", airline_code: "Z8", airline_name: "South Air International Regional Airways Limited", flight_number: "Z8266",
      departure_local: "2026-11-19T00:25", arrival_local: "2026-11-19T02:35", duration_minutes: 130, stops: 0, stop_cities: [], fares: [FARE] }],
  }],
};
const QUOTE = {
  quote_id: "q-e2e", expires_at: new Date(Date.now() + 10 * 60_000).toISOString(), selling_total: rs(15_316), new_total: rs(15_316),
  old_total: null, passengers: [{ type: "ADT", count: 1, selling_each: rs(13_597) }, { type: "INF", count: 1, selling_each: rs(1_719) }],
  price_changed: false, booking_enabled: true, new_price_per_adult: rs(13_597), old_price_per_adult: rs(13_597),
  price_difference_per_adult: rs(0), supplier_total: rs(15_015), margin: rs(301),
};
const HOLD = { booking_id: "TRV-PE49ZP", pnr: "CAEDEC", time_limit: new Date(Date.now() + 23 * 3600_000).toISOString(), selling_total: rs(15_316), label: "UAT test data", warnings: [] };
const DETAIL = {
  source: "gateway_bookings", sample: true, booking_id: "TRV-PE49ZP", pnr: "CAEDEC", product: "flight", statuses: { booking: "held", payment: "unpaid", issuance: "not_issued" },
  amount: rs(15_316), fare: { billable_price: rs(15_316) }, sections_not_available: [], can_reveal_identity: false, can_record_payments: false, can_issue_tickets: false,
  customer: { first_name: "Muhammad Abdullah", last_name: "Rehmanullah Khan Durrani", phone: "+92 3001234567", email: "a.very.long.customer.address@example.invalid" },
  passengers: [
    { position: 0, type: "ADT", title: "MR", first_name: "Muhammad Abdullah", last_name: "Rehmanullah Khan Durrani", date_of_birth_masked: "1990-••-••", id_type: "PSPT", document_number_masked: "••••••567" },
    { position: 1, type: "INF", title: "MISS", first_name: "Baby", last_name: "Passenger", date_of_birth_masked: "2026-••-••", id_type: "PSPT", document_number_masked: "••••••321", infant_of_position: 0 },
  ],
};

async function open(page: Page, width: number, { changed = false, holdError = false } = {}) {
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.port === "8000") {
      if (url.pathname === "/v1/live-ticketing/flights/search") return route.fulfill({ json: SEARCH });
      if (url.pathname === "/v1/live-ticketing/flights/reprice") {
        return route.fulfill({ json: changed ? { ...QUOTE, price_changed: true, new_total: rs(16_000), new_price_per_adult: rs(14_281), price_difference_per_adult: rs(684) } : QUOTE });
      }
      if (url.pathname === "/v1/live-ticketing/flights/bookings") {
        return holdError
          ? route.fulfill({ status: 502, json: { detail: "The hold was created at the supplier (PNR 2E572B, TRV-2S60SD) but its total couldn't be verified. Check the total with the supplier before taking any payment.", code: "total_unverified", pnr: "2E572B", booking_id: "TRV-2S60SD" } })
          : route.fulfill({ status: 201, json: HOLD });
      }
      if (url.pathname === "/v1/admin/bookings/TRV-PE49ZP") return route.fulfill({ json: DETAIL });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return ["localhost", "127.0.0.1"].includes(url.hostname) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
  await page.goto("/admin/search?tab=flights&from=LHE&to=KHI&date=2026-11-19&infants=1");
  await expect(page.getByRole("region", { name: "Results" })).toBeVisible();
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const width of [1280, 1366, 1440, 1920]) {
  test(`hold form and hold result fit at ${width}px`, async ({ page }) => {
    await open(page, width);
    await page.getByRole("button", { name: "Hold Z8266 EB" }).click();
    await expect(page.getByRole("heading", { name: "Hold flight", level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: "Selected fare" })).toContainText("Rs 15,316");
    expect(await overflow(page)).toBe(0);
    await page.getByRole("button", { name: "Hold seats" }).click();
    await expect(page.getByRole("heading", { name: "Hold result" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Travelers" })).toContainText("••••••567");
    expect(await overflow(page)).toBe(0);
  });

  test(`price-changed dialog stays in view at ${width}px`, async ({ page }) => {
    await open(page, width, { changed: true });
    await page.getByRole("button", { name: "Book Z8266 EB" }).click();
    const dialog = page.getByRole("dialog", { name: "The fare price has changed" });
    await expect(dialog).toContainText("Up Rs 684");
    const box = await dialog.boundingBox();
    expect(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= 900).toBe(true);
    expect(await overflow(page)).toBe(0);
    await dialog.getByRole("button", { name: "Continue at new price" }).click();
    await expect(page.getByRole("heading", { name: "Book flight", level: 1 })).toBeVisible();
    expect(await overflow(page)).toBe(0);
  });

  test(`hold problem state fits at ${width}px`, async ({ page }) => {
    await open(page, width, { holdError: true });
    await page.getByRole("button", { name: "Hold Z8266 EB" }).click();
    await page.getByRole("button", { name: "Hold seats" }).click();
    await expect(page.getByRole("region", { name: "Hold created, but its total couldn't be verified" })).toBeVisible();
    expect(await overflow(page)).toBe(0);
  });
}
