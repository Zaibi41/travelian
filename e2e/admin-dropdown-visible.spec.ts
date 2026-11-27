import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";
import { expectReadableText } from "./support/type-scale";
import { docsShot } from "./support/docs-shot";

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
    { position: 0, type: "ADT", title: "MR", first_name: "Muhammad Abdullah", last_name: "Rehmanullah Khan Durrani", date_of_birth: "1990-01-31", id_type: "PSPT", document_number: "AB1234567" },
    { position: 1, type: "INF", title: "MISS", first_name: "Baby", last_name: "Passenger", date_of_birth: "2026-03-02", id_type: "PSPT", document_number: "AB7654321", infant_of_position: 0 },
  ],
};

// Saved people (made-up, full values, as the gateway returns them).
const savedDoc = (id: string, number: string) => ({ id, id_type: "PSPT", document_country: "PAK", document_number: number, document_expiry: "2031-01-01", document_validity: "valid" });
const PEOPLE = [
  { id: "p-00000001", title: "MR", first_name: "Muhammad Abdullah", last_name: "Rehmanullah Khan Durrani", date_of_birth: "1990-01-31", nationality: "PAK",
    phone: "+92 3001234567", email: "abdullah@a-very-long-company-domain-name.example.invalid", documents: [savedDoc("d-00000001", "AB1234567")], match: "phone" },
  { id: "p-00000002", title: "MISS", first_name: "Baby", last_name: "Durrani", date_of_birth: "2026-03-02", phone: "+92 3001234567", documents: [savedDoc("d-00000002", "AB7654321")], match: "phone" },
];
const holdBodies: unknown[] = [];

async function open(page: Page, width: number, { changed = false, holdError = false } = {}) {
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (["/v1/admin/customers", "/v1/admin/customers/search", "/v1/admin/travelers/search"].includes(url.pathname)) return route.fulfill({ json: { results: PEOPLE, can_manage: true, can_merge: false } });
      if (url.pathname === "/v1/live-ticketing/flights/bookings") holdBodies.push(route.request().postDataJSON());
      if (url.pathname === "/v1/live-ticketing/flights/search") return route.fulfill({ json: SEARCH });
      if (url.pathname === "/v1/live-ticketing/flights/reprice") {
        return route.fulfill({ json: changed ? { ...QUOTE, price_changed: true, new_total: rs(16_000), new_price_per_adult: rs(14_281), price_difference_per_adult: rs(684) } : QUOTE });
      }
      if (url.pathname === "/v1/live-ticketing/flights/bookings") {
        return holdError
          ? route.fulfill({ status: 502, json: { detail: "The supplier created a hold (PNR 2E572B) but its total couldn't be verified, so it wasn't saved. Don't take payment for it; it lapses at the supplier's time limit. Search and hold again.", code: "total_unverified", pnr: "2E572B" } })
          : route.fulfill({ status: 201, json: HOLD });
      }
      if (url.pathname === "/v1/admin/bookings/TRV-PE49ZP") return route.fulfill({ json: DETAIL });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
  await page.goto("/admin/bookings/new?tab=flights&from=LHE&to=KHI&date=2026-11-19&infants=1");
  await expect(page.getByRole("region", { name: "Results" })).toBeVisible();
}


// Only the From and To airport lists move the page (src/hooks/use-below-field.ts, data-scroll-into-view): they
// scroll it until the whole list shows. Every other dropdown opens where it is and leaves the page still.

/** The open list's box. */
async function openListBox(page: Page) {
  await page.waitForTimeout(700);
  return page.evaluate(() => {
    const list = document.querySelector('[role="listbox"], [data-radix-popper-content-wrapper] > *') as HTMLElement | null;
    if (!list) return null;
    const rect = list.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, viewport: window.innerHeight, squeezed: list.scrollHeight > list.clientHeight + 1 };
  });
}

const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

