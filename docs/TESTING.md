# Testing the admin on a new machine

How to run the Travelian frontend locally against your own local gateway. Set up the gateway first; see `docs/TESTING.md` in travelian-api-gateway.

Never commit `.env.local`, a password or a token. `.env.local` is git-ignored.

## 1. Prerequisites

- nvm (Node Version Manager). The Node version is pinned in `.nvmrc`.
- The gateway running locally (default `http://localhost:8000`).
- Git access to this repo, on branch `feature/admin-dashboard-home`.

## 2. Install

```bash
nvm install        # first time only
nvm use
npm ci
```

## 3. Settings (`.env.local`)

```bash
cp .env.example .env.local
```

Fill it in privately:

| Variable | What it is |
| --- | --- |
| `VITE_TRAVELIAN_GATEWAY_BASE_URL` | Your gateway, e.g. `http://localhost:8000`. During development Vite forwards requests to it through `/__gateway` on the frontend origin. Builds and preview use this URL directly, so their origin must be in the gateway's `CORS_ALLOWED_ORIGINS`. |
| `VITE_COGNITO_REGION`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`, `VITE_COGNITO_DOMAIN` | The Cognito user pool and app client used to sign in. They must match the gateway's `COGNITO_ISSUER` and `COGNITO_APP_CLIENT_ID`. |
| `VITE_TRAVELIAN_API_BASE_URL` | The legacy API used by the public website and the agency roles' legacy search. The new admin screens don't use it. |

Values in `.env.local` are built into the page, so they must never include a secret: the Cognito IDs above are public identifiers, not passwords.

## 4. Run

```bash
npm run dev        # http://localhost:8080
```

Open `http://localhost:8080/admin` and sign in with **your own** account. The first sign-in creates your profile on the gateway with the default role. To see the admin, your user must be made super admin (or staff) on the gateway; see section 6 of the gateway's `docs/TESTING.md`.

### Another computer on the same network

Open `http://<server-LAN-IP>:8080/admin` on the other computer, with port 8080 allowed
through the server's firewall for that computer. Keep the frontend and gateway running.
Vite forwards gateway requests (including authentication headers and gateway logos)
through `/__gateway`, using the gateway address already configured on the server.
The gateway can keep listening on `127.0.0.1:8000`; port 8000 does not need to be opened
to the network. No `.env` change is needed for this access. Production builds and
`vite preview` do not use this development proxy.

## 5. What to expect with a fresh database

Sample bookings are **not** in git. They came from a private CSV export containing passenger data. On a fresh gateway database:

- Dashboard and Bookings show zeros and empty tables, with no "Sample data" label.
- Search > Group Ticketing and Flights only return results when the gateway has supplier credentials, and only show prices when a markup is configured.
- Hotels and Umrah show "not available yet".

If a page shows an error, it now quotes the gateway's own reason, e.g. "Agency service unavailable." (run `alembic upgrade head` on the gateway) or "Authentication is not configured." (set the gateway's Cognito variables).

## 6. Checks

```bash
npm run typecheck
npm test
```

Expected on 10 November 2026: typecheck clean, 49 test files and 418 tests passing. Admin layout specs (`e2e/admin-*.spec.ts`: flights search, booking detail, flights hold, customers, airports, group ticketing, session, type scale): 85 passing; run with `PLAYWRIGHT_CHANNEL=chrome npx playwright test e2e/admin-*.spec.ts` when Playwright's own browser isn't installed.

