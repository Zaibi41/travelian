import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// Finance operations screens: Overview, Supplier Balances (+ ledger drawer), Ticket Sale Entry, Supplier Refunds, Customer
// Dues, Accounts & Ledgers balances. Local-only session and made-up gateway answers; nothing reaches a real gateway.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

const OPTIONS_PARTNER = "Karachi Travels and Tours (Private) Limited, Saddar branch";
const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const LONG = "Fly Jinnah / Air Arabia Pakistan regional office direct airline ID (Lahore and Karachi)";
const row = (over: Record<string, unknown>) => ({ section: "direct", booking_mode: "manual", balance_mode: "manual", total_topped_up: rs(0), total_deducted: rs(0), status: "ok", ...over });
const SUPPLIERS = [
  row({ id: "southair", name: "South Air", section: "api", booking_mode: "api", balance_mode: "api", current_balance: rs(512_340), total_deducted: rs(46_700), status: "ok", last_updated: "2026-11-25T06:00:00Z" }),
  row({ id: "sooperfare", name: "Sooperfare", section: "api", booking_mode: "api", opening_balance: rs(200_000), opening_set_at: "2026-11-20T00:00:00Z", total_topped_up: rs(50_000), total_deducted: rs(224_886), current_balance: rs(25_114), low_threshold: rs(50_000), status: "low", last_updated: "2026-11-24T09:12:00Z" }),
  row({ id: "airsial", name: "AirSial", opening_balance: rs(100_000), opening_set_at: "2026-11-20T00:00:00Z", total_deducted: rs(90_000), current_balance: rs(10_000), low_threshold: rs(5_000), status: "ok", last_updated: "2026-11-22T10:00:00Z" }),
  row({ id: "flyjinnah", name: LONG, current_balance: rs(-1_500), opening_balance: rs(0), opening_set_at: "2026-11-21T00:00:00Z", total_deducted: rs(1_500), status: "negative", last_updated: "2026-11-23T10:00:00Z" }),
  row({ id: "pia", name: "PIA", current_balance: null, status: "not_set_up" }),
  row({ id: "aeroglobe", name: "AeroGlobe", section: "b2b", opening_balance: rs(75_000), opening_set_at: "2026-11-20T00:00:00Z", current_balance: rs(75_000), status: "ok", last_updated: "2026-11-25T09:00:00Z" }),
  row({ id: "ratehawk", name: "RateHawk", section: "hotels", booking_mode: "api", current_balance: null, status: "not_set_up" }),
];
const AGENCY_WALLETS = { total_balance: rs(95_000), low_count: 1, wallets: [
  { agency_id: "karachi", agency_name: OPTIONS_PARTNER, agency_status: "active", balance: rs(80_000), deposits: rs(100_000), last_deposit_at: "2026-11-24T08:00:00Z" },
  { agency_id: "lahore", agency_name: "Lahore Tours", agency_status: "active", balance: rs(15_000), deposits: rs(15_000), low_threshold: rs(20_000), low: true },
] };
const LEDGER = { supplier: SUPPLIERS[2], items: [
  { at: "2026-11-20T00:00:00Z", kind: "opening", amount: rs(100_000), balance_after: rs(100_000), description: "Opening balance", counted: true },
  { at: "2026-11-21T08:00:00Z", kind: "ticket_sale", amount: rs(-60_000), balance_after: rs(40_000), description: "Ticket Sale Entry #7 (Muhammad Azam, LHE-JED)", ticket_sale_number: 7, by_role: "super_admin", counted: true },
  { at: "2026-11-22T10:00:00Z", kind: "booking_charge", amount: rs(-30_000), balance_after: rs(10_000), description: "Supplier payment settlement", booking_reference: "TRV-277WKE", by_role: "staff", counted: true },
] };
const OVERVIEW = {
  total_supplier_balance: rs(546_954), suppliers_attention_count: 2, suppliers_negative_count: 1, total_bank_balance: rs(1_252_000), include_personal: false,
  total_customer_dues: rs(61_006), customer_dues_count: 2, total_profit: rs(186_114), profit_not_known: 3, pending_refunds_count: 2, pending_refunds_total: rs(95_000),
  pending_sales_count: 1, suppliers: SUPPLIERS.map(s => ({ id: s.id, name: s.name })),
  attention: [
    { supplier_id: "flyjinnah", supplier_name: LONG, status: "negative", current_balance: rs(-1_500) },
    { supplier_id: "sooperfare", supplier_name: "Sooperfare", status: "low", current_balance: rs(25_114), low_threshold: rs(50_000) },
  ],
  activity: [
    { at: "2026-11-25T07:40:00Z", kind: "top_up", title: "Sooperfare top-up (UBL Business)", amount: rs(50_000), by_role: "super_admin", link: "/admin/finance/supplier-balances" },
    { at: "2026-11-24T12:10:00Z", kind: "ticket_sale", title: "Ticket Sale Entry #7: Muhammad Azam, LHE-JED via AirSial", amount: rs(62_000), by_role: "staff", link: "/admin/finance/ticket-sales" },
  ],
};
const OPTIONS = { is_finance: true, suppliers: SUPPLIERS.map(s => ({ id: s.id, name: s.name })), accounts: [{ id: "a1", name: "UBL Business", detail: "business" }, { id: "a2", name: "Owner HBL", detail: "personal" }],
  partners: [{ id: "p1", name: "Karachi Travels and Tours (Private) Limited, Saddar branch" }] };
