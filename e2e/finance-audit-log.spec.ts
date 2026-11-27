import { expect, test } from "@playwright/test";
import { BEFORE, openAdmin, overflow, rs, shot } from "./support/finance";
import { expectReadableText } from "./support/type-scale";

// travelian#91: Users & Access > Audit Log lists finance actions; old bookings with cost = selling price show
// "Profit: Not known". FINANCE_BASE_URL + FINANCE_SHOTS=before take the before screenshots from the live site.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
if (process.env.FINANCE_BASE_URL) test.use({ baseURL: process.env.FINANCE_BASE_URL });

const LONG_REASON = "Customer cancelled because the airline moved the flight to the next morning; refund agreed by the owner on WhatsApp";
const ENTRIES = [
  { id: 3, at: "2026-11-20T12:10:00Z", actor_user_id: "u-1", actor_role: "super_admin", action: "refund_paid", entity_type: "refund", entity_id: "r1",
    booking_reference: "TRV-AB12CD", before: { status: "approved" }, after: { status: "paid", payout_reference: "IBFT-0098812", paid_at: "2026-11-20" }, reason: null },
  { id: 2, at: "2026-11-20T11:00:00Z", actor_user_id: "u-1", actor_role: "super_admin", action: "refund_requested", entity_type: "refund", entity_id: "r1",
    booking_reference: "TRV-AB12CD", before: null, after: { amount_minor: 4_000_000, currency: "PKR", method: "bank_transfer", status: "requested" }, reason: LONG_REASON },
  { id: 1, at: "2026-11-20T09:00:00Z", actor_user_id: null, actor_role: "system", action: "supplier_charge_recorded", entity_type: "supplier_charge",
    entity_id: "c1", booking_reference: "TRV-XY98ZZ", before: null, after: { amount_minor: 4_577_000, currency: "PKR", source: "issuance" }, reason: null },
];
const DETAIL = {
  source: "gateway_bookings", booking_id: "TRV-OLD001", pnr: "OLD001", product: "flight", customer_or_agency: "Test Customer",
  statuses: { booking: "ticket_issued", payment: "paid", issuance: "issued" }, amount: rs(46_700), created_at: "2026-11-10T10:00:00Z",
  fare: { billable_price: rs(46_700), cost_unknown: true }, passengers: [], audit: [], sections_not_available: ["itinerary", "payments", "tickets", "servicing"],
};

for (const width of [1440, 768, 390]) {
  test(`audit log at ${width}px`, async ({ page }) => {
    await openAdmin(page, BEFORE ? "/admin/roadmap/audit-log" : "/admin/system/logs?tab=audit", width,
      path => path === "/v1/admin/finance/audit-log" ? { entries: ENTRIES, total: 3 } : undefined);
    await shot(page, `audit-log-${width}`);
    if (BEFORE) return;
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Logs");
    await expect(page.locator("main").getByText("Refund marked paid").locator("visible=true").first()).toBeVisible();
    await expect(page.locator("main").getByText("Automatic").locator("visible=true").first()).toBeVisible();
    expect(await overflow(page)).toBe(0);
    await expectReadableText(page, `audit log at ${width}px`);
  });
}

test("old booking with cost = selling price: Profit Not known", async ({ page }) => {
  await openAdmin(page, "/admin/bookings/TRV-OLD001/fare", 1440, path => path === "/v1/admin/bookings/TRV-OLD001" ? DETAIL : undefined);
  await shot(page, "profit-not-known-1440");
  if (BEFORE) return;
  const fare = page.getByRole("region", { name: "Fare" });
  await expect(fare).toContainText("ProfitNot known");
  await expect(fare).not.toContainText("Rs 0");
});
