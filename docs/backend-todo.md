# Backend to-do

What the frontend is waiting for. When a card, filter or widget is hidden because its data doesn't exist yet, it is listed here with the endpoint or table it needs.

## 1. Fix first: `/content/bookings` is unauthenticated (security)

`GET https://api.travelian.pk/content/bookings` (legacy content API, DynamoDB) needs no sign-in and returns every booking, including traveler contact details and `pricing.supplierCost`. Anyone with the URL can read supplier cost and margin. Current admin pages filter by role in the browser after all data has arrived, which protects nothing.

The writes are open too: `POST /content/bookings` and `PATCH /content/bookings/{id}` accept any caller, so booking records (and the dashboard figures read from them) can be created or altered by anyone. Cause: the content Lambda's `requireApiAuth` defaults to `TRAVELIAN_API_AUTH_MODE=off`; its only other mode is a single shared API key, which a browser can't keep secret.

Current state (checked 2026-11-05): the FlightApiFunction Lambda has no `CONTENT_TABLE` setting, so its `/content/*` routes fail with 500 and the hole is inactive. Do not add `CONTENT_TABLE` to it before this is fixed, or the open read/write routes come back.

Related: the `travelian-group-ticketing-proxy` Lambda has `CORS_ORIGIN=*`, so any website can call it from a browser. It only reads the group-ticketing supplier list (`pk = "GROUP_TICKET_COLLECTION"`), but should allow only the portal's exact origins.

Needed: require authentication on all `/content/bookings` routes (GET, POST, PATCH), scope results by role on the server, and never return supplier cost or margin to agency or customer roles. The Admin Dashboard does not use this endpoint; it reads the same DynamoDB records server-side through the gateway.

Frontend change (2026-11-15): agency and customer roles no longer load the old screens that read `/content/bookings` and `/content/booking-requests` (`/admin/flight-bookings`, including its Invoices and Refunds tabs, and `/admin/requests`). They see the menu placeholder, so their browsers never request supplier names or `supplierCost`. This does not close the hole: the Lambda still returns everything to anyone who calls it directly, until it is locked down or retired.

Needed to bring those screens back for agency roles: `GET /v1/agency/bookings` (gateway, Cognito token), scoped to the caller's `bookings.agency_id`, returning selling price, paid and due only. It must never return supplier cost, margin, profit, supplier or provider names, or airline IDs (field visibility, not page hiding).

## 2. Admin Dashboard home (`/admin`)

### Endpoints (travelian-api-gateway, `/v1`, Cognito access token)

Status (2026-11-06): built in the gateway and working locally. Data source: the gateway's own Postgres `bookings` table (migration 0008). The DynamoDB reader was removed; no AWS access is needed. Locally the table holds 18 legacy test bookings imported from a CSV export, tagged `import_source = 'legacy_test_csv'` (remove with `python -m app.cli.import_bookings_csv --remove`).

Still needed: booking creation through the gateway (nothing writes new bookings yet), and supplier cost and provider on bookings (Gross profit and the Provider / source filter stay empty without them). Agency-scoped dashboards stay blocked (403) until bookings carry verified agency ownership.

Figures the gateway omits rather than guess: Total sales if any paid booking isn't priced in PKR; Gross profit if any paid booking lacks supplier cost. Retired Tour/Visa bookings are excluded.

| Endpoint | Used by |
| --- | --- |
| `GET /v1/admin/dashboard/summary?period&product&provider` | Bookings needing action, Business results |
| `GET /v1/admin/dashboard/booking-report?period` | Booking report |
| `GET /v1/admin/attention-queue?limit&product&provider` | Attention Queue |
| `GET /v1/admin/dashboard/filter-options` | Product and Provider / source filter choices |

The gateway also needs CORS for the portal origins.

### Hidden until their data exists

