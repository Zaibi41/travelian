# Admin flight and group flows: investigation (19 November 2026)

What the code and the live system actually do today, before any change. Measured on production unless stated.

## A1. Hold integrity (Southair)

- Frontend: `HoldFlightPage.tsx:83-87` calls `POST /v1/live-ticketing/flights/bookings` and shows "held" only when the
  gateway answers 201; any error shows the problem page. The frontend never assumes a hold.
- Gateway: `app/services/flight_holds.py` saves `booking_status='held'` (`app/db/supplier_bookings.py:115`) only after
  Southair's booking answer has `booking_status == 1`, an alphanumeric `pnrn` and a non-empty `ticket_ref`
  (`flight_holds.py:337`) **and** Southair's own PNR record (`pnr_info`) confirms the same total (`:360`).
- **Gap:** `time_limit` is not required. `_time_limit()` (`flight_holds.py:251`) returns `None` for a format it doesn't
  know, and the hold is still saved, with no expiry. Fixed in B1: no parseable time limit, not saved.
- Group holds: Skypass answers without a PNR (documented in `docs/api/group-holds.md`); those holds are saved with the
  group's PNR from the listing. Unchanged (B1 is about Southair).

## A2. Payment and issuing

- Gateway issuing (`app/db/issuance.py:83`) refuses unless recorded payments cover the total. Payments are recorded by
  staff (bank transfer, JazzCash, 1LINK) or, for **website group bookings only**, from a PayFast result the gateway
  verified (`validation_hash` = SHA-256 of `basket_id|secured_key|merchant_id|err_code` with the secured key, plus the
  amount; `app/services/public_booking.py`, `app/db/public_bookings.py`). No stub marks anything paid in the gateway.
- **Legacy stub path still live:** the public booking page's non-group flight checkout (`BookingPage.tsx:484-496`) still
  calls the old Lambda `POST /payments/payfast/session` (PayFast UAT), and the Lambda's
  `POST /payments/payfast/callback` marks a booking paid from whatever it is sent, with **no verification and no login**
  (`payfast.mjs updatePayFastPayment`). Those bookings are DynamoDB records with no supplier booking, so nothing is issued
  from them, but "paid" there can be forged. Disabled in B2.
- PayFast credentials: AWS Secrets Manager `travelian/payments/payfast` (UAT host `ipguat.apps.net.pk`), copied into the
  server's `.env` on 18 November. Not in Parameter Store (D).

## A3. Selling price and buying fare

- `app/services/live_flights.py sell()`: selling = cost × (1 + `FLIGHT_MARKUP_PERCENT`/100) + `FLIGHT_MARKUP_FIXED_MINOR`.
  No multiplier in code. **The server has `FLIGHT_MARKUP_PERCENT=100`**, copied from the local development `.env` when the
  server settings were filled on 17 November. That is the 2× price.
- Buying fare **is** stored per booking: `bookings.supplier_cost_minor` and `booking_travelers.cost_minor`
  (migration 0021), set at hold time from Southair's `pnr_info` total (Southair) or SooperFare's booking list (SooperFare).
  The dashboard and Fare tab already read these stored values.
- **Gap:** Pricing & Revenue's markup rules are not wired into checkout at all. They live in the legacy Lambda
  (`/content/pricing-rules`, currently **0 rules**) and the gateway never reads them.

## A4. Airline identification

- Southair: each segment's `OPRT` object: `name`, `iata_code`, `icao_code`, `ticket_code` (operating carrier); the
  callsign prefix is the fallback (`southair/normalize.py:186-218`). No separate marketing carrier.
- SooperFare: `marketing_carrier.iata` per flight and `operating_carrier.iata` per segment.
- Restricted-airline matching therefore uses IATA codes (marketing and operating), never names.

## A5. LHE → JED group search empty

- Not a supplier gap and not a gateway date bug: the gateway has **15 LHE→JED fares** (direct return fares 21 Nov –
  21 Dec and connections via MCT 20–29 Nov) and returns them for each date searched.
- The **public Group Ticketing page still reads the legacy Lambda feed** (`group-ticketing.ts fetchGroupTickets` →
  `/group-ticketing/groups`), which has only the `LHE-MCT-JED` connections (20–29 Nov) and **none of the direct LHE-JED
  return fares**. So the public page is empty for most dates. Other sectors show the same pattern for return fares.

## A6. G1 / G2 / G3

- Not allotment or block codes: **disguised supplier codes** from `getSupplierGCode()` (`group-ticketing.ts:317`):
  Al Haider → G1, Dhillu & Sahi → G2, Skypass → G3, Travel n Tours → G4.
- Rendered to customers on the public Group Ticketing page (`GroupTicketingPage.tsx:331-333` badge with tooltip
  "Supplier reference code", `:457` "Reference Code", `:481` badge, `:605`) and in the pre-filled WhatsApp message
  (`group-ticketing.ts:635`).
- The real batch identity of a group fare is the supplier's group id and group PNR, already stored on group bookings
  (`supplier_response.source`).

## A7. Public flight search speed (KHI-LHE, cold, from the server)

| Part | Time |
|---|---|
| Southair search (network + supplier) | 1,682 ms (parallel with SooperFare) |
| SooperFare login | 823 ms, once (session cached ~24 h) |
| SooperFare availability (before the airline searches: sequential) | 831 ms |
| SooperFare airline searches, parallel | Airblue 4,026 ms; PIA 2,418; AirSial 2,009; Fly Jinnah 1,998; Z8 1,461 |
| Gateway processing (merge, map) | a few ms |
| Whole cold search on the server | 3,940 ms; answer 9.6 KB (raw supplier data ~95 KB) |
| Same search again (cache) | 0 ms on the server; 602 ms end to end (TLS + network) |
| End to end, cold (KHI-ISB) | 4,969 ms; 1.8 KB answer |

The floor is external (Airblue through SooperFare, ~4 s). The avoidable part is the sequential availability call.
No database work is on the search path. The airport list is a separate lazy chunk (A8), not on the search request.

## A8. Airport datasets

Two copies: public `src/data/airports.ts` (8,804 codes; code/name/city/2-letter country; 656 KB chunk) and admin
`src/data/airports.json` (8,800; iata/name/city/country/countryCode/type; 1.1 MB chunk; documented in
`docs/airports-data.md`). 16 codes only in the public copy (15 real, e.g. BNP Bannu, CWP Campbellpore, PBI Palm Beach;
one "[Duplicate]"), 12 only in the admin copy. All Pakistan and Gulf hubs are in both. Not on the search request path;
it doubles what is shipped and can drift.

## A9. Self-service lookup

None. "My Bookings" lists only bookings saved in that browser; the gateway opens a booking only with the private token
from the confirmation. Real gap.

## A10. S3 and AWS access

No S3 anywhere in the gateway. Parameter Store loading exists (`app/core/parameter_store.py`, group supplier settings
only) but the Lightsail server has **no AWS credentials** and `SSM_PARAMETER_PREFIX` is empty, so S3, SES and Parameter
Store all need an IAM user (or keys) on the server first. SES: `travelian.pk` and the Gmail address are verified; the
account is in the SES **sandbox** (it can only send to verified addresses), which is enough for staff notifications.
