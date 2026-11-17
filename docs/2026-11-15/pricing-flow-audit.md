# Pricing and money-flow audit (Flights and Group Ticketing)

Date: 2026-11-15. Read-only audit. No code was changed.
Repos: `travelian` (SPA) and `travelian-api-gateway`, both on branch `feature/admin-dashboard-home`.

All amounts are integer paisa (minor units). The label is "Rs".

## Rules checked

| # | Rule |
|---|------|
| R1 | Selling price may be higher than cost. Profit = selling − cost. |
| R2 | Payments are checked against the selling price. |
| R3 | The group price is known only after the hold, and again at book. Flights recheck the fare at Book, and the customer must agree to any change. |
| R4 | Supplier cost, profit and supplier names never reach customer-facing output. |

## Where values live (shared model)

| Value | Stored in |
|---|---|
| Selling price, booking total | `bookings.total_minor` |
| Supplier cost, booking total | `bookings.supplier_cost_minor` |
| Selling price per traveler | `booking_travelers.selling_minor` |
| Supplier cost per traveler | `booking_travelers.cost_minor` |
| Amount paid | Sum of `booking_payments.amount_minor` |
| Payment status | `bookings.payment_status`: unpaid / part_paid / paid. Set by `app/db/booking_payments.py` `record`. |
| Amount due | Not stored. Computed as total − paid wherever it is shown. |
| Margin / profit | Not stored. Computed as `total_minor − supplier_cost_minor`. |
| Supplier taxes / fees | **Not stored separately.** Supplier totals already include them. |
| Refund | **Not stored anywhere.** No refund table, endpoint or screen exists. |
| D&S supplier amounts | `save_supplier_amounts` in `app/db/group_holds.py`: `total_amount`, `final_total`, `received_amount`, `remaining_amount`, `cancel_status`. Kept for reference only. |

Who sees cost and profit is decided in `app/core/field_visibility.py` (`cost_and_margin`, `supplier_names`):

- Super Admin and Admin see everything.
- Staff see these fields only if granted.
- Agency and customer roles never see them.

## 1. Step-by-step table

### Flights (Southair / AEROST)

| Step | Value | Source | Stored in | Shown to whom |
|---|---|---|---|---|
| Search | Supplier cost (per adult) | Supplier fare, converted by `to_minor` (ROUND_HALF_UP) in `live_flights.py` | Not stored | Only with `cost_and_margin` (`_fare_view`) |
| Search | Taxes / fees | Part of the supplier total | Not stored separately | Not shown separately |
| Search | Selling price (per adult) | `sell(cost)`: cost + `FLIGHT_MARKUP_PERCENT` / `FLIGHT_MARKUP_FIXED_MINOR`, rounded up to a whole rupee. Returns None if no markup is set. | Not stored | Everyone who can search |
| Search | Markup | Settings | Not stored | Not shown |
| Price check at Book (`price_selection`, `reprice`) | Supplier cost | Search run again, plus `fare_info`. Costs per passenger type. Only the adult cost is checked against `FINAL_TOTAL`. | Not stored (Quote only) | `RepriceView.supplier_total` / `margin`, only with cost access |
| Price check at Book | Selling price | `sell()` per passenger type, built into Quote `passengers (kind, count, cost_each, selling_each)` | Not stored | Everyone |
| Price check at Book | Price change | `search_selling_total` vs the new total. Allowed up to `FLIGHT_PRICE_CHANGE_LIMIT_MINOR`, then the user must agree. | Not stored | Everyone (selling only) |
| Hold (`flight_holds.hold`) | Selling price | The agreed selling price per type (fallback `sell(cost)`). Refused if any selling price is below the repriced cost (`price_changed`). | `total_minor`, `booking_travelers.selling_minor` | Admin booking detail, itinerary PDF/PNG |
| Hold | Supplier cost | Booking level: `stored_cost` from the pnr_info / fare_info total. Traveler level: the repriced per-type cost. | `supplier_cost_minor`, `booking_travelers.cost_minor` | Only with cost access (`HoldView`, `admin_bookings.build_detail`) |
| Hold | Profit | `total − supplier_cost` | Not stored | Only with cost access |
| Payment (`booking_payments.record`) | Amount paid | Staff entry | `booking_payments` | Admin detail, PDF/PNG (Paid / Due) |
| Payment | Amount due | `total_minor − paid` | Not stored | Admin detail, PDF/PNG |
| Issue (`issuance.issue`) | Supplier cost | pnr_info total at issue time. New cost > selling total → `below_cost`. A different cost → 409 `supplier_cost_changed`, unless `accepted_cost_minor` matches; then `store.update_cost`. | `supplier_cost_minor`; travelers get an even split (`update_cost`) | Only with cost access |
| Issue | Selling price | Unchanged | `total_minor` | Everyone with access |
| Issue | Ticketing balance | Ticketing pays `state.total`. The supplier balance is checked against the cost. | Not stored | Admin |
| Expiry (`flight_expiry.expire_due`) | Amount paid | Payments are kept. The `hold_expired` event logs `payment_recorded_refund_by_hand` with the amount. | `booking_events.details` | Logs / event only |
| Cancel | — | **No flight cancel exists** | — | — |
| Refund | — | **No refund exists** | — | — |

