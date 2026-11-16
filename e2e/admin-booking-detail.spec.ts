import { expect, test, type Page } from "@playwright/test";
import { gatewayView } from "./support/gateway";
import { expectReadableText } from "./support/type-scale";

// Booking detail Passengers and Audit tabs. Local-only session and intercepted gateway responses.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const DETAIL = {
  source: "gateway_bookings", sample: true, sample_label: "UAT test data", booking_id: "TRV-PE49ZP", pnr: "CAEDEC", product: "flight",
  customer_or_agency: "Test Customer With A Rather Long Family Name", statuses: { booking: "held", payment: "unpaid", issuance: "not_issued" },
  amount: rs(15_316), deadline: "2099-11-10T13:28:58Z", created_at: "2026-11-09T13:28:58Z", fare: { billable_price: rs(15_316) },
  passengers: [
    { position: 0, type: "ADT", title: "MR", first_name: "Muhammad Abdullah", last_name: "Rehmanullah Khan Durrani", date_of_birth: "1990-01-31",
      id_type: "PSPT", document_number: "AB1234567", document_country: "PAK", nationality: "PAK", document_expiry: "2031-01-01", document_validity: "valid" },
    { position: 1, type: "INF", title: "MISS", first_name: "Baby", last_name: "Passenger", date_of_birth: "2026-03-02", id_type: "PSPT",
      document_number: "AB7654321", nationality: "PAK", infant_of_position: 0 },
  ],
  audit: [{ action: "hold_created", actor_user_id: "0901a7ce-ef7d-4af6-8ca4-31fd1252137a", actor_role: "super_admin", at: "2026-11-09T13:28:58Z",
    details: { label: "UAT test data", pnr: "CAEDEC", time_limit: "2026-11-10 13:28 UTC", travelers: 2, fare_info: "matches" } }],
  sections_not_available: ["itinerary", "payments", "tickets", "servicing"],
};

async function open(page: Page, width: number, tab: string) {
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (url.port === "8000") {
      if (url.pathname === "/v1/admin/bookings/TRV-PE49ZP") return route.fulfill({ json: DETAIL });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return ["localhost", "127.0.0.1"].includes(url.hostname) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
  await page.goto(`/admin/bookings/TRV-PE49ZP/${tab}`);
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const width of [1440, 1024, 768, 390]) {
  test(`passengers and audit tabs fit at ${width}px; documents and dates of birth show in full`, async ({ page }) => {
    await open(page, width, "passengers");
    await expect(page.getByRole("region", { name: "Passengers" })).toBeVisible();
    expect(await overflow(page)).toBe(0);
    await expectReadableText(page, `booking detail at ${width}px`);
    await expect(page.getByRole("region", { name: "Passengers" })).toContainText("Passport AB1234567");
    await expect(page.getByRole("region", { name: "Passengers" })).toContainText("31 Jan 1990");
    await expect(page.getByRole("button", { name: /Reveal/ })).toHaveCount(0);
    await open(page, width, "audit");
    await expect(page.getByRole("region", { name: "Audit" })).toBeVisible();
    expect(await overflow(page)).toBe(0);
    await expectReadableText(page, `booking detail audit at ${width}px`);
  });
}
