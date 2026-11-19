# Roadmap

Planned work, in order. Do not start a later item unless asked.

1. **Admin: Dashboard home** (in progress)
2. **Deploy gateway to Lightsail** — done 17 November 2026. `api.travelian.pk` points at the static IP 52.76.26.224; Caddy sends `/v1/*` to the gateway and everything else to the legacy Lambda (gateway `deploy/CUTOVER.md`). Postgres runs on the instance; migrations are run by hand with `deploy/migrate.sh`.
   - Gateway fix: a first-time user hitting an admin route is refused before their profile is saved (the 403 rolls the insert back), so they can never be promoted. Save the profile before the role check.
   - Machine clients: Cognito resource server `https://api.travelian.pk` with scope `group-ticketing.search` exists (17 November 2026); one confidential client per approved agency is created on request.
3. **Connect screens to the gateway and shut down the old `/content` endpoints.** Runs alongside item 2, not after it.
   - Order: Bookings and Flight Operations, then Customers, Users, Settings, Flight Pricing.
   - Rule: a screen whose data can't load shows "not connected", never demo or sample data (today several still fall back to sample records).
   - Customers & Travelers: done on 10 November 2026 (gateway `/v1/admin/customers`, masked, no reveal); the legacy `/content/customers` page and client are removed. The `/content/customers` routes can be shut down once nothing else calls them.
   - Agency Bookings: build the agency roles' bookings screen on the gateway (their own bookings only), then remove `/admin/requests`. Until then `/admin/requests` stays for agency roles; internal roles already go to `/admin/bookings`.
   - Security, do early: lock down the unauthenticated `/content/bookings` routes (and the other `/content/*` admin routes) as each screen moves to the gateway; shut them down once nothing uses them.
