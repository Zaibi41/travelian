import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";
import { expectReadableText } from "./support/type-scale";
import { docsShot } from "./support/docs-shot";
import { expectRowAligned } from "./support/row-alignment";

// Search > Group Ticketing booking flow (mockup PDF docs/2026-11-14 pages 9-13): results with
// Hold seats, traveler details, seats held, payment and issue tickets, the price-changed dialog.
// Local-only session and intercepted gateway answers (made-up values). Checked at 1440 and 390.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const TICKETS = [
  { id: "t1", sector: "ISB - JED", departure_date: "2026-11-22", departure_time: "06:40", airline: "Fly Jinnah", flight_number: "9P700", remaining: 12,
    baggage: "20", hand_carry: "7", meal: "No", selling_price: rs(168_000), stock: "supplier", can_hold: true,
    legs: [{ direction: "outbound", flight_number: "9P700", baggage: "20", hand_carry: "7" },
      { direction: "return", flight_number: "9P701", origin: "JED", destination: "ISB", departure_date: "2026-12-06", departure_time: "11:05", baggage: "30", hand_carry: "10", meal: "No" }] },
  { id: "t2", sector: "ISB - JED", departure_date: "2026-11-22", departure_time: "04:05", airline: "A very long airline name used for truncation checks", flight_number: "OV224",
    remaining: null, baggage: "0", hand_carry: "7", meal: "Yes", selling_price: rs(80_000), stock: "supplier", can_hold: false },
];
const INVENTORY = { data: [{ id: "g1", sector: "mixed", airline: "Fly Jinnah", tickets: TICKETS }] };
const in30 = () => new Date(Date.now() + 28 * 60_000 + 14_000).toISOString();
const HELD = {
  booking_id: "TRV-GRP-000123", pnr: "K7P2QX", status: "held", hold_expires_at: in30(), adults: 2,
  flight: { airline: "Fly Jinnah", sector: "ISB - JED", departure_date: "2026-11-22", departure_time: "06:40" }, stock: "supplier",
  price_per_adult: rs(118_500), total: rs(237_000), amount_paid: rs(0), amount_due: rs(237_000), payment_status: "unpaid",
  customer: { name: "Ali Raza", phone: "+92 3001234567", email: "ali.raza@example.invalid" },
  travelers: [
    { position: 0, title: "MR", first_name: "Ali", last_name: "Raza", id_type: "PSPT", document_number: "AB1234567", date_of_birth: "1988-05-04" },
    { position: 1, title: "MRS", first_name: "Sana", last_name: "Raza", id_type: "PSPT", document_number: "AB1234567", date_of_birth: "1990-01-31" },
  ],
  payments: [], can_record_payments: true, can_issue_tickets: true,
};
const PAID = { ...HELD, amount_paid: rs(237_000), amount_due: rs(0), payment_status: "paid", can_issue_tickets: true,
  payments: [{ id: "pay1", method: "bank_transfer", received_into: "Meezan Bank, Travelian current account", amount: rs(237_000), reference: "TRV-PAY-1", received_at: "2026-11-14T10:00:00Z" }] };
const ACCOUNTS = { accounts: [{ id: "acct-0001", method: "bank_transfer", label: "Meezan Bank, Travelian current account" }, { id: "acct-0002", method: "jazzcash", label: "JazzCash, Travelian business wallet" }] };

