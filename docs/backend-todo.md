# Backend to-do

New items: open a GitHub issue and add a row here with its link.

Backend to-dos now live in GitHub issues (gateway work in
[Zaibi41/travelian-api-gateway](https://github.com/Zaibi41/travelian-api-gateway/issues),
frontend work in [Zaibi41/travelian](https://github.com/Zaibi41/travelian/issues)). This file is the index:
when a card, filter or widget is hidden because its data doesn't exist yet, it gets a row here with the issue it waits for.
The previous long-form list (sections 1 to 10) is in git history before 21 November 2026.

## Open

| Item (old section) | Issue |
| --- | --- |
| Legacy `/content/bookings` and `/content/booking-requests` open to anyone; proxy Lambda `CORS_ORIGIN=*`; remove retired PayFast and group-feed routes from the Lambda (1, 9) | [gateway#82](https://github.com/Zaibi41/travelian-api-gateway/issues/82) |
| `GET /v1/agency/bookings`, verified `bookings.agency_id`, agency dashboards, Agency filter (1, 2) | [gateway#83](https://github.com/Zaibi41/travelian-api-gateway/issues/83) |
| Database protection for plain-text identity values (3) | [gateway#84](https://github.com/Zaibi41/travelian-api-gateway/issues/84) |
| Unknown issuance card, Dashboard and Bookings (2, 4) | [gateway#85](https://github.com/Zaibi41/travelian-api-gateway/issues/85) |
| Dashboard Money and balances section (2) | [gateway#86](https://github.com/Zaibi41/travelian-api-gateway/issues/86) |
| Dashboard Recent activity panel (2) | [gateway#87](https://github.com/Zaibi41/travelian-api-gateway/issues/87) |
| Booking owner / assignment: Assign, Unassigned card, Owner column, Overview Owner (2, 4) | [gateway#88](https://github.com/Zaibi41/travelian-api-gateway/issues/88) |
| Add note action (4) | [gateway#89](https://github.com/Zaibi41/travelian-api-gateway/issues/89) |
| Branch filter: Dashboard, Bookings, Customers (2, 4, 7) | [gateway#90](https://github.com/Zaibi41/travelian-api-gateway/issues/90) |
| Channel, Created by, Travel date, Airline, Route, Trip type, TTL filters (2, 4) | [gateway#91](https://github.com/Zaibi41/travelian-api-gateway/issues/91) |
| Supplier status, Source type (4) | [gateway#92](https://github.com/Zaibi41/travelian-api-gateway/issues/92) |
| Create manual booking (4) | [gateway#93](https://github.com/Zaibi41/travelian-api-gateway/issues/93) |
| Ticket number column, Issued by filter, Issued today card, ticket/passenger/phone search, Tickets tab issue time and issued by (4) | [gateway#94](https://github.com/Zaibi41/travelian-api-gateway/issues/94) |
| Accounts & Ledgers for a Finance role, who deactivated a receiving account, edit control (4, 9) | [gateway#95](https://github.com/Zaibi41/travelian-api-gateway/issues/95) |
| Accounts & Ledgers: Chart of accounts, Provider accounts, General ledger, Manual journals tabs (4) | [travelian#72](https://github.com/Zaibi41/travelian/issues/72) (existing) |
| Bookings → Group Ticketing columns, actions, Awaiting issuance and Payment pending cards (4) | [gateway#96](https://github.com/Zaibi41/travelian-api-gateway/issues/96) |
| Hotels: Book, Hold, hotel bookings sub-menu, voucher, rates in Rs, popular destinations (4, 6) | [gateway#97](https://github.com/Zaibi41/travelian-api-gateway/issues/97) |
| Hotel Inventory hotels in the hotel search, D25 (6) | [gateway#98](https://github.com/Zaibi41/travelian-api-gateway/issues/98) |
| Umrah tab and Umrah sub-menu (4, 6) | [gateway#99](https://github.com/Zaibi41/travelian-api-gateway/issues/99) |
| Inquiries & Requests sub-menu (4) | [gateway#100](https://github.com/Zaibi41/travelian-api-gateway/issues/100) |
| Quotations sub-menu, Quote actions, Quotes pending card (4, 6) | [gateway#101](https://github.com/Zaibi41/travelian-api-gateway/issues/101) |
| Fare tab breakdown, spec 19.7 (4) | [gateway#102](https://github.com/Zaibi41/travelian-api-gateway/issues/102) |
| Supplier payment tab: reference, time sent, confirmation, paid from (4) | [gateway#103](https://github.com/Zaibi41/travelian-api-gateway/issues/103) |
| Itinerary tab: cabin, holds before 14 Nov 2026 (4) | [gateway#104](https://github.com/Zaibi41/travelian-api-gateway/issues/104) |
| Servicing tab: refund, reissue, void, cancellation (4) | [gateway#55](https://github.com/Zaibi41/travelian-api-gateway/issues/55) (existing) |
| Group Ticketing child and infant passengers and prices (5, 6) | [gateway#105](https://github.com/Zaibi41/travelian-api-gateway/issues/105) |
| Group Ticketing markup rules (5) | [gateway#106](https://github.com/Zaibi41/travelian-api-gateway/issues/106) |
| Group Ticketing `/check-availability` takes the supplier price (5) | [gateway#107](https://github.com/Zaibi41/travelian-api-gateway/issues/107) |
| Group Ticketing issue call, Dhillu & Sahi hold/release, hold rule, hold expiry on results, final PNR and tickets from the supplier (6, 8) | [gateway#108](https://github.com/Zaibi41/travelian-api-gateway/issues/108) |
| Paid group holds expiring before the final PNR (8) | [gateway#109](https://github.com/Zaibi41/travelian-api-gateway/issues/109) |
| Group Ticketing owned stock (6) | [gateway#110](https://github.com/Zaibi41/travelian-api-gateway/issues/110) |
| Admin Search → Flights: multi-city, cabins, fare rules, refund/meal/hold time, Staff fare tag, Available providers and Search expiry cards (6) | [gateway#111](https://github.com/Zaibi41/travelian-api-gateway/issues/111) |
| Admin Search → Flights: Book and Hold | [travelian#112](https://github.com/Zaibi41/travelian/issues/112) (existing) and [gateway#111](https://github.com/Zaibi41/travelian-api-gateway/issues/111) |
| Customers & Travelers: cards, filters, bookings count, flags, notes, Communications tab (7) | [gateway#112](https://github.com/Zaibi41/travelian-api-gateway/issues/112) |
| SooperFare ticket issuing (9) | [gateway#45](https://github.com/Zaibi41/travelian-api-gateway/issues/45) (existing): issuing is built behind `SOOPERFARE_CONFIRM_ENABLED`, waiting for owner approval |
| SooperFare wallet balance call (9) | [travelian#68](https://github.com/Zaibi41/travelian/issues/68) (existing) |
| Notifications: delivery logs and email/SMS/WhatsApp settings (9) | [gateway#113](https://github.com/Zaibi41/travelian-api-gateway/issues/113) |
| Public `/contact` message form (10) | [gateway#114](https://github.com/Zaibi41/travelian-api-gateway/issues/114) |
| Public `/blog` articles; `/blog` and `/deals` in the sitemap (10) | [travelian#127](https://github.com/Zaibi41/travelian/issues/127) |
| API host not marked for crawlers: `robots.txt`, `X-Robots-Tag` (10) | [gateway#81](https://github.com/Zaibi41/travelian-api-gateway/issues/81) |

## Done

| Item (old section) | Evidence |
| --- | --- |
| Admin Dashboard endpoints: summary, booking report, attention queue, filter options, CORS (2) | Gateway `app/api/routes/admin_dashboard.py` (`/dashboard/summary`, `/dashboard/booking-report`, `/attention-queue`, `/dashboard/filter-options`) |
| Booking creation through the gateway (2) | Gateway `POST /v1/public/flights/requests`, `POST /v1/public/group-ticketing/bookings`, admin holds |
| Supplier cost on bookings, Gross profit (2) | `bookings.supplier_cost_minor` required since gateway migration 0021 (see travelian#70) |
| Identity masking (3) | Done 10 Nov 2026 (old section 3) |
| Passengers, Payments and Audit tabs on Booking detail (4) | `AdminBookingDetailPage.tsx` renders `booking.passengers`, `PaymentsAndIssuing`, `booking.audit` (gateway `booking_events`, migration 0010) |
| Tickets tab (4) | `TicketsTab` / `GroupTicketsTab`; issue time and issued by are open in gateway#94 |
| Itinerary for new holds (4) | `bookings.itinerary`, gateway migration 0018 |
| Airline logo in the Bookings list, a person's Bookings table and booking alerts (#75) (4, 7, 9) | `airline_code` on `BookingListItem` (`app/schemas/admin_bookings.py`), `SavedPersonBooking` (`app/schemas/saved_people.py`) and the alert (`app/api/routes/admin_notifications.py`); travelian#75 closed |
| Airline logo for airlines without a Travelian logo file (6) | Code badge fallback, travelian#75 and travelian#63 closed |
| Group Ticketing D23: sign-in, selling price, logos, field visibility (5) | Done 9 Nov 2026 (old section 5) |
| Group Ticketing: departure date optional (6) | Gateway `GroupSearchRequest.departure_date` is optional (`app/api/routes/group_ticketing.py`) |
| Group Ticketing: Al Haider adapter (6) | Gateway `app/vendors/group_ticketing/al_haider/`, `AlHaiderHoldProvider` behind `GROUP_AL_HAIDER_HOLD_ENABLED`; credentials are an owner step |
| Group Ticketing: staff record final PNR and tickets (8) | Gateway `POST /v1/group-ticketing/holds/{id}/tickets`; tracker `group-departures-without-final-pnr` |
| Customers list without a search term (7) | Gateway `GET /v1/admin/customers`: `q` optional, "Leave out to list the most recent people" |
| Agency flight search `/admin/flights-search` on the gateway (6) | Signed-in `POST /v1/live-ticketing/flights/search` (`searchFlights(..., { signedIn: true })` in `src/lib/travelian-api.ts`); travelian#130 |
| Lambda PayFast routes and group feed blocked (9) | Gateway `deploy/Caddyfile` answers 410; removing them from the Lambda is part of gateway#82 |
| Receiving account edit endpoint (9) | Gateway `PATCH /v1/admin/finance/payment-accounts/{id}`; the page's edit control is in gateway#95 |
