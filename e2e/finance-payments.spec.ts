import { expect, test } from "@playwright/test";
import { BEFORE, openAdmin, overflow, rs, shot } from "./support/finance";
import { expectReadableText } from "./support/type-scale";

// travelian#69/#74/#76, gateway#56: Finance > Payments (all payments, slips to check, refunds due), the booking's
// Payments tab with the customer's chosen account and slips. Gateway answers are made up.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
if (process.env.FINANCE_BASE_URL) test.use({ baseURL: process.env.FINANCE_BASE_URL });

const LONG = "Muhammad Abdullah Rehmanullah Khan Durrani";
const ROWS = [
  { kind: "slip", id: "s1", booking_reference: "TRV-ZZ99ZZ", pnr: "QX12AB", product: "flight", is_test: false, customer_name: LONG, method: "bank_transfer",
    account_id: "a1", account_label: "Meezan Bank, Travelian current account, Gulberg branch", chosen_account_id: "a1", amount: rs(46_700), card_fee: rs(0),
    payment_fee: null, payer_reference: "IBFT-0098812345", status: "awaiting_check", at: "2026-11-21T06:10:00Z", slip_id: "s1", rejection_reason: null },
  { kind: "payment", id: "p1", booking_reference: "TRV-AB12CD", pnr: "PK3301", product: "flight", is_test: false, customer_name: "Ayesha Khan", method: "payfast",
    account_id: null, account_label: "PayFast", chosen_account_id: null, amount: rs(46_700), card_fee: rs(1_401), payment_fee: null, payer_reference: "T-99812",
    status: "confirmed", at: "2026-11-20T10:00:00Z", slip_id: null, rejection_reason: null },
  { kind: "slip", id: "s2", booking_reference: "TRV-GRP777", pnr: null, product: "group", is_test: true, customer_name: "Bilal Ahmed", method: "jazzcash",
    account_id: "a2", account_label: "JazzCash business wallet", chosen_account_id: "a2", amount: rs(120_000), card_fee: rs(0), payment_fee: null,
    payer_reference: null, status: "rejected", at: "2026-11-19T08:00:00Z", slip_id: "s2", rejection_reason: "No money arrived in JazzCash by 5 pm" },
];
const LIST = { payments: ROWS, total: 3, confirmed: rs(46_700), confirmed_count: 1, awaiting: rs(46_700), awaiting_count: 1,
  daily_totals: [{ day: "2026-11-20", method: "payfast", count: 1, amount: rs(46_700), card_fee: rs(1_401) }] };
const DUE = {
  owed: [{ booking_reference: "TRV-OWED01", pnr: "AB12CD", product: "flight", booking_status: "paid_not_ticketed", is_test: false, customer_name: LONG,
           reason: "hold_expired", paid: rs(30_000), refundable: rs(30_000) }],
  open: [{ id: "r1", booking_reference: "TRV-REF001", amount: rs(10_000), currency: "PKR", method: "bank_transfer", status: "approved",
           reason: "Flight cancelled by the airline; the customer asked for the money back", requested_at: "2026-11-20T10:00:00Z" }],
};
const SVG = "data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800'><rect width='600' height='800' fill='#f4f6f8'/><text x='40' y='80' font-size='32'>Meezan Bank IBFT receipt</text><text x='40' y='140' font-size='26'>Amount: Rs 46,700</text><text x='40' y='190' font-size='26'>Ref: TRV-ZZ99ZZ</text></svg>");

const answer = (path: string) => {
  if (path === "/v1/admin/finance/payments") return LIST;
  if (path === "/v1/admin/finance/settings/payments") return { card_fee_bps: 300, card_fee_on_group: true, card_fee_refunded: false };
  if (path === "/v1/admin/finance/refunds-due") return DUE;
  if (path.startsWith("/v1/admin/finance/slips/")) return { url: SVG, content_type: "image/svg+xml", expires_in_seconds: 300 };
  if (path === "/v1/admin/payment-accounts") return { accounts: [{ id: "a1", method: "bank_transfer", label: "Meezan Bank, Travelian current account, Gulberg branch" },
    { id: "a2", method: "jazzcash", label: "JazzCash business wallet" }] };
  return undefined;
};

