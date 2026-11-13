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

Finance > Accounts & Ledgers ("Bank and cash book", receiving accounts) was built from the written
screen brief Zohaib approved on 14 November 2026 (layout, texts, colours and states spelled out);
no image is in this folder yet. Add it as `mockup-finance-receiving-accounts.png` when available.

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
- **Search > Group Ticketing: restyled to match Flights (Zohaib's request, 11 November 2026).** The
  original `mockup-search-group-ticketing.png` shows one small row with a text Swap button and a
  plain date field. Group Ticketing now uses the same shared form parts as Flights: Suggested routes
  (the 4 available sectors with the most departures, from the gateway's data) and Select available
  sector on the top row; From, round swap, To (two-line airport cards, limited to the available
  sectors) on the next; Departure Date (day first), Airline, Adults and Search group fares below.
- **Search tabs and fields follow the public website's search form (Zohaib's request).** Tabs carry
  the public icons and active style; fields have the public rounded look with leading icons
  (take-off, landing, calendar), the outlined round swap button and the filled search button with a
  magnifier. Sizes stay on the admin type scale.
- **Search > Flights: Search expiry card.** As in the mockup, it carries no warning tag; a running
  timer is neutral and an expired search turns the card critical with the word "Expired".
- **Whole admin: public site's look, admin colours (Zohaib, 11 November 2026).** Every admin screen
  now uses the admin design system (docs/design-system.md), built from the public website's sizes and
  shapes; where a mockup looks different, the public style wins and the mockup's layout and content
  stay. Differences from the mockups: buttons, selects and filter chips are 40px (mockup 28px);
  badges and tags are 22px pills with semibold text (mockup 18px, medium); cards are rounded-xl with
  20px sides (mockup 10px radius, 16px sides); page tabs are semibold; row action buttons are 36px.
  Colours are unchanged. The Search forms were restyled at Zohaib's request to match the public
  site's search form, differing from the original Search mockups (see the entries above).
- **Search forms on one line, like the public site (Zohaib, 12 November 2026).** Flights and Group
  Ticketing show From, round swap, To, the dates and the search button on one line when the form is
  wide enough (Group Ticketing at 1280px, Flights at 1440px or with the sidebar collapsed); dates
  are compact and From / To take the remaining width. Group Ticketing's Airline and Adults moved to
  the top row next to Select available sector. All search fields, the Bookings filters and the
  Customers search share the same 56px rounded field look.
- **Booking detail > Payments: record payment and issue the ticket (built 12 November 2026, mockup
  `booking-payment-issue`).** Differences: "Received into" lists Travelian's receiving accounts for the chosen method (from
  the gateway, 14 November 2026; until then it was a text field), and the form adds "Received on" and "Time (24-hour)"
  because the gateway needs when the money arrived. "Total matches the held fare" says "Checked when
  issuing": the gateway checks the supplier total at the moment of issuing, not before. Recorded by
  shows the role (the gateway sends no name). A viewer sees either "Issue ticket" (issue tickets
  permission) or "Request issuance", not both. The "Checking" card shows when another issue is in
  progress; "Open Payments" on the hold-expired card is left out (it is the same tab). Tickets tab:
  Passenger, Ticket number, Status (issue time is not recorded yet).
- **Hold flight form: saved customers and travelers (Zohaib, 12 November 2026).** The mockup's form
  is typed in only. The Customer card now has "Find saved customer" and each traveler card "Use saved
  traveler": search by mobile number, CNIC, passport, email or name, every match is listed (masked),
  and Use fills the card. The browser never receives or sends the saved identity values: the hold
  carries only the saved ids and the gateway fills in name, date of birth and document. A person with
  several documents needs one chosen. "Type details instead" returns to the typed form.
- **Booking detail > Itinerary (14 November 2026).** The flights as the gateway saved them when the
  booking was held: Segment (Outbound / Return, stops and duration), From and To (code and city),
  Departs and Arrives (day first, local time), Airline / flight, Fare, Baggage. The mockup's "Cabin"
  column is "Fare": the gateway records the fare name, not the cabin. Bookings held before this
  change say the flights weren't recorded.
- **Customers & Travelers: the 50 most recent people on open (14 November 2026).** The page lists
  the 50 most recent saved people when it opens (latest booking first, then the most recently
  saved); searching narrows it as before.
