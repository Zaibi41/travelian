# Backend to-do

What the frontend is waiting for. When a card, filter or widget is hidden because its data doesn't exist yet, it is listed here with the endpoint or table it needs.

## 1. Fix first: `/content/bookings` is unauthenticated (security)

`GET https://api.travelian.pk/content/bookings` (legacy content API, DynamoDB) needs no sign-in and returns every booking, including traveler contact details and `pricing.supplierCost`. Anyone with the URL can read supplier cost and margin. Current admin pages filter by role in the browser after all data has arrived, which protects nothing.

The writes are open too: `POST /content/bookings` and `PATCH /content/bookings/{id}` accept any caller, so booking records (and the dashboard figures read from them) can be created or altered by anyone. Cause: the content Lambda's `requireApiAuth` defaults to `TRAVELIAN_API_AUTH_MODE=off`; its only other mode is a single shared API key, which a browser can't keep secret.

Current state (checked 2026-11-05): the FlightApiFunction Lambda has no `CONTENT_TABLE` setting, so its `/content/*` routes fail with 500 and the hole is inactive. Do not add `CONTENT_TABLE` to it before this is fixed, or the open read/write routes come back.

Related: the `travelian-group-ticketing-proxy` Lambda has `CORS_ORIGIN=*`, so any website can call it from a browser. It only reads the group-ticketing supplier list (`pk = "GROUP_TICKET_COLLECTION"`), but should allow only the portal's exact origins.

Needed: require authentication on all `/content/bookings` routes (GET, POST, PATCH), scope results by role on the server, and never return supplier cost or margin to agency or customer roles. The Admin Dashboard does not use this endpoint; it reads the same DynamoDB records server-side through the gateway.

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
| Travel date (Date type) | Travel date on bookings (itinerary) |
| Search by ticket number, passenger or phone | Tickets and passengers tables; server-side search |
| Flights: Airline, Route, Travel date, Trip type columns/filters | Itinerary segments on bookings |
| Flights: TTL filter | Defined TTL buckets (spec doesn't list the options yet) |
| Flights: Request issuance, Hold payment actions | Issuance request and payment hold endpoints |

### Other sub-menus (shown as "not available yet")

| Sub-menu | Needs |
| --- | --- |
| Group Ticketing | Group booking fields: departure, seats, manifest status, name-list deadline, supplier, deposits; actions add passengers, confirm, release hold |
| Hotels | Hotel booking fields: hotel, rooms, dates, voucher, cancellation date; send voucher |
| Umrah | Package, travelers, visa status, installments, service status |
| Inquiries & Requests | Inquiries/requests table in the gateway (status, owner, source, SLA, linked booking); assign, reply, convert. The old `/content/booking-requests` screen is not connected to the new page |
| Quotations | Quotations table (status, customer or agency, route or package, price, expiry); send, revise, convert after revalidation |

### Booking detail

| Hidden or not available | Needs |
| --- | --- |
| Overview: Owner (and Assign), Supplier status | Assignment; supplier status |
| Itinerary tab | Segments: from, to, departs, arrives, airline/flight, cabin, baggage |
| Passengers tab | Passengers with masked document and date of birth, and the logged reveal (section 3) |
| Fare: searched price, booked price, difference, base fare, taxes, fees, service charge, discount | Fare breakdown stored at booking time (spec 19.7) |
| Payments tab | Customer/agency payments: method, amount, received at, verified by, receipt |
| Supplier payment: transfer reference, time sent, confirmation, paid from | Supplier payments table |
| Tickets tab (incl. supplier response, admin only) | Tickets table |
| Servicing tab | Servicing cases: refund, reissue, void, cancellation |
| Audit tab | Booking audit log |

## 5. Group Ticketing D23: fixed on 9 November 2026

`/v1/group-ticketing/*` now requires sign-in (internal or agency role), returns a selling price (supplier price + `GROUP_TICKETING_MARKUP_PERCENT` + `GROUP_TICKETING_MARKUP_FIXED_MINOR`), serves logos from `/v1/logos/{id}`, and returns supplier name, supplier PNR, raw segments and supplier cost only with the matching permission.

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
| Hotels tab | Hotel provider search plus Hotel Inventory served by the gateway, one list (D25) |
| Umrah tab | Umrah packages served by the gateway |
| Cards: Available providers, Search expiry, Quotes pending | Provider health endpoint (admin only); fare validity from search results; quotations table |
| Group Ticketing: "Departure Date (Optional)" / "All departure dates" (public site wording) | `POST /v1/group-ticketing/search` requires `departure_date` and filters by that exact date (and by seats left). Make it optional (all dates) in the gateway; until then the admin date stays required |
| Customers & Travelers: list saved customers when the page opens (newest first, paged) | `GET /v1/admin/customers` requires `q` (at least 3 characters). Needs a list mode without `q` (or a separate list endpoint): newest first, paged, same masking and permissions |
| Group Ticketing: Children, Infants | `/v1/group-ticketing/search` accepts adults only |
| Group Ticketing: Source (Owned / Supplier), Hold rule | `source` and hold rule on each departure; owned stock in the gateway |
| Group Ticketing: child and infant prices | Price per passenger type (section 5) |
| Group Ticketing: Book, Hold seats, Quote; Results summary (seats available, hold expires) | Booking, hold and quote endpoints wired for staff; hold expiry on results |

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