for (const width of [1440, 768, 390]) {
  for (const [tab, url] of [["all", "/admin/payments"], ["awaiting", "/admin/payments?tab=awaiting"], ["refunds", "/admin/payments?tab=refunds"]] as const) {
    if (BEFORE && tab !== "all") continue;
    test(`payments ${tab} at ${width}px`, async ({ page }) => {
      await openAdmin(page, url, width, answer);
      if (!BEFORE) await expect(page.locator("main").getByText(tab === "refunds" ? "TRV-OWED01" : "TRV-ZZ99ZZ").locator("visible=true").first()).toBeVisible();
      await shot(page, `payments-${tab}-${width}`);
      if (BEFORE) return;
      expect(await overflow(page)).toBe(0);
      await expectReadableText(page, `payments ${tab} at ${width}px`);
    });
  }
}

test("checking a slip at 390px and 1440px", async ({ page }) => {
  test.skip(BEFORE);
  for (const width of [1440, 390]) {
    await openAdmin(page, "/admin/payments?tab=awaiting", width, answer);
    await page.getByRole("button", { name: "Check slip" }).locator("visible=true").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm payment" })).toBeVisible();
    await shot(page, `slip-review-${width}`);
    await expectReadableText(page, `slip review ${width}`);
  }
});

const DETAIL = {
  source: "gateway_bookings", sample: false, booking_id: "TRV-ZZ99ZZ", pnr: "QX12AB", product: "flight", customer_or_agency: LONG,
  statuses: { booking: "held", payment: "part_paid", issuance: "not_issued" }, amount: rs(46_700), deadline: "2099-11-22T10:00:00Z", created_at: "2026-11-21T05:00:00Z",
  fare: { billable_price: rs(46_700) }, audit: [], sections_not_available: ["itinerary", "servicing"],
  amount_paid: rs(20_000), amount_due: rs(26_700), can_record_payments: true, can_issue_tickets: true,
  passengers: [{ position: 1, type: "ADT", title: "MR", first_name: "Muhammad Abdullah", last_name: "Khan", date_of_birth: "1990-01-31", id_type: "PSPT" }],
  payments: [{ id: "p9", amount: rs(20_000), method: "payfast", received_into: "PayFast", reference: "T-1", received_at: "2026-11-21T05:30:00Z",
               recorded_at: "2026-11-21T05:30:00Z", card_fee: rs(600) }],
  chosen_account: "Meezan Bank, Travelian current account, Gulberg branch",
  payment_slips: [{ id: "s1", method: "bank_transfer", account_label: "Meezan Bank, Travelian current account, Gulberg branch", amount: rs(26_700),
                    payer_reference: "IBFT-0098812345", content_type: "image/png", status: "awaiting_check", submitted_at: "2026-11-21T06:10:00Z" }],
};

for (const width of [1440, 390]) {
  test(`booking payments tab with the chosen account and slips at ${width}px`, async ({ page }) => {
    await openAdmin(page, "/admin/bookings/TRV-ZZ99ZZ/payments", width, path =>
      path === "/v1/admin/bookings/TRV-ZZ99ZZ" ? DETAIL : path.endsWith("/issuance") ? { issuance_status: "not_issued", blockers: ["Full payment isn't recorded yet."], full_payment_recorded: false,
        amount_paid: rs(20_000), amount_due: rs(26_700), hold_expires_at: "2099-11-22T10:00:00Z", ticketing_enabled: true, can_request: false, can_issue: false } : answer(path));
    if (!BEFORE) await expect(page.getByRole("region", { name: "Customer payment" })).toBeVisible();
    await shot(page, `booking-payments-${width}`);
    if (BEFORE) return;
    await expect(page.getByText("+ card fee Rs 600")).toBeVisible();
    expect(await overflow(page)).toBe(0);
  });
}