for (const [width, height] of [[1440, 760], [390, 700]] as const) {
  test(`hold form: the dropdowns and date picker leave the page where it is at ${width}x${height}`, async ({ page }) => {
    await open(page, width);
    await page.setViewportSize({ width, height });
    await page.getByRole("button", { name: "Book Z8266 EB" }).click();
    await expect(page.getByRole("heading", { name: "Book flight", level: 1 })).toBeVisible();
    const first = page.getByRole("region", { name: "Adult 1" });
    await expect(first).toBeVisible();
    const triggers = [
      ["Nationality", first.getByRole("combobox", { name: /Nationality/ }).or(first.getByLabel("Nationality", { exact: true })).first()],
      ["Document type", first.getByLabel("Document type", { exact: true }).first()],
      ["Title", first.getByLabel("Title", { exact: true }).first()],
    ] as const;
    let opened = 0;
    for (const [name, trigger] of triggers) {
      if (!(await trigger.count())) continue;
      opened += 1;
      await trigger.scrollIntoViewIfNeeded();
      const before = await scrollY(page);
      await trigger.click();
      expect(await openListBox(page), `${name} opened`).not.toBeNull();
      expect(await scrollY(page), `${name} left the page still`).toBe(before);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
    }
    expect(opened).toBeGreaterThanOrEqual(2);
  });
}

test("search form: Travelers, Cabin Class and Provider leave the page where it is", async ({ page }) => {
  await open(page, 1366);
  await page.setViewportSize({ width: 1366, height: 420 });
  const form = page.getByRole("region", { name: "Search flights" });
  for (const [name, trigger] of [
    ["Travelers", form.getByRole("button", { name: /^Travelers/ })],
    ["Cabin Class", form.getByRole("combobox", { name: "Cabin Class" })],
    ["Provider", form.getByLabel("Provider")],
  ] as const) {
    const before = await scrollY(page);
    await trigger.click();
    expect(await openListBox(page), `${name} opened`).not.toBeNull();
    expect(await scrollY(page), `${name} left the page still`).toBe(before);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
  }
});

test("search form: From and To scroll the page until the whole airport list shows", async ({ page }) => {
  await open(page, 1366);
  await page.setViewportSize({ width: 1366, height: 520 });
  const form = page.getByRole("region", { name: "Search flights" });
  for (const name of ["From", "To"]) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await form.locator(`#flight-${name === "From" ? "from" : "to"}`).click();
    const box = await openListBox(page);
    expect(box, `${name} opened`).not.toBeNull();
    expect(box!.top, `${name} top`).toBeGreaterThanOrEqual(0);
    expect(box!.bottom, `${name} bottom`).toBeLessThanOrEqual(box!.viewport + 1);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
  }
});

const BOOKING = (n: number) => ({ booking_id: `TRV-E2E${String(n).padStart(3, "0")}`, pnr: `PNR${String(n).padStart(3, "0")}`, product: "flight",
  statuses: { booking: "held", payment: "unpaid", issuance: "not_issued" }, amount: rs(15_316), created_at: "2026-11-09T13:28:58Z",
  expires_at: new Date(Date.now() + 3_600_000).toISOString(), customer_or_agency: "Muhammad Abdullah Rehmanullah Khan Durrani" });
const BOOKINGS = {
  source: "gateway_bookings", total: 30, sample_label: "Sample data",
  cards: { all_bookings: 30, confirmed: 0, on_hold: 30, cancelled: 0, unpaid: 30, expiring_soon: 0, expiring_window_hours: 2, hold_deadlines: 30, awaiting_issuance: 0 },
  filter_options: { agencies: [], providers: [] },
  items: Array.from({ length: 30 }, (_, n) => BOOKING(n + 1)),
};

for (const [width, height] of [[1440, 760], [1024, 700], [768, 900], [390, 700]] as const) {
  test(`bookings: the filters open where they are and leave the page still at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.route("**/*", route => {
      const url = gatewayView(route.request().url());
      if (isGateway(url)) {
        return url.pathname === "/v1/admin/bookings" ? route.fulfill({ json: BOOKINGS }) : route.fulfill({ status: 404, json: { detail: "Not found." } });
      }
      return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
    });
    await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
      email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
      accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
    })));
    await page.goto("/admin/bookings");
    await expect(page.getByText("PNR030")).toBeAttached();
    const filters = page.locator("main button[role=combobox]");
    const count = await filters.count();
    expect(count).toBeGreaterThanOrEqual(5);
    for (let index = 0; index < count; index++) {
      const filter = filters.nth(index);
      await filter.scrollIntoViewIfNeeded();
      const before = await scrollY(page);
      await filter.click();
      expect(await openListBox(page), `filter ${index} opened`).not.toBeNull();
      expect(await scrollY(page), `filter ${index} left the page still`).toBe(before);
      await page.keyboard.press("Escape");
      await expect(page.locator("[data-radix-popper-content-wrapper]")).toHaveCount(0);
    }
  });
}