Airport suggestions (Search > Flights From/To): `src/lib/admin-search/airports.test.ts` covers the ranking (exact code of a large or medium airport, then city prefix with a small airport's exact code after larger airports, IATA prefix, airport name, country; larger airports first; "kar" gives Karachi first), accents, case, the 8-result limit and no match; `e2e/admin-airports.spec.ts` covers picking, clearing, swap, same airport, keyboard, the 3-letter codes in the request, and that typing makes no request once the Search page has loaded. Data source: `docs/airports-data.md`.

Search flow dates and empty results: `src/lib/admin-search/date-display.test.ts` (day-first display, 24-hour times, typed dates read day first, impossible dates refused) and `FlightsSearch.test.tsx` ("No flights found for KHI to MUX on 24 Nov 2026. Try another date." without filters; "No flights match these filters." only with filters; a provider failure keeps the partial-failure notice; the Search expiry card has no warning tag while running). `e2e/admin-airports.spec.ts` checks the date fields in an en-US browser, and at 1280, 1440 and 390px that the LHE and KHI names are not clipped, the From/To fields sit side by side (stacked below 900px), controls are at least 40px high, the suggestion list is at least 360px wide with 48px rows, there is no sideways scroll, and keyboard selection still works; the round swap button is centred between the From and To cards (side by side or stacked), has its accessible name and tooltip, and swapping with an empty field is harmless.

Sign-in and expired sessions: `src/lib/auth-guard.test.ts` (session state; the return path after sign-in accepts only a relative path inside /admin, refusing full URLs, `//host`, `javascript:`, backslash tricks and non-admin paths), `src/lib/gateway/client-session.test.ts` (401: one refresh, a read is sent again once, an action is never re-sent; 403 stays in the page), `src/components/AdminLayout.guard.test.tsx` (no session or an expired one renders no admin shell), `src/pages/public/SignInPage.test.tsx` (return to the remembered page; other-site redirects ignored; someone already signed in never sees the form: a valid session goes to /admin or a safe remembered page, an expired one with a refresh token is refreshed once, a failed refresh clears it and shows the form, with the expired message only when sent from an expired admin page). `e2e/admin-session.spec.ts` mocks the gateway and Cognito: no session goes to sign-in with no menu and returns to /admin/customers after sign-in; a 401 mid-session lands on sign-in with "Your session expired. Sign in again."; a redirect to another site is ignored; with a valid session, Sign In on the public site lands on /admin and the form never appears; an expired-session redirect from /admin/customers shows the form and the message.

All specs, public and admin, run on the system Google Chrome (`/usr/bin/google-chrome`): `playwright.config.ts` sets `channel: "chrome"` (override with `PLAYWRIGHT_CHANNEL`), so Playwright's own browser download is not needed. Run everything with `npx playwright test`.

Known on 11 November 2026: 42 public-site specs fail on the unchanged public site because the specs are older than the current public copy and layout (e.g. they expect the heading "Book Flights, Hotels & Umrah with Travelian"; the page says "Book Flights, Group Tickets, Hotels & Umrah"). Failing files: flight-trip-height, homepage-top, popular-route-date, public-header, unified-search. The admin work does not change the public site, so this set must stay the same (43 passing, 42 failing) until the public specs are updated.

Visual regression (`e2e/visual.spec.ts`, baselines in `e2e/__screenshots__/`): full-page screenshots of the public home page (Flights, Group Ticketing, Hotels and Umrah tabs), Sign In and Register, and the admin Dashboard, Search (all four tabs), Bookings and Customers & Travelers, at 1280, 1440 and 390px; zero pixel difference allowed. Fixed clock, animations off, made-up gateway answers, web fonts blocked (fallback fonts, the same on every run). After an intended change, run `npx playwright test e2e/visual.spec.ts --update-snapshots` and review the new images before committing. A public image must never change in admin work.

Admin type scale (one scale for the whole admin, based on the public site; `src/styles/admin-tokens.css`):
`src/styles/admin-type-scale.test.ts` fails if an admin source file (`src/components/admin`, the
admin layout, sidebar and admin pages) uses an arbitrary pixel size (`text-[13px]`), an inline font
size, or a Tailwind default size class instead of the scale, and checks the scale itself (body 14px,
labels and tables 13px, helper text and tags 12px, section headings 18px, page titles and numbers
24px; nothing below 12px). `e2e/admin-type-scale.spec.ts` and the shared check in
`e2e/support/type-scale.ts` (also called from the customers, booking detail and hold specs) fail if
any visible admin text is under 12px, a field label or table text under 13px (tags may be 12px), or
the page scrolls sideways, at 1280 and 1440px. The same guard test also fails on a hard-coded colour
(hex, `rgb()`/`hsl()`, a Tailwind palette colour such as `bg-amber-500`) or an arbitrary radius
(`rounded-[6px]`, `borderRadius`) in those files, and pins the admin colours: the primary action
teal (`--action-primary` = `--brand-teal` = `184.8 98.4% 24.9%`), navy, surfaces, borders and the
status colours, so a later change cannot recolour the admin by accident.

Admin design system (docs/design-system.md): `src/components/admin/ui/admin-ui.test.tsx` covers the
shared components (button variants and sizes from the tokens, a size override replacing the token
size, fields with label, icon, hint and error, badges and tags always with text, notices, panels,
empty and loading states, the chip toggle, the dialog's 85% height and inner scroll, the admin's own
product tabs). The guard test also fails if an admin file imports from `src/components/public` or
`src/pages/public` (one documented exception: the legacy agency search, `AdminSearchPage.tsx`).

Older admin pages (`e2e/admin-older-pages.spec.ts`): Agencies, Packages, Reports, Hotels, Flights,
Flight Operations, Booking Requests, Wallet, Payments, Users, RBAC, Provider Systems, Group Ticketing
collections, Coupons, Blog, Notifications, Announcements and the Attention Queue placeholder, at 1280
and 390px: heading shown, no page error, no visible text under 12px, no sideways scroll. Settings is
left out (it crashes on an empty legacy settings answer; docs/roadmap.md). The guard test covers
these pages too; palette colours they still use are listed there by file and class.

Payments and issuing (booking detail > Payments, Tickets): `src/lib/admin-bookings/payments.test.ts`
(rupees to paisa exactly, refusing bad amounts; 24-hour time; local date and time to one instant),
`src/components/admin/bookings/PaymentsAndIssuing.test.tsx` (totals from the gateway; the payment
sent in paisa with method, account, reference and time; checks before sending and the gateway's
refusal shown; no form without the permission or when paid in full; payments listed; the checklist,
blockers and ticketing off; confirm then issue once with ticket numbers; Request issuance without
the issue permission; supplier amount, balance and margin only when sent; hold expired offers Search
again; unknown issuance: Check PNR again, Mark as issued with every ticket number and a reason, Mark
as not issued; Tickets tab). `e2e/admin-booking-payments.spec.ts`: record the payment, issue once,
ticket numbers on the result and the Tickets tab; at 1280, 1440 and 390px readable text, no sideways
scroll, the confirm dialog in view and closed by Escape. To issue for real, the gateway's ticketing
must be on and the user needs the issue tickets permission (gateway `docs/TESTING.md`).

Saved customers and travelers on the hold form: `HoldForm.test.tsx` (find a saved customer by mobile
number, every match listed; Use fills the customer; Same as customer makes the saved customer the
traveler; a saved traveler with several documents must have one chosen; the hold sends only
`customer_id`, `traveler_id` and `document_id`, never a name, date of birth or document number;
fewer than 3 characters and no match; Type details instead; a saved customer without phone or email
gets the fields back from the gateway's errors and the typed values are sent). `e2e/admin-flights-hold.spec.ts`
does the same in Chrome at 1280 and 390px: the search dialog in view, readable, no sideways scroll,
and the request carrying only the ids.

Search date fields (`e2e/admin-search-calendar.spec.ts`): clicking Departure date, Return date or
Group Ticketing's Departure Date opens the calendar as a centred popup like the public site (title,
close button, two months side by side, stacked on phones), in view at 1440, 1280 and 390px; picking a
day fills the field, Escape and Close close it; past days are disabled; tabbing into the field does
not open it, so the date can still be typed day first.

Itinerary (booking detail > Itinerary): `AdminBookingDetailPage.test.tsx` shows the gateway's
`itinerary` (columns as the mockup with Fare for Cabin, day-first local times, stops and duration,
"Baggage info not available" when missing) and, without one, "Not recorded for this booking". The
gateway saves the itinerary with each new hold (migration `0018_booking_itinerary`: run
`alembic upgrade head` on the gateway after pulling).

Gateway calls in specs: the dev server may send gateway calls through its `/__gateway` proxy
(`vite.config.ts`) instead of straight to port 8000. `e2e/support/gateway.ts` (`gatewayView`) makes
both look the same, so the specs' made-up gateway answers are used either way and nothing reaches a
real gateway.

Search forms (shared parts, `src/components/admin/ui/search-form.tsx`, `SectorAirportSelect.tsx`):
`search-form.test.tsx` covers the two-line airport card (a code not in the airport list shows
alone), the round swap button and From/To row, the search button, the icon tabs, the sector-limited
From/To picker (only the given codes, keyboard choice, card with x) and the search-look date field.
`e2e/admin-group-ticketing.spec.ts` checks, at 1280, 1440 and 390px, the Flights layout (From and To
side by side then stacked, round swap centred and named, names not clipped, leading take-off,
landing and calendar icons, list at least 360px, no sideways scroll, minimum text sizes), plus the
tab icons, Suggested routes (the 4 busiest real sectors; hidden without sector data; a chip fills
From and To and doesn't search), From/To listing only available sectors with the keyboard, swap to
a reverse pair with no sector (allowed, searches and finds nothing, as before) and the day-first date.

