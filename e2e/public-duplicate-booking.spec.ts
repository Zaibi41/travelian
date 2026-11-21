import { expect, test, type Locator, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// Issue #17: the gateway refuses a guest's second booking of the same passenger on the same route and date (only the
// guest's own booking, by contact, ever refuses: no other customer's data). Website checkout
// shows the gateway's own plain sentence in its existing error message (the toast), and the guest stays on checkout.
// Every gateway call is answered here (made-up data); nothing reaches a real gateway, supplier or payment.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

const SENTENCE = "One of these travelers already has a booking on this route and date, so nothing was booked. If you need help, contact Travelian.";
const QUERY = new URLSearchParams({
  type: "flight", flightId: "f1", airline: "Pakistan International Airlines", flightNo: "PK300", from: "KHI", to: "ISB",
  date: "Dec 10, 2026", cabin: "Economy", trip: "oneway", adults: "1", children: "0", infants: "0", price: "25000", currency: "PKR",
  searchId: "search-e2e-123456", fareIds: "fare-1",
});
const requests: unknown[] = [];

async function open(page: Page, width: number) {
  requests.length = 0;
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/public/payment-methods") {
        return route.fulfill({ json: { card: false, bank_transfer: false, jazzcash: false, flights: false, bank_accounts: [], jazzcash_accounts: [] } });
      }
      if (url.pathname === "/v1/public/flights/documents") return route.fulfill({ json: { documents: [] } });
      if (url.pathname === "/v1/public/flights/requests") {
        requests.push(route.request().postDataJSON());
        return route.fulfill({ status: 409, json: { detail: SENTENCE, code: "duplicate_booking" } });
      }
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.goto(`/booking?${QUERY.toString()}`);
  await expect(page.getByRole("heading", { name: "Traveler Information" })).toBeVisible();
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

for (const width of [390, 1440]) {
  test(`a double booking refused by the gateway shows its sentence at checkout at ${width}px`, async ({ page }) => {
    await open(page, width);
    await choose(page, page.locator("#passenger-0-title"), "Mr");
    await choose(page, page.locator("#passenger-0-gender"), "Male");
    await page.locator("#passenger-0-firstName").fill("Ali");
    await page.locator("#passenger-0-lastName").fill("Raza");
    await pickDate(page, page.locator("#passenger-0-dob"), "1988-03-14");
    await choose(page, page.locator("#passenger-0-docType"), "CNIC / B-form (Pakistan)");
    await page.locator("#passenger-0-docNumber").fill("3520112345671");
    await page.locator("#contact-email").fill("guest@example.invalid");
    await page.locator("#contact-phone").fill("3001234567");
    await page.getByRole("button", { name: "Continue" }).click();

    const names = page.getByRole("dialog");
    await names.getByRole("checkbox").click();
    await names.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();                // Review Booking
    const request = page.getByRole("button", { name: "Reserve / Request Booking" });  // a guest's request: no payment
    await request.click();

    const toast = page.getByRole("status").filter({ hasText: "Booking request not sent" }).first();
    await expect(toast).toContainText(SENTENCE);
    await expect(toast).not.toContainText("TRV-");                                // no other booking's details
    expect(requests).toHaveLength(1);
    await expect(request).toBeVisible();                                         // still on checkout, nothing saved
    expect(await overflow(page)).toBe(0);
    await expect.poll(async () => {                                              // fully in view once it has slid in
      const box = await toast.boundingBox();
      return Boolean(box && box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= 900);
    }).toBe(true);
    if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/public-checkout-duplicate-${width}.png` });
  });
}
