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
  await page.goto("/admin/search?tab=flights&from=LHE&to=KHI&date=2026-11-19&infants=1");
  await expect(page.getByRole("region", { name: "Results" })).toBeVisible();
}

/** A typed day-first date, as staff type it ("12/04/1988"), then leave the field. */
async function typeDate(field: ReturnType<Page["getByLabel"]>, dayFirst: string) {
  await field.fill(dayFirst);
  await field.blur();
}

/** The fields the form needs before it calls the gateway: the customer (who is Adult 1), Adult 1's birth date, the infant. */
async function fillRequired(page: Page) {
  const customer = page.getByRole("region", { name: "Customer" });
  await customer.getByLabel("Given name").fill("Muhammad Abdullah");
  await customer.getByLabel("Surname").fill("Rehmanullah Khan Durrani");
  await customer.getByLabel("Phone").fill("+92 300 1234567");
  await customer.getByLabel("Email").fill("a.very.long.customer.address@example.invalid");
  await typeDate(page.getByRole("region", { name: "Adult 1" }).getByLabel("Date of birth", { exact: true }), "12/04/1990");
  const infant = page.getByRole("region", { name: "Infant 1" });
  await infant.getByLabel("Given name").fill("Baby");
  await infant.getByLabel("Surname").fill("Passenger");
  await typeDate(infant.getByLabel("Date of birth", { exact: true }), "01/01/2026");
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const width of [1280, 1366, 1440, 1920]) {
  test(`hold form and hold result fit at ${width}px`, async ({ page }) => {
    await open(page, width);
    await page.getByRole("button", { name: "Book Z8266 EB" }).click();
    await expect(page.getByRole("heading", { name: "Book flight", level: 1 })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Selected fare" })).toContainText("Rs 15,316");
    expect(await overflow(page)).toBe(0);
    await expectReadableText(page, `hold form at ${width}px`);
    if (width === 1440) await docsShot(page, "hold-form-flights-1440");
    await fillRequired(page);
    await page.getByRole("button", { name: "Hold seats" }).click();
    await expect(page.getByRole("heading", { name: "Hold result" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Travelers" })).toContainText("AB1234567");
    expect(await overflow(page)).toBe(0);
    await expectReadableText(page, `hold result at ${width}px`);
  });

  test(`price-changed dialog stays in view at ${width}px`, async ({ page }) => {
    await open(page, width, { changed: true });
    await page.getByRole("button", { name: "Book Z8266 EB" }).click();
    const dialog = page.getByRole("dialog", { name: "The fare price has changed" });
    await expect(dialog).toContainText("Up Rs 684");
    const box = await dialog.boundingBox();
    expect(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= 900).toBe(true);
    expect(await overflow(page)).toBe(0);
    await expectReadableText(page, `price-changed dialog at ${width}px`);
    await dialog.getByRole("button", { name: "Continue at new price" }).click();
    await expect(page.getByRole("heading", { name: "Book flight", level: 1 })).toBeVisible();
    expect(await overflow(page)).toBe(0);
  });

  test(`hold problem state fits at ${width}px`, async ({ page }) => {
    await open(page, width, { holdError: true });
    await page.getByRole("button", { name: "Book Z8266 EB" }).click();
    await fillRequired(page);
    await page.getByRole("button", { name: "Hold seats" }).click();
    const card = page.getByRole("region", { name: "The total couldn't be verified, so nothing was saved" });
    await expect(card).toBeVisible();
    await expect(card.getByRole("link", { name: "Back to search" })).toBeVisible();
    expect(await overflow(page)).toBe(0);
  });
}

for (const width of [1280, 390]) {
  test(`saved customer and travelers by mobile number at ${width}px: the hold sends only their ids`, async ({ page }) => {
    holdBodies.length = 0;
    await open(page, width);
    await page.getByRole("button", { name: "Book Z8266 EB" }).click();
    // Live search: the list opens under the field as the user types, inside the viewport.
    const find = page.getByRole("combobox", { name: "Find saved customer" });
    await find.fill("3001234567");
    const list = page.getByRole("listbox", { name: "Find saved customer results" });
    await expect(list.getByRole("option")).toHaveCount(2);
    const box = (await list.boundingBox())!;
    const field = (await find.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(field.y + field.height - 2);
    expect(box.y + box.height).toBeLessThanOrEqual(900);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await expectReadableText(page, `saved people search at ${width}px`);
    await page.keyboard.press("Enter");                                    // the first match: the long-named customer
    await expect(list).toHaveCount(0);

    // The customer is Adult 1 (ticked by default): the saved customer is the saved traveler.
    const adult = page.getByRole("region", { name: "Adult 1" });
    await expect(adult).toContainText("AB1234567");
    const infant = page.getByRole("region", { name: "Infant 1" });
    await infant.getByRole("combobox", { name: "Use saved traveler, Infant 1" }).fill("Baby");
    await page.getByRole("option", { name: /^Baby Durrani/ }).click();
    await expect(infant).toContainText("AB7654321");
    expect(await overflow(page)).toBe(0);
    await expectReadableText(page, `hold form with saved people at ${width}px`);

    await page.getByRole("button", { name: "Hold seats" }).click();
    await expect(page.getByRole("heading", { name: "Hold result" })).toBeVisible();
    expect(holdBodies).toHaveLength(1);
    expect(holdBodies[0]).toMatchObject({
      customer: { customer_id: "p-00000001" },
      passengers: [
        { type: "ADT", traveler_id: "p-00000001", document_id: "d-00000001" },
        { type: "INF", traveler_id: "p-00000002", document_id: "d-00000002", travels_with: 0 },
      ],
    });
    expect(JSON.stringify(holdBodies[0])).not.toMatch(/document_number|date_of_birth|first_name/);
  });
}

test("country dropdown opens attached to its field, stays in view and works with the keyboard", async ({ page }) => {
  await open(page, 1366);
  await page.getByRole("button", { name: "Book Z8266 EB" }).click();
  const adult = page.getByRole("region", { name: "Adult 1" });
  const nationality = adult.getByRole("combobox", { name: "Nationality" });
  await expect(nationality).toHaveText("Pakistan");
  await nationality.focus();
  await page.keyboard.press("Enter");
  const search = page.getByRole("combobox", { name: "Search country" });
  await expect(search).toBeFocused();
  const list = page.getByRole("listbox");
  const field = await nationality.boundingBox();
  const box = await list.boundingBox();
  expect(field && box && box.y >= field.y + field.height - 2 && box.y + box.height <= 900).toBe(true);
  await page.keyboard.type("turkey");
  await expect(page.getByRole("option")).toHaveText(["Türkiye"]);
  await page.keyboard.press("Enter");
  await expect(nationality).toHaveText("Türkiye");
  expect(await overflow(page)).toBe(0);
  await nationality.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
});
