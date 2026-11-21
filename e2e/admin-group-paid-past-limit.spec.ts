import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";
import { expectReadableText } from "./support/type-scale";

// gateway#109: a group booking paid in full whose hold time has passed waits for the final PNR; it never reads as
// expired. A part-paid one reads "Paid, not ticketed: refund or rebook"; an unpaid one still reads as expired.
// Local-only session and intercepted gateway answers (made-up values).
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const ago = new Date(Date.now() - 5 * 60_000).toISOString();
const HELD = {
  booking_id: "TRV-GRP-000123", status: "held", hold_expires_at: ago, adults: 2, stock: "supplier",
  flight: { airline: "Saudi Arabian Airlines International Group Fares", sector: "LHE - JED", departure_date: "2026-12-01", departure_time: "03:00" },
  price_per_adult: rs(118_500), total: rs(237_000), amount_paid: rs(0), amount_due: rs(237_000), payment_status: "unpaid",
  customer: { name: "Muhammad Abdullah Rehman Rehmanullah Khan Durrani", phone: "+92 3001234567", email: "a@example.invalid" },
  travelers: [{ position: 0, title: "MR", first_name: "Muhammad Abdullah Rehman", last_name: "Rehmanullah Khan Durrani", id_type: "PSPT", document_number: "AB1234567" },
    { position: 1, title: "MRS", first_name: "Sana", last_name: "Raza", id_type: "PSPT", document_number: "AB7654321" }],
  payments: [], can_record_payments: false, can_issue_tickets: false, can_release: false, can_set_selling_price: false, can_edit_tickets: false, itinerary_available: false,
};
const PAYMENT = { id: "pay1", method: "bank_transfer", received_into: "Meezan Bank, Travelian current account", reference: "TRV-PAY-1", received_at: "2026-11-21T10:00:00Z" };
const VIEWS: Record<string, object> = {
  paid: { ...HELD, amount_paid: rs(237_000), amount_due: rs(0), payment_status: "paid", payments: [{ ...PAYMENT, amount: rs(237_000) }],
    ticketing_status: "awaiting_final_pnr", can_edit_tickets: true },
  part: { ...HELD, status: "paid_not_ticketed", amount_paid: rs(50_000), amount_due: rs(187_000), payment_status: "part_paid", payments: [{ ...PAYMENT, amount: rs(50_000) }] },
  unpaid: { ...HELD, status: "expired" },
};

async function open(page: Page, width: number, view: object, path: string) {
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/group-ticketing/holds/TRV-GRP-000123") return route.fulfill({ json: view });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
  await page.goto(path);
  await page.getByRole("heading", { level: 1 }).waitFor();
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const shot = (page: Page, name: string) => process.env.SHOTS_DIR ? page.screenshot({ path: `${process.env.SHOTS_DIR}/${name}.png`, fullPage: true }) : undefined;

for (const width of [1440, 1024, 768, 390]) {
  test(`paid group booking past its hold time waits for the final PNR at ${width}px`, async ({ page }) => {
    await open(page, width, VIEWS.paid, "/admin/bookings/group-ticketing/TRV-GRP-000123/payments");
    await expect(page.getByRole("region", { name: "Payment summary" })).toBeVisible();
    await expect(page.getByText("Paid – awaiting final PNR").first()).toBeVisible();
    await expect(page.getByText("This hold has expired")).toHaveCount(0);
    await expect(page.getByText("Hold expired")).toHaveCount(0);
    expect(await overflow(page)).toBe(0);
    await expectReadableText(page, `paid group past hold time at ${width}px`);
    await shot(page, `paid-payments-${width}`);
  });

  test(`paid group hold page past its hold time at ${width}px`, async ({ page }) => {
    await open(page, width, VIEWS.paid, "/admin/search/group-ticketing/held/TRV-GRP-000123");
    await expect(page.getByText("Paid – awaiting final PNR")).toBeVisible();
    await expect(page.getByText("This hold has expired")).toHaveCount(0);
    expect(await overflow(page)).toBe(0);
    await shot(page, `paid-held-${width}`);
  });

  test(`part-paid group booking past its hold time at ${width}px`, async ({ page }) => {
    await open(page, width, VIEWS.part, "/admin/bookings/group-ticketing/TRV-GRP-000123/details");
    await expect(page.getByText("Paid, not ticketed: refund or rebook").first()).toBeVisible();
    expect(await overflow(page)).toBe(0);
    await shot(page, `part-paid-details-${width}`);
  });

  test(`unpaid group booking past its hold time still reads as expired at ${width}px`, async ({ page }) => {
    await open(page, width, VIEWS.unpaid, "/admin/bookings/group-ticketing/TRV-GRP-000123/payments");
    await expect(page.getByText("This hold has expired")).toBeVisible();
    await shot(page, `unpaid-payments-${width}`);
  });
}