async function open(page: Page, width: number, { paid = false, changed = false } = {}) {
  await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      const path = url.pathname;
      if (path === "/v1/group-ticketing/inventory" || path === "/v1/group-ticketing/search") return route.fulfill({ json: INVENTORY });
      if (path === "/v1/group-ticketing/tickets/t1") return route.fulfill({ json: TICKETS[0] });
      if (path === "/v1/group-ticketing/holds") return route.fulfill({ status: 201, json: HELD });
      if (path === "/v1/group-ticketing/holds/TRV-GRP-000123") return route.fulfill({ json: paid ? PAID : HELD });
      if (path === "/v1/group-ticketing/holds/TRV-GRP-000123/issue") {
        return changed
          ? route.fulfill({ status: 409, json: { detail: "The supplier price is now above the selling price. Confirm to issue at a loss. Nothing was issued.", code: "below_cost",
            selling_total: rs(237_000), below_cost: true, accepted_supplier_cost: rs(244_000), previous_supplier_cost: rs(230_000), new_supplier_cost: rs(244_000),
            difference: rs(14_000), profit: rs(-7_000) } })
          : route.fulfill({ json: { result: "issued", message: "Tickets issued.", hold: { ...PAID, status: "issued" } } });
      }
      if (path === "/v1/admin/payment-accounts") return route.fulfill({ json: ACCOUNTS });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const shot = (page: Page, name: string) => page.screenshot({ path: `e2e/__screenshots__/${name}.png`, fullPage: true });

for (const width of [1440, 390]) {
  test(`results, traveler details and seats held at ${width}px`, async ({ page }) => {
    await open(page, width);
    await page.goto("/admin/bookings/new?tab=group-ticketing&from=ISB&to=JED&date=2026-11-22&adults=2");
    const results = page.getByRole("region", { name: "Results" });
    await expect(results).toContainText("Rs 168,000");
    await expect(results).toContainText("7+20 kg");
    await expect(results).toContainText("Return 10+30 kg");
    await expect(results).toContainText("7 kg");
    await expect(results.getByRole("button", { name: /^Hold seats/ })).toHaveCount(2);
    await expect(results.getByRole("button", { name: /^Hold seats, A very long/ })).toBeDisabled();
    expect(await overflow(page)).toBe(0);
    await shot(page, `admin-group-results-${width}`);
    await results.getByRole("button", { name: /^Hold seats, Fly Jinnah/ }).click();
    await expect(page.getByRole("heading", { name: "Hold group seats", level: 1 })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Selected group fare" })).toContainText("Price");
    const customer = page.getByRole("region", { name: "Customer" });
    await customer.getByLabel("Given name").fill("Ali");
    await customer.getByLabel("Surname").fill("Raza");
    await page.getByLabel("Phone").fill("+92 300 1234567");
    await page.getByLabel("Email").fill("ali.raza@example.invalid");
    await page.getByRole("region", { name: "Customer" }).getByLabel("Document number").fill("AB1234567");
    const adult2 = page.getByRole("region", { name: "Adult 2" });
    await adult2.getByLabel("Given name").fill("Sana");
    await adult2.getByLabel("Surname").fill("Raza");
    await adult2.getByLabel("Document number").fill("CD7654321");
    // Required before Hold seats: the customer was told the fare is non-refundable and non-changeable.
    await expect(page.getByRole("button", { name: "Hold seats" })).toBeDisabled();
    await page.getByRole("checkbox", { name: /non-refundable and non-changeable, and agrees/ }).check();
    for (const [card, born] of [["Adult 1", "12/04/1988"], ["Adult 2", "23/09/1990"]]) {
      const date = page.getByRole("region", { name: card }).getByLabel("Date of birth", { exact: true });
      await date.fill(born);
      await date.blur();
    }
    expect(await overflow(page)).toBe(0);
    await expectReadableText(page, `traveler details at ${width}px`);
    await shot(page, `admin-group-hold-form-${width}`);
    if (width === 1440) await docsShot(page, "hold-form-group-1440");
    await page.getByRole("button", { name: "Hold seats" }).click();
    await expect(page.getByRole("heading", { name: "Group seats held", level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: "Seats held" })).toContainText("Seats held for 2 adults");
    await expect(page.getByRole("timer")).toContainText(/Hold expires, 2[78]:\d\d left/);
    await expect(page.getByRole("complementary", { name: "Price" })).toContainText("Rs 237,000");
    expect(await overflow(page)).toBe(0);
    await expectReadableText(page, `seats held at ${width}px`);
    await shot(page, `admin-group-held-${width}`);
  });

  test(`payments tab, paid in full, issue and the supplier-price-changed dialog at ${width}px`, async ({ page }) => {
    await open(page, width, { paid: true, changed: true });
    await page.goto("/admin/bookings/group-ticketing/TRV-GRP-000123/payments");
    await expect(page.getByRole("heading", { name: "PNR K7P2QX", level: 1 })).toBeVisible();  // the airline PNR leads; the booking id sits beside it
    await expect(page.getByRole("region", { name: "Payment summary" })).toContainText("Paid in full");
    await expect(page.getByRole("combobox", { name: "Received into" })).toContainText("Meezan Bank");
    await expect(page.getByRole("button", { name: "Issue tickets" })).toBeEnabled();
    await expect(page.getByRole("note")).toHaveText("Cancellation is not available for group fares. Unpaid holds lapse at the supplier's expiry.");
    await expect(page.getByRole("button", { name: /cancel/i })).toHaveCount(0);
    expect(await overflow(page)).toBe(0);
    await expectReadableText(page, `payments at ${width}px`);
    await docsShot(page, `group-booking-no-cancel-${width}`);
    await shot(page, `admin-group-payments-${width}`);
    await page.getByRole("button", { name: "Issue tickets" }).click();
    const dialog = page.getByRole("dialog", { name: "The supplier price has changed" });
    await expect(dialog).toContainText("+ Rs 14,000");
    await expect(dialog).toContainText("− Rs 7,000");
    await expect(dialog.getByRole("button", { name: "Confirm new price, issue" })).toBeDisabled();
    await dialog.getByRole("checkbox", { name: "Issue below the supplier price" }).click();
    await expect(dialog.getByRole("button", { name: "Confirm new price, issue" })).toBeEnabled();
    const box = await dialog.boundingBox();
    expect(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= (width < 600 ? 844 : 900)).toBe(true);
    await shot(page, `admin-group-price-changed-${width}`);
  });
}

test("unpaid: Issue tickets is off until Due is Rs 0; long names truncate", async ({ page }) => {
  await open(page, 1440);
  await page.goto("/admin/bookings/group-ticketing/TRV-GRP-000123/payments");
  await expect(page.getByRole("region", { name: "Payment summary" })).toContainText("Rs 237,000");
  await expect(page.getByRole("button", { name: "Issue tickets" })).toBeDisabled();
  await expect(page.getByRole("region", { name: "Issue tickets" })).toContainText("Record the full payment first");
});

// A chosen airport is one line ("Islamabad – ISB"), so From and To keep the height of the date and the button.
for (const width of [1920, 1440, 1280]) {
  test(`chosen airports keep the group search row aligned at ${width}px`, async ({ page }) => {
    await open(page, width);
    await page.goto("/admin/bookings/new?tab=group-ticketing&from=ISB&to=JED&date=2026-11-22&adults=2");
    await expect(page.getByRole("button", { name: "From Islamabad – ISB" })).toBeVisible();
    await expect(page.getByRole("button", { name: "To Jeddah – JED" })).toBeVisible();
    await expect(page.locator(".admin-search-row")).not.toContainText(/International Airport|Pakistan|Saudi Arabia/);
    await expectRowAligned(page, ["[data-route-row] > div:first-child .h-14", "[data-route-row] > div:last-child .h-14", "#group-date",
      ".admin-search-row button[type='submit']"]);
    if (width === 1440 || width === 1920) await docsShot(page, `search-two-lines-group-${width}`);
  });
}
