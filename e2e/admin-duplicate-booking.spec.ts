import { expect, test, type Locator, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";
import { expectReadableText } from "./support/type-scale";

// Issue #17: the gateway refuses a second booking of the same passenger on the same route and date. The admin hold
// form shows the gateway's sentence (with the existing booking reference) in its existing error message and stays on
// the form. Local-only session and intercepted gateway answers (made-up data); nothing reaches a real gateway or supplier.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const FARE = { id: "x1", name: "EB", baggage: "20 kg", selling_price: rs(13_597) };
const SEARCH = {
  search_id: "s-e2e", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete",
  journeys: [{
    direction: "outbound", origin: "LHE", destination: "KHI",
    flights: [{ id: "f1", airline_code: "Z8", airline_name: "South Air International Regional Airways Limited", flight_number: "Z8266",
      departure_local: "2026-12-10T00:25", arrival_local: "2026-12-10T02:35", duration_minutes: 130, stops: 0, stop_cities: [], fares: [FARE] }],
  }],
};
const QUOTE = {
  quote_id: "q-e2e", expires_at: new Date(Date.now() + 10 * 60_000).toISOString(), selling_total: rs(13_597), new_total: rs(13_597),
  old_total: null, passengers: [{ type: "ADT", count: 1, selling_each: rs(13_597) }], price_changed: false, booking_enabled: true,
  new_price_per_adult: rs(13_597), old_price_per_adult: rs(13_597), price_difference_per_adult: rs(0),
};
const DUPLICATE = "Muhammad Abdullah Rehmanullah Khan Durrani already has booking TRV-OLD111 on LHE → KHI on 10 Dec 2026. "
  + "A second booking for the same passenger, route and date isn't allowed. Nothing was booked.";
const holds: unknown[] = [];

async function open(page: Page, width: number) {
  holds.length = 0;
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/live-ticketing/flights/search") return route.fulfill({ json: SEARCH });
      if (url.pathname === "/v1/live-ticketing/flights/reprice") return route.fulfill({ json: QUOTE });
      if (url.pathname === "/v1/live-ticketing/flights/bookings") {
        holds.push(route.request().postDataJSON());
        return route.fulfill({ status: 409, json: { detail: DUPLICATE, code: "duplicate_booking" } });
      }
      if (url.pathname.endsWith("/search") || url.pathname === "/v1/admin/customers") return route.fulfill({ json: { results: [], can_manage: true, can_merge: false } });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
  await page.goto("/admin/search?tab=flights&from=LHE&to=KHI&date=2026-12-10");
  await expect(page.getByRole("region", { name: "Results" })).toBeVisible();
}

async function choose(page: Page, trigger: Locator, option: string) {
  await trigger.click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function pickDate(page: Page, field: Locator, iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  await field.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").nth(1).selectOption(String(year));
  await dialog.getByRole("combobox").nth(0).selectOption(String(month - 1));
  await dialog.getByRole("gridcell", { name: String(day), exact: true }).first().click();
  await expect(dialog).toHaveCount(0);
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const width of [1440, 390]) {
  test(`a double booking refused by the gateway shows its sentence on the hold form at ${width}px`, async ({ page }) => {
    await open(page, width);
    await page.getByRole("button", { name: "Hold Z8266 EB" }).click();
    await expect(page.getByRole("heading", { name: "Hold flight", level: 1 })).toBeVisible();
    const customer = page.getByRole("region", { name: "Customer" });
    await customer.getByRole("textbox", { name: "First Name *" }).fill("Muhammad Abdullah");
    await customer.getByRole("textbox", { name: "Last Name *" }).fill("Rehmanullah Khan Durrani");
    await customer.getByRole("textbox", { name: "Mobile Number *" }).fill("+92 300 1234567");
    await customer.getByRole("textbox", { name: "Email *" }).fill("a.very.long.customer.address@example.invalid");
    const adult = page.getByRole("region", { name: "Adult 1" });
    await choose(page, adult.getByRole("combobox", { name: "Title *" }), "Mr");
    await choose(page, adult.getByRole("combobox", { name: "Gender *" }), "Male");
    await pickDate(page, adult.getByRole("button", { name: "Date of Birth *" }), "1990-04-12");
    await choose(page, adult.getByRole("combobox", { name: "Document for Adult 1" }), "CNIC / B-form (Pakistan)");
    await adult.getByRole("textbox", { name: "CNIC / B-form Number *" }).fill("3520112345671");
    await page.getByRole("button", { name: "Hold seats" }).click();

    const alert = page.getByRole("alert").filter({ hasText: "TRV-OLD111" });
    await expect(alert).toContainText(DUPLICATE);
    expect(holds).toHaveLength(1);
    await expect(page.getByRole("heading", { name: "Hold flight", level: 1 })).toBeVisible();       // stays on the form
    await expect(customer.getByRole("textbox", { name: "First Name *" })).toHaveValue("Muhammad Abdullah");
    expect(await overflow(page)).toBe(0);
    await expectReadableText(page, `double booking message at ${width}px`);
    if (process.env.SHOTS_DIR) {
      await alert.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${process.env.SHOTS_DIR}/admin-flight-hold-duplicate-${width}.png` });
    }
  });
}
