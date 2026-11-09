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

## 3. HIGH: mask identity data in the gateway, with a logged reveal

**Priority: HIGH. Must be done before real customer data is used (roadmap item 4).**

**Masking in the page is not protection.** The Customers screen masks passport numbers (last 4 shown) and dates of birth (hidden), and the Edit form never shows the full passport. But the browser still receives the full values from the API, so anyone can read them with the browser's developer tools or by calling the API directly. Today that API is the legacy `GET /content/customers`, which needs no sign-in (see item 1).

The gateway must:

| Needs | Detail |
| --- | --- |
| Masked values by default | Customer and traveler responses return passport/CNIC as last 4 only and no date of birth, unless the caller has the reveal permission |
| Reveal permission | Users & Access > Roles & Permissions; spec v3.0: "Granted staff only, every reveal logged" |
| Reveal endpoint, logged | Returns one full value to a granted role and writes an Audit Log entry: who, when, which customer, which field |
| Server-side full-number search | Search by full passport number runs in the gateway for granted roles only |
| Replace without reading | Updating a passport accepts a new number without returning the old one (the Edit form already works this way) |

The portal shows no reveal button until this exists.

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

## 5. HIGH: `/v1/group-ticketing/*` returns supplier cost and supplier identity (D23)

**Priority: HIGH. Fix before any agency or customer screen uses these endpoints.** Found while building Search > Group Ticketing (9 November 2026).

The gateway removes the `vendor` field, but the endpoints still give the supplier away. They need no sign-in.

| Leak | Where | Fix |
| --- | --- | --- |
| Supplier cost | `price` is the supplier's own price; the gateway applies no markup | Return a selling price per passenger type (adult, child, infant) in integer paisa with `currency`; return cost only with the cost and margin permission |
| Supplier identity | `airline_logo` URLs are hosted on the supplier's domain | Serve logos from Travelian (by airline code) or drop the field |
| Raw supplier data | `subparts` passes the supplier's records through, including `ticket_airline_id` | Return only normalized segment fields |
| No authentication | `/inventory`, `/search`, `/tickets/{id}` | Require a session; apply D23 per role |

The admin page shows none of these: no price, no logo, no subparts.

## 6. Search (`/admin/search`, internal roles)

| Hidden or not available | Needs |
| --- | --- |
| Flights tab (whole search) | A real flight provider in the gateway live-ticketing search (only the demo vendor exists, disabled). The old admin flight search used the legacy Lambda `/flights/search` and is no longer on this menu for internal roles |
| Hotels tab | Hotel provider search plus Hotel Inventory served by the gateway, one list (D25) |
| Umrah tab | Umrah packages served by the gateway |
| Cards: Available providers, Search expiry, Quotes pending | Provider health endpoint (admin only); fare validity from search results; quotations table |
| Group Ticketing: Children, Infants | `/v1/group-ticketing/search` accepts adults only |
| Group Ticketing: Source (Owned / Supplier), Hold rule | `source` and hold rule on each departure; owned stock in the gateway |
| Group Ticketing: Price per passenger | Selling price per passenger type (section 5) |
| Group Ticketing: Book, Hold seats, Quote; Results summary (seats available, hold expires) | Booking, hold and quote endpoints wired for staff; hold expiry on results |
| Group Ticketing: departure time | Normalized segment times (section 5, `subparts`) |