### Group Ticketing (Skypass, Dhillu & Sahi, Al Haider)

| Step | Value | Source | Stored in | Shown to whom |
|---|---|---|---|---|
| Listing / search | Supplier cost | `supplier_cost(ticket)` in `group_ticketing_view.py`: Decimal, ROUND_HALF_UP, currency PKR by default | Not stored | Only with `cost_and_margin` |
| Listing | Selling price | `selling_price(cost)`: cost + `GROUP_TICKETING_MARKUP_*`, rounded up to a whole rupee | Not stored | Everyone |
| Listing | Supplier, PNR, group source | Supplier data | Not stored | Only with `supplier_names` |
| Hold (`group_holds.hold`) | Selling price per seat | `_selling_each`: the staff-entered value (if the user has `record_payments`) or the default `selling_price(cost)`. Checked by `check_selling`. | `create_pending` stores the listing totals; then `total_minor`, `booking_travelers.selling_minor` | Admin detail, PDF/PNG |
| Hold | Supplier cost | After the supplier hold: `held.supplier_total` (D&S `total_amount`) or the listing cost | `supplier_cost_minor`, `booking_travelers.cost_minor` | Only with cost access |
| Hold | Price change | `{shown_cost_total_minor, held_cost_total_minor, accepted}`. `accept_held_price` refuses a selling price below cost. | Booking (price_change state) | Admin; `below_cost` flag only with cost access |
| Hold | Price per adult | `build_view`: `total // adults` | Not stored | Admin |
| Price check / Book (`_new_price`) | Selling price | **Recomputed** as `selling_price(new cost)` and compared with `booking.total_minor` | — | Admin |
| Issue → `accept_price` | Selling price and cost | Resets `total_minor` to the default selling price and `supplier_cost_minor` to the new cost | `bookings` only (**travelers not updated**) | Admin |
| Payment | Amount paid / due | Same as flights (`booking_payments.record`) | `booking_payments` | Admin detail, PDF/PNG |
| Release / cancel | Status | Group release → `cancelled` | `booking_status` | Admin |
| Expiry | Amount paid | Same as flights: logged for a refund by hand | `booking_events` | Logs only |
| Refund | — | **No refund exists** | — | — |

### Reporting and documents