| Hidden element | Why it is hidden | Needs |
| --- | --- | --- |
| Unknown issuance card | No issuance-attempt record, so a supplier timeout can't be told apart from "not issued". | Issuance attempts table with an `unknown` outcome |
| Money and balances section: Low airline balance, Provider balances not verified today, Supplier payments awaiting confirmation, Refunds awaiting airline, Overdue agency credit | No ledger, airline-ID balances, supplier accounts, refund receivables or agency credit. | Ledger, airline ID and supplier account tables; finance-visibility permission |
| Recent activity panel | No audit log of booking actions. | Audit/activity log table and endpoint |
| Owner column in Attention Queue | No case ownership or assignment. | Case assignment on bookings or cases |
| Branch filter | No branch master; bookings have no branch. | Branches table; `bookings.branch_id` |
| Channel filter (B2C / B2B) | Bookings have no channel. | `bookings.channel` |
| Agency filter | Bookings have no reliable agency owner. | `bookings.agency_id` populated from authenticated ownership |

## 3. Identity masking in the gateway: done on 10 November 2026

Bookings and saved customers and travelers return masked values only (document last 3 characters,
date of birth and expiry year only, masked phone and email). The booking traveler reveal needs the
reveal permission and a reason and is logged. Saved people have no reveal (Zohaib's decision).
The admin no longer calls `/content/customers`. Still open: database protection for the plain-text
identity values (roadmap go-live blocker).

## 4. Bookings (`/admin/bookings`) and Booking detail (`/admin/bookings/{id}`)

Built on `GET /v1/admin/bookings` and `GET /v1/admin/bookings/{booking_id}` (back office only; supplier names, supplier cost, margin and the Supplier payment tab are left out of the response without the matching permission, D23). The page hides everything below until its data exists.

### Bookings register (All Bookings and Flights)

| Hidden | Needs |
| --- | --- |
| Unknown Issuance card | Issuance attempts table with an `unknown` outcome (same as Dashboard) |
| Unassigned card, Assign action | Booking owner / assignment (`bookings.owner_user_id`) and an assign endpoint |
| Add note action | Booking notes table and endpoint |
| Create manual booking | Manual/offline booking endpoint (spec 19.5, D16) |
| Supplier status filter and chip | Supplier status on bookings (five-axis model, D5) |
| Source type (own airline ID or supplier) | `bookings.source_type`; airline IDs table |
| Branch filter | Branches table; `bookings.branch_id` |
| Created by filter | `bookings.created_by_user_id` returned with user names (column exists, not populated or returned) |
| Issued by filter, Ticket number column, Issued today card | Tickets table: ticket number, issue time, issued by |
| Travel date (Date type) | Travel date on bookings (itinerary) (now stored per booking in `bookings.itinerary` for new holds; list filters not built) |
| Search by ticket number, passenger or phone | Tickets and passengers tables; server-side search |
| Flights: Airline, Route, Travel date, Trip type columns/filters | Itinerary segments on bookings (now stored per booking in `bookings.itinerary` for new holds; list filters not built) |
| Flights: TTL filter | Defined TTL buckets (spec doesn't list the options yet) |
| Accounts & Ledgers for a Finance role | Finance > Accounts & Ledgers (receiving accounts) is Super Admin only because there is no `finance` role yet. Add the role, then add it to the gateway's `FINANCE_ACCOUNT_ROLES` and the portal's `financeAccountRoles` |
| Audit of receiving-account changes | `payment_accounts` keeps who added an account and when one was deactivated, but not who deactivated it; there is no general audit log to write to (spec: Audit Log) |
| Accounts & Ledgers: Chart of accounts, Provider accounts, General ledger, Manual journals tabs | Ledger tables and endpoints (spec §5); shown disabled with "Not built" |
| Tickets tab: Issue time, Issued by | Passengers carry `ticket_number` only. Issue time and who issued per ticket (the Audit tab has the issuing event) |

### Group Ticketing sub-menu (listed in the Flights layout)

| Missing | Needs |
| --- | --- |
| Departure, seats, manifest status, name-list deadline, deposits columns; add passengers, confirm, release hold actions | These group booking fields on `GET /v1/admin/bookings?product=group` and the actions in the gateway |
| Awaiting issuance and Payment pending cards | The dashboard's issuance and payment rules (`is_pending_issuance`, `is_payment_pending`) cover flights only; extend them to group bookings, then return the cards for `product=group` |

### Other sub-menus (shown as "not available yet")

| Sub-menu | Needs |
| --- | --- |
| Hotels | Hotel booking fields: hotel, rooms, dates, voucher, cancellation date; send voucher |
| Umrah | Package, travelers, visa status, installments, service status |
| Inquiries & Requests | Inquiries/requests table in the gateway (status, owner, source, SLA, linked booking); assign, reply, convert. The old `/content/booking-requests` screen is not connected to the new page |
| Quotations | Quotations table (status, customer or agency, route or package, price, expiry); send, revise, convert after revalidation |

### Booking detail

| Hidden or not available | Needs |
| --- | --- |
| Overview: Owner (and Assign), Supplier status | Assignment; supplier status |
| Itinerary tab: cabin, and the flights of bookings held before 14 Nov 2026 | Done for new holds: `bookings.itinerary` (migration 0018) holds each flight as held (no cabin; the fare name instead). Older holds have none; a documented supplier PNR segment lookup would be needed to fill them |
| Passengers tab | Passengers with masked document and date of birth, and the logged reveal (section 3) |
| Fare: searched price, booked price, difference, base fare, taxes, fees, service charge, discount | Fare breakdown stored at booking time (spec 19.7) |
| Payments tab | Customer/agency payments: method, amount, received at, verified by, receipt |
| Supplier payment: transfer reference, time sent, confirmation, paid from | Supplier payments table |
| Tickets tab (incl. supplier response, admin only) | Tickets table |
| Servicing tab | Servicing cases: refund, reissue, void, cancellation |
| Audit tab | Booking audit log |

## 5. Group Ticketing D23: fixed on 9 November 2026

`/v1/group-ticketing/*` now requires sign-in (internal or agency role), returns a selling price per adult (listing price + `GROUP_TICKETING_MARKUP_PERCENT` + `GROUP_TICKETING_MARKUP_FIXED_MINOR`; unset counts as 0, so the listing price), serves logos from `/v1/logos/{id}`, and returns supplier name, supplier PNR, raw segments and supplier cost only with the matching permission.

Still open:

| Needs | Detail |
| --- | --- |
| Markup rules in Pricing & Revenue | The markup is one gateway setting for all group fares. Per-route/airline/channel rules need a markup rules table |
| Child and infant prices | The supplier sends one price; the page shows it per adult |
| `/check-availability` input | Still takes the supplier `price`, which non-permitted callers can't see. Change it to take the ticket ID |

## 6. Search (`/admin/search`, internal roles)

| Hidden or not available | Needs |
| --- | --- |
| Flights tab, shown but disabled: Multi-city, cabins other than Economy, Fare rules, Book, Hold, Quote; Refundable filter (disabled when no fare has refund data) | Southair search has no multi-city or cabin parameter and no fare-rules or quotations endpoint; Book and Hold wait for the hold step (passenger form) and the booking flag. Search runs on Southair through `/v1/live-ticketing/flights/search` |
| Flights tab, hidden or placeholder: Quotes pending card, "Staff fare" tag, airline logo (neutral placeholder), refund per fare, Fare rules and the Refundable filter ("Not available yet"), meal and hold time ("not available") | A quotations table; a fare type field on `FareView`; a gateway-served `logo_url` on `FlightView`; refund, meal and hold-time data from the supplier (fare rules). Note: reprice does not return refund data yet |
| Legacy flight search (agency roles, `/admin/flights-search`) | Still calls the legacy Lambda `/flights/search`; its response (network tab) contains supplier IDs, names and CDN logo URLs. The admin page no longer shows or links them, but only moving this search to the gateway removes them from the network. Admin checkout shows no price and blocks booking until the gateway reprices |
| Hotels tab: Hotel Inventory hotels in the same list (D25) | Built on RateHawk through `/v1/hotels/search` (17 November 2026). Manual hotels need a Hotel Inventory table and a gateway search over it, merged into that answer with source "Hotel Inventory" |
| Hotels tab: Book, Hold, Quote | Hotelpage, prebook and booking routes on `/v1/hotels/...` that use the search's rate IDs (RateHawk `search/hp/`, `hotel/prebook/`, `hotel/order/booking/form/` + `finish/` + `finish/status/`), a hotel booking record in `bookings`, and an approved booking screen. The RateHawk calls already exist in the Super Admin console (`/v1/admin/suppliers/ratehawk/operations/{key}`), writes behind `RATEHAWK_WRITE_ENABLED`; quotations table for Quote |
| Hotels tab: rates in Rs | RateHawk's sandbox rejects PKR, so rates are in USD. Needs a production key that prices in PKR, or an agreed exchange-rate source in the gateway |
| Hotels tab: Popular destinations other than Dubai | The RateHawk sandbox's destination search finds only Dubai (Makkah, Madinah, Istanbul return nothing). Check again with the production key |
| Umrah tab | Umrah packages served by the gateway |
| Cards: Available providers, Search expiry, Quotes pending | Provider health endpoint (admin only); fare validity from search results; quotations table |
| Group Ticketing: "Departure Date (Optional)" / "All departure dates" (public site wording) | `POST /v1/group-ticketing/search` requires `departure_date` and filters by that exact date (and by seats left). Make it optional (all dates) in the gateway; until then the admin date stays required |
| Group Ticketing: Children, Infants | `/v1/group-ticketing/search` accepts adults only |
| Group Ticketing: Hold rule | Hold rule on each departure (Skypass sends `on_hold_rule`, meaning undocumented) |
| Group Ticketing: child and infant prices | Price per passenger type (section 5). The hold flow is adults only |
| Group Ticketing: Book, Quote; Results summary (seats available, hold expires) | Booking and quote endpoints; hold expiry on results |
| Group Ticketing: Issue tickets is off for every group booking ("Issuing is not available for this provider yet") | An issue call per provider. Skypass `submit-booking` is not built: whether it issues tickets or confirms a booking, and when payment is due, are unconfirmed. Dhillu & Sahi has no issue call |
| Group Ticketing: Hold seats is off for Dhillu & Sahi fares | A hold and release call from Dhillu & Sahi (only add-booking exists) |
| Group Ticketing: Al Haider fares | An adapter (inventory, hold, release) and credentials: `AL_HAIDER_BASE_URL`, `AL_HAIDER_EMAIL`, `AL_HAIDER_PASSWORD` (its collection logs in with email and password) |
| Group Ticketing: owned stock | Travelian-owned group inventory in the gateway (`stock: owned` is reserved for it) |

## 7. Customers & Travelers (`/admin/customers`)

Built on `/v1/admin/customers` (search, detail, add, edit, documents, merge) and
`/v1/admin/bookings/{id}/saved-people/{role}/{position}/resolve`. Hidden until the backend has them:

| Hidden | Needs |
| --- | --- |
| Customers cards: Total Customers, New Customers, Saved Travelers, Duplicate Profiles, Documents expiring, Flagged customers | A counts endpoint for saved people (totals, new in period, possible duplicates, documents expiring within 6 months, flagged) |
| Travelers cards: Saved, Expiring documents, Missing details | The same counts endpoint |
| Filters: Source, Agency, Branch, Last booking, Document validity, Flag, Nationality, Document expiry, Customer (owner) | Filter parameters on `GET /v1/admin/customers`, and a list without a search term (today the search needs 3 characters) |
| Columns: Bookings (count), Flag, Notes; action Flag with reason | A bookings count on the search result; flags with reasons and notes on `saved_people` (table, endpoints, audit) |
| Communications (P3) tab | Message history from the notification service |


## 8. Group Ticketing: final PNR and tickets

Staff record the final PNR and ticket numbers on the booking's Tickets tab
(`POST /v1/group-ticketing/holds/{id}/tickets`). Not filled in automatically yet:

| Missing | Needs |
| --- | --- |
| Final PNR and ticket numbers from the supplier | Dhillu & Sahi `agent-booking-detail` returns the group PNR only (`data.data.pnr`, `groupdata.pnr`); its documented passenger records (`booking_sub[]`) have no ticket number. Ask Dhillu & Sahi for the final PNR and ticket fields, then read them in `refresh_supplier` (Skypass and Al Haider: check their booking reads the same way) |
| Paid group holds outliving their hold time | The expiry job still expires a paid group hold that has no final PNR yet at its time limit (unchanged behaviour). Recording the final PNR moves the booking to confirmed, so it no longer expires |
