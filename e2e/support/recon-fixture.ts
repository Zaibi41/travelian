// Made-up reconciliation data shared by the spec and the unit test.
const rs = (rupees: number) => ({ amount_minor: Math.round(rupees * 100), currency: "PKR" });
export const MISMATCHES = { total: 3, mismatches: [
  { id: "m1", kind: "payfast_amount_differs", detail: "PayFast says Rs 48,000; Travelian recorded Rs 48,101 charged.", booking_reference: "TRV-AB12CD",
    expected: rs(48_101), actual: rs(48_000), status: "open", created_at: "2026-11-21T06:00:00Z" },
  { id: "m2", kind: "bank_credit_unmatched", detail: "Rs 99,900 arrived in Meezan Bank, Travelian current account, Gulberg branch on 2026-11-20 (IBFT FROM MUHAMMAD ABDULLAH REHMANULLAH KHAN DURRANI REF 77812) and matches no recorded payment.",
    actual: rs(99_900), status: "open", created_at: "2026-11-21T05:00:00Z" },
  { id: "m3", kind: "ticket_without_charge", detail: "TRV-SF1234 is ticketed but no supplier charge is recorded.", booking_reference: "TRV-SF1234",
    expected: rs(45_770), status: "explained", explanation: "Issued in SooperFare's portal; charge to be added", explained_at: "2026-11-21T07:00:00Z", created_at: "2026-11-21T04:00:00Z" },
] };
export const IMPORTS = { imports: [
  { id: "i1", kind: "bank", file_name: "meezan-november-2026-statement-export.csv", row_count: 42, imported_at: "2026-11-21T06:00:00Z",
    account_label: "Meezan Bank, Travelian current account", matched: 30, suggested: 4, unmatched: 8 },
] };
export const LINES = { lines: [
  { id: "l1", line_no: 2, reference: "IBFT 0098812", description: "IBFT TRV-AB12CD AYESHA KHAN", occurred_on: "2026-11-20", amount: rs(46_700), status: "suggested",
    booking_reference: "TRV-AB12CD", payment_reference: "IBFT-0098812" },
  { id: "l2", line_no: 3, reference: null, description: "CASH DEPOSIT", occurred_on: "2026-11-20", amount: rs(99_900), status: "unmatched" },
] };
