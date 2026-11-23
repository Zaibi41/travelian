import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #167 admin booking form: "Saved Travelers" popup. Local-only session and intercepted gateway answers (made-up values);
// nothing reaches a real gateway or supplier.
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
  await page.goto("/admin/search?tab=flights&from=LHE&to=KHI&date=2026-11-19&infants=1");
  await expect(page.getByRole("region", { name: "Results" })).toBeVisible();
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// #167: the admin booking form is the website's Traveler Details form plus one "Saved Travelers" button per traveler that
// opens a popup with a search box. (Setup copied from admin-flights-hold.spec.ts; made-up gateway answers.)
const SHOTS = process.env.SHOTS_DIR;
const TAG = process.env.SHOT_TAG || "after";
const ONLY_SHOTS = process.env.SHOT_ONLY === "1";

for (const width of [390, 768, 1440]) {
  test(`Saved Travelers popup on the admin traveler card at ${width}px`, async ({ page }) => {
    await open(page, width);
    await page.getByRole("button", { name: "Book Z8266 EB" }).click();
    await expect(page.getByRole("heading", { name: "Book flight", level: 1 })).toBeVisible();
    const infant = page.getByRole("region", { name: "Infant 1" });
    await infant.scrollIntoViewIfNeeded();
    if (SHOTS) await infant.screenshot({ path: `${SHOTS}/admin-traveler-card-${width}-${TAG}.png` });
    if (ONLY_SHOTS) return;
    for (const text of ["Name must match exactly as shown on your passport.", "Use the passport number without spaces."]) {
      await expect(infant.getByText(text, { exact: true })).toHaveCount(0);
    }
    await expect(infant.getByRole("combobox", { name: "Use saved traveler, Infant 1" })).toHaveCount(0);
    await infant.getByRole("button", { name: "Saved Travelers, Infant 1" }).click();
    const picker = page.getByRole("dialog", { name: "Pick from Saved Travelers" });
    await expect(picker).toBeVisible();
    await expect(picker.getByText("Found 2 travelers")).toBeVisible();
    await expect(picker.getByText("Infant", { exact: true })).toBeVisible();
    const box = (await picker.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y + box.height).toBeLessThanOrEqual(900);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin-saved-travelers-${width}-after.png` });
    await picker.getByPlaceholder("Search by name or passport number...").fill("Baby");
    await picker.getByRole("button", { name: /^Baby Durrani/ }).click();
    await expect(picker).toHaveCount(0);
    await expect(infant).toContainText("Filled from saved traveler: Baby Durrani");
    await expect(infant.getByLabel("Passport Number *")).toHaveValue("AB7654321");
    expect(await overflow(page)).toBe(0);
  });
}