const PREVIEW = { profit: rs(2_000), due: rs(60_000), problems: [], confirmed_on_save: true, effects: [
  "Record a sale of Rs 62,000 for the passenger.", "Deduct Rs 60,000 from AirSial's balance (Rs 10,000 → Rs -50,000).",
  "Add Rs 2,000 to UBL Business (sales received).", "Add Rs 60,000 to Customer Dues until it is received.", "Profit: Rs 2,000." ] };
const SALES = { can_confirm: true, items: [
  { id: "s1", number: 8, channel: "b2b", agency_name: OPTIONS.partners[0].name, passenger_name: "Muhammad Azam Khan Niazi", route: "LHE-JED", pnr: "ABC123", supplier_name: "AirSial",
    cost: rs(60_000), sale: rs(62_000), received: rs(2_000), due: rs(60_000), profit: rs(2_000), ticket_status: "issued", state: "pending", submitted_by_role: "staff", submitted_at: "2026-11-25T07:00:00Z" },
  { id: "s2", number: 7, channel: "direct", passenger_name: "Sara Ali", route: "KHI-DXB", pnr: "XY9Z8W", supplier_name: "Fly Dubai",
    cost: rs(45_000), sale: rs(48_500), received: rs(48_500), due: rs(0), profit: rs(3_500), ticket_status: "issued", state: "confirmed", submitted_by_role: "super_admin", submitted_at: "2026-11-24T07:00:00Z" },
] };
const REFUNDS = { pending_count: 2, pending_total: rs(95_000), items: [
  { id: "r1", number: 4, supplier_id: "sooperfare", supplier_name: "Sooperfare", booking_reference: "TRV-1A2B3C", amount: rs(80_000), applied: rs(0), remaining: rs(80_000),
    reason: "PNR cancelled by the airline after schedule change; refund requested on the portal", status: "chased", opened_on: "2026-11-10", days_outstanding: 15,
    next_statuses: ["received", "written_off"], can_apply_credit: true },
  { id: "r2", number: 5, supplier_id: "airsial", supplier_name: "AirSial", reference: "AS-REF-9", amount: rs(15_000), applied: rs(0), remaining: rs(15_000), reason: "Duplicate charge",
    status: "requested", opened_on: "2026-11-23", days_outstanding: 2, next_statuses: ["chased", "received", "written_off"], can_apply_credit: true },
] };
const DUES = { total_due: rs(61_006), items: [
  { kind: "booking", reference: "TRV-277WKE", customer: "Ali Khan", total: rs(76_006), received: rs(75_000), due: rs(1_006), days_outstanding: 9, payment_account: "UBL Business" },
  { kind: "ticket_sale", reference: "TSE-8", customer: `Muhammad Azam Khan Niazi (${OPTIONS.partners[0].name})`, total: rs(62_000), received: rs(2_000), due: rs(60_000), days_outstanding: 0, payment_account: "UBL Business" },
] };
const account = (id: string, label: string, ownership: string, current: number) => ({ id, label, method: "bank_transfer", ownership, active: true, iban: "PK36UNIL0109000212345678",
  opening_balance: rs(current - 2_000), sales_received: rs(2_000), top_ups_paid: rs(0), current_balance: rs(current) });
const ACCOUNTS = { business: [account("a1", "UBL Business", "business", 1_252_000)], personal: [account("a2", "Owner HBL", "personal", 80_000)], business_total: rs(1_252_000), personal_total: rs(80_000) };