| Output | Values | Shown to whom |
|---|---|---|
| Admin booking detail (`admin_bookings.build_detail`) | `fare.total`, `per_passenger`, paid, due. `fare.margin = total − supplier_cost` with cost access. Group PNR (`visible_pnr`) needs supplier names. | Back office, per permission |
| Admin dashboard (`admin_dashboard`) | `total_sales` = sum of `total_minor`, PKR only. `gross_profit = total − cost` with cost access. | Back office |
| Itinerary PDF / PNG (`itinerary_pdf.py`) | Traveler `selling_minor`, Total, Paid, Due. Never cost, profit or supplier. | Back office, for sending to customers |
| Legacy `src/lib/eticket-pdf.ts` | Base, addons, taxes, total from `/content/bookings` | Legacy pages |
| `src/lib/ticket-invoice-pdf.ts` | Selling only | — |

## 2. Recomputations, rounding, currency and tax differences

1. **The group selling price is recomputed at price check and issue.** `_new_price` recomputes `selling_price(cost)` and compares it with `booking.total_minor`.
   - When staff edited the selling price at hold, the two never match. The booking always shows as "price changed", even when the supplier cost did not move.
   - `accept_price` then overwrites the staff's selling price with the default markup price.
2. **Flight hold uses two different costs.**
   - `stored_cost` (pnr_info / fare_info total) becomes `supplier_cost_minor`.
   - Traveler `cost_minor` and the below-cost check use the repriced per-type cost.
   - When these differ, the booking cost and the sum of traveler costs disagree.
3. **`update_cost` (flight issue) splits the new cost evenly** over all travelers. It ignores passenger type, so adult, child and infant costs become wrong at traveler level.
4. **Rounding is not the same everywhere.**
   - Supplier cost uses ROUND_HALF_UP (`to_minor`, `supplier_cost`).
   - Selling prices are rounded up to a whole rupee (`sell`, `selling_price`).
   - Payments and staff-entered selling prices can be in paisa.
5. **Some divisions drop the remainder.**
   - The group price per adult is `total // adults` (`build_view`).
   - The D&S hold price is `total_amount // adults` (`dhillu_sahi/holds.py price()`).
   - Example: Rs 100,001 for 2 adults shows Rs 50,000 each, and Re 1 is lost from the per-seat view. Traveler amounts built from this can add up to less than the total.
6. **Currency differs by product.**
   - Group costs default to PKR when the supplier sends no currency.
   - Flights use the account currency.
   - The dashboard counts PKR only, so any non-PKR booking is left out of sales and profit without warning.
7. **Taxes and fees are not split out.**
   - The gateway stores one supplier total that already includes taxes and fees.
   - The legacy frontend model (`BookingPricing {base, addons, taxes, total, supplierCost?}` in `src/lib/booking-store.ts`) has its own split, built from `/content/bookings`.
   - The two do not match, and the legacy e-ticket prints a tax line the gateway never supplied.

## 3. Cases where selling, paid and profit can disagree

| # | Case | Effect |
|---|---|---|
| D1 | A group booking is paid in full, then `accept_price` at issue lowers `total_minor` (default selling price on the new cost is lower than the staff price). | Paid > total. Due is negative. There is no refund record. Profit is shown on the lower total. |
| D2 | A group booking's `accept_price` changes `total_minor` / `supplier_cost_minor` but not `booking_travelers`. | The per-passenger amounts in admin detail and the itinerary PDF no longer add up to the Total line. |
| D3 | A flight hold has `stored_cost` ≠ the repriced cost. | Booking profit (`total − stored_cost`) differs from the sum of traveler profits. The below-cost check used the other cost, so a booking can be stored with selling < `supplier_cost_minor`, which means a negative profit. |
| D4 | A flight hold returns 502 `total_unverified` after the booking is already saved. | A held booking exists with an unverified total. Payments can be recorded against it. |
| D5 | A flight is issued with an accepted new cost. | `supplier_cost_minor` is correct. Traveler costs are an even split, so per-type profit is wrong. |
| D6 | Imported bookings were backfilled with cost = total. | The dashboard shows profit 0 for them. Real profit is unknown. |
| D7 | A booking expires (flight or group) after a payment was recorded. | Status `expired`, paid > 0, no ticket, no refund record. Only a `booking_events` entry and a log line say money is owed back. |
| D8 | A group booking is released or cancelled after a payment. | Status `cancelled` with money paid. No refund flow. |
| D9 | Per-adult truncation (`// adults`). | Seat price × adults < total, by up to (adults − 1) paisa or rupees. |
| D10 | Legacy pages read pricing from `/content/bookings`. | Their totals and tax split can differ from the gateway's `total_minor` for the same booking. |

