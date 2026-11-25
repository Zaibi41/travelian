import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// Bank Alfalah (Alfa Payment Gateway): offered at checkout only when the gateway says so; Pay & Book holds the fare
// (payment_method "card"), asks the gateway for the Alfalah form and posts it to Bank Alfalah's page. Back on
// /payment/alfalah (order id in the query or the path), the page only shows what the gateway verified with the bank.
// Gateway and Bank Alfalah answers are made up here; nothing reaches either.

const FLIGHT = {
  type: "flight", flightId: "f1", airline: "Example Air", flightNo: "EX786", from: "LHE", to: "DXB", date: "Dec 08, 2026",
  cabin: "Economy", trip: "oneway", adults: "1", children: "0", infants: "0", price: "45000", currency: "PKR", fare: "Value",
  searchId: "s-1", fareIds: "fare-1",
};
const query = new URLSearchParams(FLIGHT).toString();
const SANDBOX_PAGE = "https://sandbox.bankalfalah.com/SSO/SSO/SSO";

async function mock(page: Page, alfalah: boolean) {
  const seen: { holds: unknown[]; starts: number; posted: string | null } = { holds: [], starts: 0, posted: null };
  await page.route("**/*", async route => {
    const request = route.request();
    if (request.url() === SANDBOX_PAGE) {
      seen.posted = request.postData();
      return route.fulfill({ contentType: "text/html", body: "<html><body><h1>Bank Alfalah checkout</h1></body></html>" });
    }
    const url = gatewayView(request.url());
    if (!isGateway(url)) return isLocal(request.url()) ? route.continue() : route.fulfill({ json: {} });
    if (url.pathname.endsWith("/payment-methods")) return route.fulfill({ json: { card: false, alfalah, bank_transfer: false, jazzcash: false, flights: true } });
    if (url.pathname.endsWith("/flights/payment-options")) return route.fulfill({ json: { held: true, card: false, alfalah, bank_transfer: false, jazzcash: false } });
    if (url.pathname.endsWith("/flights/documents")) return route.fulfill({ json: { documents: [] } });
    if (url.pathname.endsWith("/card-fee")) return route.fulfill({ status: 204, body: "" });
    if (url.pathname.endsWith("/flights/requests")) {
      seen.holds.push(request.postDataJSON());
      return route.fulfill({ status: 201, json: { reference: "TRV-F-ALFA1", access_token: "guest-token-alfa",
        booking: { reference: "TRV-F-ALFA1", status: "held", payment_status: "unpaid", live: true, can_pay: true, total: { amount_minor: 4_500_000, currency: "PKR" },
          paid: { amount_minor: 0, currency: "PKR" }, hold_expires_at: new Date(Date.now() + 3_600_000).toISOString() } } });
    }
    if (url.pathname.endsWith("/bookings/TRV-F-ALFA1/payments/alfalah")) {
      seen.starts += 1;
      return route.fulfill({ json: { action: SANDBOX_PAGE, sandbox: true, fields: { AuthToken: "tok+/=", RequestHash: "hash==", TransactionReferenceNumber: "TRVFALFA1AB12CD34", TransactionAmount: "45000" } } });
    }
    return route.fulfill({ json: {} });
  });
  return seen;
}

async function toPayment(page: Page) {
  const forms = [{ passengerType: "adult", label: "Adult 1", title: "mr", firstName: "Ali", lastName: "Khan", gender: "male", dob: "1990-01-01",
    docNumber: "AB1234560", expiryDate: "2032-01-01", nationality: "Pakistan", issuanceCountry: "Pakistan" }];
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [`travelian.bookingDraft.${query}`,
    JSON.stringify({ passengerForms: forms, email: "ali@example.invalid", phoneCode: "+92", phone: "3001234567" })]);
  await page.goto(`/booking?${query}`);
  await page.getByRole("button", { name: /^Continue/ }).filter({ visible: true }).first().click();
  await page.getByRole("checkbox", { name: /match the passport/ }).click();
  await page.getByRole("button", { name: /^Continue/ }).filter({ visible: true }).first().click();
  await expect(page.getByRole("heading", { name: "Payment Method" })).toBeVisible();
}

for (const [width, height] of [[390, 844], [1440, 900]]) {
  test(`Bank Alfalah pays through its own page at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const seen = await mock(page, true);
    await toPayment(page);
    const option = page.getByRole("radio", { name: /Bank Alfalah/ });
    await expect(option).toBeVisible();
    await expect(option).toHaveAttribute("aria-checked", "true"); // the only online method here
    await expect(page.getByText("You will be redirected to Bank Alfalah to enter card details securely.")).toBeVisible();
    await page.getByRole("button", { name: /Pay & Book/ }).filter({ visible: true }).first().click();
    const dialog = page.getByRole("dialog", { name: "Confirm payment" });
    await expect(dialog).toContainText("Online payments are made on Bank Alfalah");
    await expect(dialog).toContainText("Bank Alfalah");
    await dialog.getByRole("button", { name: /^Confirm/ }).click();
    await expect(page.getByRole("heading", { name: "Bank Alfalah checkout" })).toBeVisible({ timeout: 15_000 });
    expect((seen.holds[0] as { payment_method: string }).payment_method).toBe("card");
    expect(seen.starts).toBe(1);
    const posted = new URLSearchParams(seen.posted ?? "");
    expect(posted.get("AuthToken")).toBe("tok+/=");
    expect(posted.get("TransactionReferenceNumber")).toBe("TRVFALFA1AB12CD34");
  });
}

test("Bank Alfalah is not offered when the gateway can't take it", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mock(page, false);
  await toPayment(page);
  await expect(page.getByRole("radio", { name: /Bank Alfalah/ })).toHaveCount(0);
});

for (const [name, path, result, heading] of [
  ["query", "/payment/alfalah?O=TRVFALFA1AB12CD34&RC=00&TS=P", "paid", "Payment received"],
  ["path", "/payment/alfalah/TS=P/RC=00/RD=/O=TRVFALFA1AB12CD34", "not_paid", "Payment not completed"],
  ["unverified", "/payment/alfalah?O=TRVFALFA1AB12CD34", "not_verified", "Payment being checked"],
] as const) {
  test(`return page (${name}) shows only what the gateway verified`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    let sent: Record<string, string> | null = null;
    await page.route("**/*", route => {
      const url = gatewayView(route.request().url());
      if (isGateway(url) && url.pathname.endsWith("/payments/alfalah/return")) {
        sent = route.request().postDataJSON();
        return route.fulfill({ json: { reference: result === "not_verified" ? null : "TRV-F-ALFA1", result } });
      }
      if (isGateway(url)) return route.fulfill({ json: {} });
      return isLocal(route.request().url()) ? route.continue() : route.fulfill({ json: {} });
    });
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible({ timeout: 15_000 });
    expect(sent).not.toBeNull();
    if (name === "query") expect(sent!.O).toBe("TRVFALFA1AB12CD34");
    if (name === "path") expect(sent!.path).toContain("O=TRVFALFA1AB12CD34");
    await expect(page.getByRole("link", { name: "View My Bookings" })).toBeVisible();
    await expect(page.locator("meta[name=robots]")).toHaveAttribute("content", /noindex/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}