4. **Public website booking through the gateway** (asked 18 November 2026): flights, hotels and group ticketing; guest booking allowed; PayFast online payment. Replaces the public site's use of the legacy Lambda (`/flights/*`, `/hotels/search`, `/content/bookings`, `/payments/payfast/session`).
   - a. **Foundations (gateway):** public search routes with no login, returning only customer fields (selling price; never supplier names, cost, PNR or supplier IDs), cached for a few minutes and rate-limited per IP; guest bookings with a booking reference and a private manage link sent by email; PayFast moved into the gateway (payment session, PayFast's server notification verified by the gateway against the booking total, never trusting the browser); booking emails sent by the gateway.
   - b. **Group ticketing** end to end first (search, passengers, hold, PayFast, staff issue final PNR and ticket numbers, e-ticket email), because the gateway already has its hold, payment and ticketing steps.
   - c. **Flights:** SooperFare added to the gateway beside Southair (multi-provider search, quote, hold), then the public checkout. SooperFare whitelisted the static IP on 18 November 2026; one approved Airblue test hold (PNR ZWHLZG, unpaid) confirmed the reservation and booking-list answers.
   - **To do, on hold (18 November 2026): SooperFare ticket issuing** (`/v1/booking/confirm`). It charges Travelian's SooperFare account, so it is not built or called until approved. Hold only until then; staff issue SooperFare tickets outside the gateway. Also later: cancel / void (`/v1/booking/cancel`, `/v1/booking/void`).
   - d. **Hotels:** RateHawk booking (sandbox keys until production keys arrive).
   - e. Public pages switched to the gateway one product at a time; the matching legacy routes are shut down after each.
   - **UI rule (18 November 2026):** the public booking screens are already built. Connect them to the gateway; do not redesign. Add only a control the flow can't work without (for example a Book button where none exists), and say so first.
   - Applies the item 5 go-live blockers (passenger data protection, flight sessions out of process memory) before real customers book.
   - Decisions needed: bot protection for guest holds (e.g. Cloudflare Turnstile, free); the sender address for booking emails (Amazon SES domain verification).
   - **Website flight payments (19 November 2026, D43/D45/D48/D49):** behind gateway `PUBLIC_FLIGHT_BOOKING_ENABLED` (off by default: flights stay requests). On: the fare is held at the supplier; card goes to PayFast and, only after PayFast's verified payment, is issued automatically when that provider's ticketing flag is on (otherwise "paid, issuance pending" and staff alerted); bank transfer and JazzCash stay held until staff record the money and issue. SooperFare fares are never auto-issued (ticket issuing on hold): paid by card, staff issue in SooperFare's portal. Customers are not emailed yet (needs the SES sender above).
5. **Go live with real data**, only after items 2, 3 and 4.
   - Decide the real bookings source first (read the legacy DynamoDB table, sync it into Postgres, or have the gateway write bookings).
   - Do not deploy the 18 imported test rows (`import_source = 'legacy_test_csv'`, shown on the dashboard as "Sample data"); remove them with `python -m app.cli.import_bookings_csv --remove`.
   - Requires the gateway-side identity masking (done for bookings and saved people; docs/backend-todo.md, section 3).
   - **Go-live blocker:** Agency flight search still calls the legacy Lambda directly (supplier IDs and logos visible in the network tab; gateway cannot reprice). Must move to the gateway search before deployment.
   - **Go-live blocker:** Live flight search (`/v1/live-ticketing/flights/search`) calls Southair directly. It must go through the multi-provider `FlightSearchService` (`app/services/flight_search.py`): providers called in parallel with per-provider timeouts, results merged, and a provider failure reported without failing the whole search (D24).
   - **Go-live blocker:** Passenger passport/ID numbers and dates of birth are stored as plain text, in the booking copies and in the saved customers and travelers (`saved_people`, `saved_person_documents`). Decide and apply database protection before any real customer data. (Gateway `docs/pii-storage.md`; the earlier encryption and its key re-encryption item were removed for the sandbox phase.)
   - **Go-live blocker:** The flight search sessions and quotes (opaque fare IDs mapped to supplier tokens) live in gateway process memory. They must move to shared storage (database or cache) with the same expiry before the gateway runs more than one worker, or restarts lose them.
6. **Admin: remaining menus**, one at a time, each only after its mockup is approved
   - Admin design system (docs/design-system.md): every admin page now uses the admin components and type scale (11 November 2026). Left: `/admin/settings` crashes when the legacy settings answer has no `adminNotificationEmail` (an empty or unexpected `/content` answer); fix when Settings moves to the gateway. `src/pages/BookingsPage.tsx` and `src/pages/AgencyFlightSearchPage.tsx` are not routed anywhere and can be deleted.
   - The agency roles' legacy search on `/admin/search` renders the public site's whole search form (`src/pages/AdminSearchPage.tsx`, `AdminHotelSearchPanel.tsx`), the one remaining admin import from public folders. It goes when agency search moves to the gateway (item 5 blocker).
   - Colours: the admin keeps its own colours; the differences from the public site are listed in docs/design-system.md for a later decision (and filled buttons are teal for main actions, navy for others).
7. **Public website: update to the new brand colors from the logo** (navy and teal). Do as a separate task: first a preview page for approval, then apply. Touches about 47 files. Do not start until the admin work is done and I ask.
8. **Roles: align the 8 frontend roles with the gateway's roles** to match the Users & Access spec, before any non-super_admin staff role uses the admin.
9. **Auth: move login through the gateway and decide token storage.**
   - Done on 10 November 2026: admin route guard (no admin shell without a valid session; sign-in returns to the page asked for, only relative paths inside /admin, which closes the open redirect); a 401 tries Cognito's refresh once, then signs out with "Your session expired. Sign in again."; actions are never re-sent. The refresh runs from the browser against Cognito until login moves to the gateway.

**Spec decisions needed:** Blog/News still needs a home in the 14 menus (kept under Website & CMS for now; your decision).

**Retired (2026-11-06):** Secret Manager (`/admin/secrets`; it stored nothing and claimed "encrypted at rest") and Document Center (`/admin/documents`; static empty table with dead buttons). Real secrets stay in AWS Parameter Store.

**Open items:**
- **Low priority: Lightsail backups and alarms** (decided 18 November 2026). `travelian-api-prod-02` has no automatic snapshots (so no database backup) and no alarms. Turn on automatic snapshots and add CPU and status-check alarms before real customer data is stored.
- **Flight Pricing vs Provider Systems don't agree.** The pricing rules offer providers from a different list than Provider Systems: Airblue and Fly Jinnah appear only in Flight Pricing; SooperFare, Al Haider, Dhillon & Sahi and Travel n Tours only in Provider Systems. The spec makes Suppliers & Integrations > Flight Providers the single registry; both screens should read from it.
- **Twilio text in General Settings is out of date.** It says SMS and WhatsApp go through "configured Twilio" and that "Twilio values belong in AWS Secrets Manager under the Lambda notification provider secret". The Lambda is being retired, real secrets are in AWS Parameter Store, and the settings are saved through the legacy `/content/notification-settings` API. Decide the notification provider and where its secret lives, then correct the text.
- **Spec question: date of birth on Travelers.** Spec v3.0 masks date of birth in the Customers table (lines 289 and 851) but lists "date of birth" as a plain column in the Travelers submenu (line 297). Should Travelers mask it too?