## 4. Missing checks

1. **No refund model.** Refunds and cancellations with refunds have no table, endpoint, status or audit trail. Money paid on expired or cancelled bookings is only logged.
2. **No flight cancel** endpoint or status change.
3. **`accept_price` (group issue) is missing three checks:**
   - it does not refuse a new total below the amount already paid;
   - it does not update traveler amounts;
   - it does not keep a selling price that staff set by hand.
4. **Group price check confuses a markup change with a cost change.** `_new_price` should compare the supplier cost, not the recomputed selling price, to tell whether the supplier price changed (R3).
5. **No below-cost check against `stored_cost` at flight hold.** The check uses the repriced cost only.
6. **Flight booking saved before the total is verified.** No block on payments while the total is unverified.
7. **Only the adult cost is checked against `FINAL_TOTAL`** in `price_selection`. Child and infant costs are not checked.
8. **No check that traveler amounts add up to the booking totals**, for selling or for cost, after any change (`accept_price`, `update_cost`, truncating divisions).
9. **No currency check on the dashboard.** Non-PKR bookings are dropped from totals without a warning.
10. **The customer agreement to a flight fare change is not stored** as a separate record. Only the accepted amount is used in the request (`accepted_cost_minor` at issue).

## 5. Customer-facing exposure (R4)

| # | Finding | Severity |
|---|---|---|
| E1 | `src/pages/BookingRequestsPage.tsx` is shown to non-internal (agency) roles through `LegacyRequestsRoute`. It shows a **"Supplier"** column and detail line (`supplierLabel(item.provider)`). | High: supplier names reach agency roles. The page also reads the old `/content/*` data instead of the gateway. |
| E2 | `src/pages/FlightBookingsPage.tsx` and `src/lib/eticket-pdf.ts` use `/content/bookings` (the old unauthenticated Lambda). `BookingPricing.supplierCost` and `provider` are in the data model the browser receives. | High: the gateway does not filter the response, so cost can reach the browser even if the page hides it. |
| E3 | The public `GroupTicketingPage.tsx` shows a **"Supplier Reference"** box and a tooltip "Supplier reference code: G1…" (`getSupplierGCode`). | Low: the code is a G-number, not a name, but it tells customers there is a supplier and which one, by code. |
| E4 | Gateway outputs checked: `_fare_view`, `RepriceView`, `HoldView`, group `ticket_view`, `build_view`, `admin_bookings.build_detail`, `admin_dashboard`, itinerary PDF/PNG. | OK: cost, profit and supplier fields are returned only with `cost_and_margin` / `supplier_names`. The PDF/PNG never prints them. |

## Suggested order of fixes (for approval; nothing changed yet)

1. E1 and E2: remove supplier names and cost from agency-facing legacy pages, and move those pages to the gateway.
2. Group `_new_price` / `accept_price`:
   - compare costs, not selling prices;
   - keep the staff selling price;
   - update travelers;
   - refuse a total below the amount paid.
3. Flight hold: one cost source; a below-cost check on the stored cost; no saved booking (or a blocked payment) when the total is unverified.
4. `update_cost`: split per passenger type.
5. Replace `// adults` with an exact split (remainder on the first traveler).
6. Design a refund and cancel model: refund records, statuses, and a dashboard queue for "paid but expired or cancelled".
7. Dashboard: show non-PKR bookings separately. Mark backfilled costs as "cost unknown" instead of profit 0.