const JSON_FOR: Record<string, unknown> = {
  "/v1/admin/finance/overview": OVERVIEW, "/v1/admin/finance/suppliers": { suppliers: SUPPLIERS }, "/v1/admin/finance/suppliers/airsial/ledger": LEDGER,
  "/v1/admin/finance/ticket-sales/options": OPTIONS, "/v1/admin/finance/ticket-sales/preview": PREVIEW, "/v1/admin/finance/ticket-sales": SALES,
  "/v1/admin/finance/supplier-refunds": REFUNDS, "/v1/admin/finance/customer-dues": DUES, "/v1/admin/finance/accounts": ACCOUNTS,
  "/v1/admin/finance/payment-accounts": { accounts: [] }, "/v1/admin/finance/agency-wallets": AGENCY_WALLETS,
};

async function open(page: Page, width: number, path: string, heading: string) {
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      const body = JSON_FOR[url.pathname];
      return body ? route.fulfill({ json: body }) : route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const shot = (width: number, name: string) => process.env.SHOT_DIR ? { path: `${process.env.SHOT_DIR}/finance-${width}-${name}.png`, animations: "disabled" as const, fullPage: true } : {};

for (const width of [1440, 1024, 768, 390]) {
  test(`Finance screens fit at ${width}px`, async ({ page }) => {
    await open(page, width, "/admin/finance", "Finance");
    await expect(page.getByText("Total Supplier Balance")).toBeVisible();
    await expect(page.getByText(LONG).first()).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await page.screenshot(shot(width, "overview"));

    await page.goto("/admin/finance/supplier-balances");
    await expect(page.getByRole("heading", { level: 2, name: "Direct airline IDs" })).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await page.screenshot(shot(width, "supplier-balances"));
    await page.getByRole("button", { name: /ledger/i }).filter({ visible: true }).nth(2).click();
    const drawer = page.getByRole("dialog", { name: "AirSial ledger" });
    await expect(drawer.getByText("Supplier payment settlement")).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Ticket Sale Entry #7" })).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Close" })).toBeInViewport();
    await page.waitForTimeout(600); // the slide-in
    const box = (await drawer.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    await expect(drawer.getByRole("button", { name: "Close" })).toBeInViewport();
    await page.screenshot({ ...shot(width, "ledger"), fullPage: false });
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);

    for (const section of ["API-integrated", "Direct airline IDs", "B2B portals", "Hotels"]) {
      await expect(page.getByRole("heading", { level: 2, name: section })).toBeVisible();
    }

    await page.goto("/admin/wallet");
    await expect(page.getByText("Held for agencies")).toBeVisible();
    await expect(page.getByText("Sooperfare")).toHaveCount(0);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await page.screenshot(shot(width, "wallets"));

    await page.goto("/admin/finance/ticket-sales");
    await page.getByLabel("Cost (Rs)").fill("60000");
    await page.getByLabel("Sale price (Rs)").fill("62000");
    await expect(page.getByText("Add Rs 60,000 to Customer Dues until it is received.")).toBeVisible();
    await page.getByRole("radio", { name: "B2B Partner" }).click();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await page.screenshot(shot(width, "ticket-sale"));

    await page.goto("/admin/finance/supplier-refunds");
    await expect(page.getByText("Pending refunds")).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await page.screenshot(shot(width, "supplier-refunds"));

    await page.goto("/admin/finance/customer-dues");
    await expect(page.getByRole("link", { name: "TRV-277WKE" })).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await page.screenshot(shot(width, "customer-dues"));

    await page.goto("/admin/finance/accounts-ledgers");
    await expect(page.getByRole("heading", { name: "Personal", exact: true })).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await page.screenshot(shot(width, "accounts"));
  });
}

test("clicking Finance in the sidebar opens the overview and shows the D50 submenu", async ({ page }) => {
  await open(page, 1440, "/admin/finance/customer-dues", "Customer Dues");
  await page.getByRole("button", { name: "Finance", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/finance$/);
  await expect(page.getByRole("heading", { level: 1, name: "Finance" })).toBeVisible();
  const links = (await page.getByRole("link").filter({ visible: true }).allInnerTexts()).map(text => text.trim());
  const at = links.indexOf("Supplier Balances");
  expect(links.slice(at, at + 8)).toEqual(["Supplier Balances", "Ticket Sale Entry", "Accounts & Ledgers", "Wallets", "Payments", "Reconciliation", "Supplier Refunds", "Customer Dues"]);
  expect(links).not.toContain("Dashboard ");
});
