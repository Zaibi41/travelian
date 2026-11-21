// Made-up report data shared by the Reports spec and test.
const rs = (rupees: number) => ({ amount_minor: Math.round(rupees * 100), currency: "PKR" });
const period = (start: string, bookings: number, sales: number, profit: number, notKnown = 0) => ({
  start, bookings, sales: rs(sales), fees_charged: rs(sales * 0.01), supplier_charge: rs(sales - profit - 500), payment_fees: rs(500), refunds: rs(0),
  profit: rs(profit), profit_not_known: notKnown, payment_fees_missing: 0, other_currency: 0,
});
export const REPORT = {
  granularity: "day",
  totals: { ...period("", 9, 421_300, 31_850, 1), start: undefined },
  periods: [period("2026-11-17", 2, 93_400, 6_200), period("2026-11-18", 1, 46_700, 2_100), period("2026-11-19", 3, 140_100, 11_050, 1),
    period("2026-11-20", 1, 25_000, 2_000), period("2026-11-21", 2, 116_100, 10_500)],
  by_booking: [
    { booking_reference: "TRV-AB12CD", created_at: "2026-11-21T06:00:00Z", product: "flight", customer: "Muhammad Abdullah Rehmanullah Khan Durrani",
      sales: rs(69_400), supplier_charge: rs(62_000), supplier_charge_basis: "recorded", payment_fees: rs(1_400), refunds: rs(0), profit: rs(6_000) },
    { booking_reference: "TRV-OLD001", created_at: "2026-11-19T06:00:00Z", product: "group", customer: "Ayesha Khan", sales: rs(46_700),
      supplier_charge: null, supplier_charge_basis: "not_known", payment_fees: rs(0), refunds: rs(0), profit: null },
  ],
  receivables: [{ booking_reference: "TRV-HELD01", customer: "Bilal Ahmed", status: "held", total: rs(46_700), due: rs(26_700), hold_expires_at: "2026-11-22T10:00:00Z" }],
  receivables_total: rs(26_700), refunds_due: rs(30_000), refunds_due_count: 1,
  supplier_spend: [{ day: "2026-11-21", supplier: "SooperFare", ticket_charges: rs(62_000), top_ups: rs(500_000) }],
  payments_by_method: [{ method: "payfast", account: "PayFast", count: 4, amount: rs(210_000), card_fees: rs(6_300) },
    { method: "bank_transfer", account: "Meezan Bank, Travelian current account, Gulberg branch", count: 3, amount: rs(160_000), card_fees: rs(0) }],
};
