import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #56 (part 1): after the hold, the payment step shows the travelers and the contact details, editable in place with the
// booking's access token (no re-hold). Gateway calls are answered here with made-up values; nothing reaches a gateway.
const FLIGHT = {
  type: "flight", flightId: "f1", airline: "Example Air", flightNo: "EX786", from: "LHE", to: "DXB", date: "Dec 08, 2026",
  cabin: "Economy", trip: "oneway", adults: "2", children: "0", infants: "0", price: "45000", currency: "PKR", fare: "Value",
  searchId: "s-1", fareIds: "fare-1",
};
const query = new URLSearchParams(FLIGHT).toString();
const SHOTS = process.env.SHOTS_DIR;

async function mockGateway(page: Page, answers: { contact: "ok" | "closed" }) {
  const seen: { token?: string | null; body?: unknown }[] = [];
  await page.route("**/*", route => {
    const request = route.request();
    const url = gatewayView(request.url());
    if (!isGateway(url)) return isLocal(request.url()) ? route.continue() : route.fulfill({ json: {} });
    if (url.pathname.endsWith("/payment-methods")) return route.fulfill({ json: { card: false, bank_transfer: true, jazzcash: false, flights: true,
      bank_accounts: [{ id: "acct-1", bank_name: "Meezan Bank", account_title: "Travelian Travel", account_number: "0101010101", iban: "PK00MEZN0000000101010101" }] } });
    if (url.pathname.endsWith("/flights/payment-options")) return route.fulfill({ json: { held: true, card: false, bank_transfer: true, jazzcash: false } });
    if (url.pathname.endsWith("/flights/documents")) return route.fulfill({ json: { documents: [] } });
    if (url.pathname.endsWith("/flights/requests")) return route.fulfill({ status: 201, json: { reference: "TRV-TEST56", access_token: "guest-token-56",
      booking: { reference: "TRV-TEST56", status: "held", payment_status: "unpaid", live: true, can_pay: true, total: { amount_minor: 9_000_000, currency: "PKR" },
        paid: { amount_minor: 0, currency: "PKR" }, hold_expires_at: new Date(Date.now() + 3_600_000).toISOString() } } });
    if (url.pathname.endsWith("/bookings/TRV-TEST56/contact") && request.method() === "PUT") {
      seen.push({ token: request.headers()["x-booking-token"], body: request.postDataJSON() });
      if (answers.contact === "closed") return route.fulfill({ status: 409, json: { detail: "This booking can't be changed online any more. Contact Travelian to update your details.", code: "closed" } });
      const body = request.postDataJSON();
      return route.fulfill({ json: { phone_code: body.phone_code, phone: body.phone, email: body.email || "ali@example.invalid", message: "saved" } });
    }
    return route.fulfill({ json: {} });
  });
  return seen;
}

async function holdBooking(page: Page) {
  const forms = [["mr", "Ali", "Khan", "male"], ["mrs", "Ayesha", "Rehmanullah Khan Durrani", "female"]].map(([title, firstName, lastName, gender], i) => ({
    passengerType: "adult", label: `Adult ${i + 1}`, title, firstName, lastName, gender, dob: "1990-01-01", docNumber: `AB12345${i}`,
    expiryDate: "2032-01-01", nationality: "Pakistan", issuanceCountry: "Pakistan",
  }));
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [`travelian.bookingDraft.${query}`,
    JSON.stringify({ passengerForms: forms, email: "ali@example.invalid", phoneCode: "+92", phone: "3001234567" })]);
  await page.goto(`/booking?${query}`);
  await page.getByRole("button", { name: /^Continue/ }).filter({ visible: true }).first().click();
  await page.getByRole("checkbox", { name: /match the passport/ }).click();
  await page.getByRole("button", { name: /^Continue/ }).filter({ visible: true }).first().click();
  await expect(page.getByRole("heading", { name: "Payment Method" })).toBeVisible();
  await page.getByText("Bank Transfer", { exact: true }).click();
  await page.getByRole("button", { name: /Pay & Book/ }).filter({ visible: true }).first().click();
  await page.getByRole("dialog", { name: "Confirm payment" }).getByRole("button", { name: /^Confirm/ }).click();
  await expect(page.getByTestId("pay-travelers")).toBeVisible();
}

for (const [width, height] of [[390, 844], [360, 740], [768, 1024], [1440, 900]]) {
  test(`travelers and contact edit before paying at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const seen = await mockGateway(page, { contact: "ok" });
    await holdBooking(page);
    const names = page.getByTestId("pay-travelers").getByRole("listitem");
    await expect(names).toHaveCount(2);
    await expect(names.first()).toContainText("Mr Ali KHAN");
    await expect(names.nth(1)).toContainText("Mrs Ayesha REHMANULLAH KHAN DURRANI");
    const contact = page.getByRole("region", { name: "Contact details" });
    await expect(contact.getByText("+92 3001234567")).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/held-${width}-after.png`, fullPage: true });
    await contact.getByRole("button", { name: "Edit" }).click();
    const mobile = contact.getByLabel("Mobile Number *");
    await mobile.fill("3009876543");
    await contact.getByLabel("Email").fill("new@example.invalid");
    if (SHOTS) await contact.screenshot({ path: `${SHOTS}/contact-edit-${width}-after.png` });
    await contact.getByRole("button", { name: "Save" }).click();
    await expect(contact.getByRole("status")).toHaveText(/Contact details saved\. Your booking and price stay the same\./);
    await expect(contact.getByText("+92 3009876543")).toBeVisible();
    expect(seen).toEqual([{ token: "guest-token-56", body: { phone_code: "+92", phone: "3009876543", email: "new@example.invalid" } }]);
    const edit = contact.getByRole("button", { name: "Edit" });
    if (width < 768) expect((await edit.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}

test("a refused contact change shows the gateway's plain message", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockGateway(page, { contact: "closed" });
  await holdBooking(page);
  const contact = page.getByRole("region", { name: "Contact details" });
  await contact.getByRole("button", { name: "Edit" }).click();
  await contact.getByLabel("Mobile Number *").fill("12");
  await contact.getByRole("button", { name: "Save" }).click();
  await expect(contact.getByText(/Enter the mobile number in digits/)).toBeVisible();
  await contact.getByLabel("Mobile Number *").fill("3009876543");
  await contact.getByRole("button", { name: "Save" }).click();
  await expect(contact.getByRole("alert")).toHaveText(/can't be changed online any more/);
});
