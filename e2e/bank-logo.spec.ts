import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #76 (default applied: option 2): staff upload a bank logo per receiving account in Accounts & Ledgers; checkout's
// account cards show it, and the bank's initials where no logo was uploaded. Made-up gateway answers; nothing reaches
// a real gateway or S3.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

const SHOTS = process.env.SHOTS_DIR;
const TAG = process.env.SHOT_TAG || "after";
const ONLY_SHOTS = process.env.SHOT_ONLY === "1"; // "before" screenshots on main, which has no logo yet
const LOGO = "https://assets.example.invalid/bank-logo/hbl.png";
// A 24x24 teal PNG.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAAHklEQVR4nGNgaKqgDho1aNSgUYNGDRo1aNSggTcIADeUMp9neMEfAAAAAElFTkSuQmCC", "base64");
const ACCOUNTS = [
  { id: "a-1", bank_name: "Habib Bank Limited (HBL)", account_title: "Travelian (Private) Limited", account_number: "0101-0107777777", logo_url: LOGO },
  { id: "a-2", bank_name: "United Bank Limited - UBL", account_title: "Travelian (Private) Limited", account_number: "0202-0208888888" },
];
const FLIGHT = {
  type: "flight", flightId: "f1", airline: "Example Air", flightNo: "EX786", from: "LHE", to: "DXB", date: "Dec 08, 2026",
  cabin: "Economy", trip: "oneway", adults: "1", children: "0", infants: "0", price: "45000", currency: "PKR", fare: "Value",
  searchId: "s-1", fareIds: "fare-1",
};
const query = new URLSearchParams(FLIGHT).toString();

async function mockGateway(page: Page) {
  await page.route("**/*", route => {
    const request = route.request();
    if (request.url() === LOGO) return route.fulfill({ contentType: "image/png", body: PNG });
    const url = gatewayView(request.url());
    if (!isGateway(url)) return isLocal(request.url()) ? route.continue() : route.fulfill({ json: {} });
    const p = url.pathname;
    if (p.endsWith("/payment-methods")) return route.fulfill({ json: { card: false, bank_transfer: true, jazzcash: false, flights: true, bank_accounts: ACCOUNTS } });
    if (p.endsWith("/flights/payment-options")) return route.fulfill({ json: { held: true, card: false, bank_transfer: true, jazzcash: false } });
    if (p.endsWith("/flights/documents")) return route.fulfill({ json: { documents: [] } });
    if (p.endsWith("/flights/requests")) return route.fulfill({ status: 201, json: { reference: "TRV-TEST76", access_token: "t",
      booking: { reference: "TRV-TEST76", status: "held", payment_status: "unpaid", live: true, can_pay: true, total: { amount_minor: 4_500_000, currency: "PKR" },
        paid: { amount_minor: 0, currency: "PKR" }, hold_expires_at: new Date(Date.now() + 3_600_000).toISOString() } } });
    if (p === "/v1/admin/finance/payment-accounts") return route.fulfill({ json: { accounts: [
      { id: "a-1", method: "bank_transfer", label: "HBL main collections account, Gulberg branch Lahore", active: true, bank_name: "Habib Bank Limited (HBL)",
        account_title: "Travelian (Private) Limited", account_number: "0101-0107777777", logo_url: LOGO, logo_asset_key: "bank-logo/hbl.png" },
      { id: "a-2", method: "bank_transfer", label: "UBL", active: true, bank_name: "United Bank Limited - UBL", account_title: "Travelian (Private) Limited", account_number: "0202-0208888888" },
    ] } });
    return route.fulfill({ json: {} });
  });
}

async function holdAndOpenBankTransfer(page: Page) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [`travelian.bookingDraft.${query}`, JSON.stringify({
    passengerForms: [{ passengerType: "adult", label: "Adult 1", title: "mr", firstName: "Ali", lastName: "Khan", gender: "male", dob: "1990-01-01",
      docNumber: "AB1234567", expiryDate: "2032-01-01", nationality: "Pakistan", issuanceCountry: "Pakistan" }],
    email: "ali@example.invalid", phoneCode: "+92", phone: "3001234567" })]);
  await page.goto(`/booking?${query}`);
  await page.getByRole("button", { name: /^Continue/ }).filter({ visible: true }).first().click();
  await page.getByRole("checkbox", { name: /match the passport/ }).click();
  await page.getByRole("button", { name: /^Continue/ }).filter({ visible: true }).first().click();
  await page.getByText("Bank Transfer", { exact: true }).click();
  await page.getByRole("button", { name: /Pay & Book/ }).filter({ visible: true }).first().click();
  await page.getByRole("dialog", { name: "Confirm payment" }).getByRole("button", { name: /^Confirm/ }).click();
  await expect(page.getByText("Pay by bank transfer")).toBeVisible();
}

for (const [width, height] of [[390, 844], [360, 740], [768, 1024], [1440, 900]]) {
  test(`checkout account cards show the uploaded logo, else the initials, at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await mockGateway(page);
    await holdAndOpenBankTransfer(page);
    const cards = page.getByRole("radio").locator("xpath=ancestor::label[1]");
    await expect(cards).toHaveCount(2);
    await cards.first().scrollIntoViewIfNeeded();
    if (SHOTS) await page.locator("fieldset").first().screenshot({ path: `${SHOTS}/checkout-cards-${width}-${TAG}.png` });
    if (ONLY_SHOTS) return;
    const logo = cards.first().locator("img");
    await expect(logo).toHaveAttribute("src", LOGO);
    expect(await logo.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(cards.nth(1).locator("img")).toHaveCount(0);
    await expect(cards.nth(1)).toContainText("UBL");
    await expect(page.getByRole("radio", { name: /Habib Bank Limited \(HBL\)/ })).toBeChecked();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}

for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) {
  test(`Accounts & Ledgers shows and edits the bank logo at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await mockGateway(page);
    await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
      email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
      accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
    })));
    await page.goto("/admin/finance/accounts-ledgers");
    await expect(page.getByRole("heading", { level: 1, name: "Accounts & Ledgers" })).toBeVisible();
    await page.getByRole("button", { name: /^Edit HBL main/ }).filter({ visible: true }).first().click();
    const dialog = page.getByRole("dialog", { name: /^Edit HBL main/ });
    await expect(dialog).toBeVisible();
    if (SHOTS) await dialog.screenshot({ path: `${SHOTS}/admin-edit-${width}-${TAG}.png` });
    if (ONLY_SHOTS) return;
    await expect(dialog.getByLabel("Bank logo")).toBeVisible();
    await expect(dialog.getByAltText("Bank logo preview")).toHaveAttribute("src", LOGO);
    await expect(dialog.getByRole("button", { name: "Remove logo" })).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.height).toBeLessThanOrEqual(height);
    if (width >= 768) await expect(page.getByAltText("Bank logo for HBL main collections account, Gulberg branch Lahore")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}
