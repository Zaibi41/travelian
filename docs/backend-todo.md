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
