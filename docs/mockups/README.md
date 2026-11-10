# Admin mockups

Approved mockups are the visual source of truth for each admin screen, together with `docs/spec-v3.md` (see AGENTS.md). Build a screen only once its mockup is approved. Mockup colors are estimates; real colors come from `src/styles/theme.css`.

Status as of 2026-11-10. All 28 listed mockups are in this folder.

| Mockup | Spec section (docs/spec-v3.md) | Approval | File |
| --- | --- | --- | --- |
| `mockup-dashboard-home.png` | §5 Menu 01: Dashboard | Approved | Present |
| `mockup-search-flights.png` | §6 Menu 02: Search | Approved | Present |
| `mockup-search-group-ticketing.png` | §6 Menu 02: Search | Approved | Present |
| `mockup-search-hotels.png` | §6 Menu 02: Search | Approved | Present |
| `mockup-search-umrah.png` | §6 Menu 02: Search | Approved | Present |
| `mockup-flights-fare-check.png` | §6 Menu 02: Search | Approved | Present |
| `mockup-flights-hold-form.png` | §6 Menu 02: Search | Approved (updated: find customer, saved travelers, duplicate notice) | Present |
| `mockup-flights-hold-result.png` | §6 Menu 02: Search | Approved | Present |
| `mockup-bookings-all.png` | §7 Menu 03: Bookings | Approved | Present |
| `mockup-bookings-flights.png` | §7 Menu 03: Bookings | Approved | Present |
| `mockup-bookings-group-ticketing.png` | §7 Menu 03: Bookings | Approved | Present |
| `mockup-bookings-hotels.png` | §7 Menu 03: Bookings | Approved | Present |
| `mockup-bookings-umrah.png` | §7 Menu 03: Bookings | Approved | Present |
| `mockup-bookings-inquiries-requests.png` | §7 Menu 03: Bookings | Approved | Present |
| `mockup-bookings-quotations.png` | §7 Menu 03: Bookings | Approved | Present |
| `mockup-booking-detail-overview.png` | §7 Menu 03: Bookings, Booking detail tabs | Approved | Present |
| `mockup-booking-detail-itinerary.png` | §7 Menu 03: Bookings, Booking detail tabs | Approved | Present |
| `mockup-booking-detail-passengers.png` | §7 Menu 03: Bookings, Booking detail tabs | Approved | Present |
| `mockup-booking-detail-fare.png` | §7 Menu 03: Bookings, Booking detail tabs | Approved | Present |
| `mockup-booking-detail-payments.png` | §7 Menu 03: Bookings, Booking detail tabs | Approved | Present |
| `mockup-booking-detail-supplier-payment.png` | §7 Menu 03: Bookings, Booking detail tabs | Approved | Present |
| `mockup-booking-detail-tickets.png` | §7 Menu 03: Bookings, Booking detail tabs | Approved | Present |
| `mockup-booking-detail-servicing.png` | §7 Menu 03: Bookings, Booking detail tabs | Approved | Present |
| `mockup-booking-detail-audit.png` | §7 Menu 03: Bookings, Booking detail tabs | Approved | Present |
| `mockup-booking-payment-issue.png` | §7 Menu 03: Bookings, Booking detail tabs (Payments and issuing) | Approved (updated: "Supplier details") | Present |
| `mockup-customers-customers.png` | §8 Menu 04: Customers & Travelers | Approved | Present |
| `mockup-customers-travelers.png` | §8 Menu 04: Customers & Travelers | Approved | Present |
| `mockup-customers-communications.png` | §8 Menu 04: Customers & Travelers | Approved | Present |

28 mockups listed, all present. An expected total of 29 was noted when the first 24 were added, but the remaining mockup is not named anywhere in the repo.

## Approved deviations

- **Customers & Travelers: no reveal (approved by Zohaib, 10 November 2026).** The Customers and
  Travelers screens show masked values only. There is no Reveal button and no reveal dialog, and the
  mockup notes about masking and reveal are not shown. The gateway has no reveal for saved people.
  (The booking traveler reveal on Booking detail > Passengers is unchanged.)
- **Customers & Travelers: hidden for lack of data** (docs/backend-todo.md, section 7): all summary
  cards on both tabs; every filter except Search; the Bookings, Flag and Notes columns; Flag with
  reason. Communications (P3) shows "not available yet" with the mockup's own note.
- **Search > Flights: From/To row (changed by Zohaib's request for readability, 10 November 2026).**
  The original `mockup-search-flights.png` puts From, Swap, To, the dates, Provider and Search
  flights on one row. Now From, Swap and To have their own row (each airport half the width, stacked
  below about 900px) and the second row holds Departure date, Return date, Provider and Search
  flights. The selected airport shows two lines ("LHE - Lahore", then the airport name and country).
  The trip type, traveler and cabin controls stay on the top row. Nothing was removed.
- **Search > Flights: swap button (Wego style, approved by Zohaib, 10 November 2026).** The mockup
  still shows a text "Swap" button between From and To. It is now a round icon-only button (two
  arrows) centred on a thin line between the From and To cards, with the accessible name and tooltip
  "Swap origin and destination". When the fields stack (below about 900px) it sits on a horizontal
  line between them with the arrows pointing up and down.
- **Search > Flights: Search expiry card.** As in the mockup, it carries no warning tag; a running
  timer is neutral and an expired search turns the card critical with the word "Expired".

