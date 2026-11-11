# Roadmap

Planned work, in order. Do not start a later item unless asked.

1. **Admin: Dashboard home** (in progress)
2. **Deploy gateway to Lightsail** (HTTPS, managed Postgres, secrets, CORS origin for the production admin). Runs alongside item 3.
   - Run migrations `0008_bookings` and `0009_staff_role_permissions` as an explicit deploy step on Lightsail (`alembic upgrade head`, after a database snapshot; never on app startup).
3. **Connect screens to the gateway and shut down the old `/content` endpoints.** Runs alongside item 2, not after it.
   - Order: Bookings and Flight Operations, then Customers, Users, Settings, Flight Pricing.
   - Rule: a screen whose data can't load shows "not connected", never demo or sample data (today several still fall back to sample records).
   - Customers & Travelers: done on 10 November 2026 (gateway `/v1/admin/customers`, masked, no reveal); the legacy `/content/customers` page and client are removed. The `/content/customers` routes can be shut down once nothing else calls them.
   - Agency Bookings: build the agency roles' bookings screen on the gateway (their own bookings only), then remove `/admin/requests`. Until then `/admin/requests` stays for agency roles; internal roles already go to `/admin/bookings`.
   - Security, do early: lock down the unauthenticated `/content/bookings` routes (and the other `/content/*` admin routes) as each screen moves to the gateway; shut them down once nothing uses them.
4. **Go live with real data**, only after items 2 and 3.
   - Decide the real bookings source first (read the legacy DynamoDB table, sync it into Postgres, or have the gateway write bookings).
   - Do not deploy the 18 imported test rows (`import_source = 'legacy_test_csv'`, shown on the dashboard as "Sample data"); remove them with `python -m app.cli.import_bookings_csv --remove`.
   - Requires the gateway-side identity masking (done for bookings and saved people; docs/backend-todo.md, section 3).
   - **Go-live blocker:** Agency flight search still calls the legacy Lambda directly (supplier IDs and logos visible in the network tab; gateway cannot reprice). Must move to the gateway search before deployment.
   - **Go-live blocker:** Live flight search (`/v1/live-ticketing/flights/search`) calls Southair directly. It must go through the multi-provider `FlightSearchService` (`app/services/flight_search.py`): providers called in parallel with per-provider timeouts, results merged, and a provider failure reported without failing the whole search (D24).
   - **Go-live blocker:** Passenger passport/ID numbers and dates of birth are stored as plain text, in the booking copies and in the saved customers and travelers (`saved_people`, `saved_person_documents`). Decide and apply database protection before any real customer data. (Gateway `docs/pii-storage.md`; the earlier encryption and its key re-encryption item were removed for the sandbox phase.)
   - **Go-live blocker:** The flight search sessions and quotes (opaque fare IDs mapped to supplier tokens) live in gateway process memory. They must move to shared storage (database or cache) with the same expiry before the gateway runs more than one worker, or restarts lose them.
5. **Admin: remaining menus**, one at a time, each only after its mockup is approved
   - Admin design system (docs/design-system.md): every admin page now uses the admin components and type scale (11 November 2026). Left: `/admin/settings` crashes when the legacy settings answer has no `adminNotificationEmail` (an empty or unexpected `/content` answer); fix when Settings moves to the gateway. `src/pages/BookingsPage.tsx` and `src/pages/AgencyFlightSearchPage.tsx` are not routed anywhere and can be deleted.
   - The agency roles' legacy search on `/admin/search` renders the public site's whole search form (`src/pages/AdminSearchPage.tsx`, `AdminHotelSearchPanel.tsx`), the one remaining admin import from public folders. It goes when agency search moves to the gateway (item 4 blocker).
   - Colours: the admin keeps its own colours; the differences from the public site are listed in docs/design-system.md for a later decision (and filled buttons are teal for main actions, navy for others).
6. **Public website: update to the new brand colors from the logo** (navy and teal). Do as a separate task: first a preview page for approval, then apply. Touches about 47 files. Do not start until the admin work is done and I ask.
7. **Roles: align the 8 frontend roles with the gateway's roles** to match the Users & Access spec, before any non-super_admin staff role uses the admin.
8. **Auth: move login through the gateway and decide token storage.**
   - Done on 10 November 2026: admin route guard (no admin shell without a valid session; sign-in returns to the page asked for, only relative paths inside /admin, which closes the open redirect); a 401 tries Cognito's refresh once, then signs out with "Your session expired. Sign in again."; actions are never re-sent. The refresh runs from the browser against Cognito until login moves to the gateway.

**Spec decisions needed:** Blog/News still needs a home in the 14 menus (kept under Website & CMS for now; your decision).

**Retired (2026-11-06):** Secret Manager (`/admin/secrets`; it stored nothing and claimed "encrypted at rest") and Document Center (`/admin/documents`; static empty table with dead buttons). Real secrets stay in AWS Parameter Store.

**Open items:**
- **Flight Pricing vs Provider Systems don't agree.** The pricing rules offer providers from a different list than Provider Systems: Airblue and Fly Jinnah appear only in Flight Pricing; SooperFare, Al Haider, Dhillon & Sahi and Travel n Tours only in Provider Systems. The spec makes Suppliers & Integrations > Flight Providers the single registry; both screens should read from it.
- **Twilio text in General Settings is out of date.** It says SMS and WhatsApp go through "configured Twilio" and that "Twilio values belong in AWS Secrets Manager under the Lambda notification provider secret". The Lambda is being retired, real secrets are in AWS Parameter Store, and the settings are saved through the legacy `/content/notification-settings` API. Decide the notification provider and where its secret lives, then correct the text.
- **Spec question: date of birth on Travelers.** Spec v3.0 masks date of birth in the Customers table (lines 289 and 851) but lists "date of birth" as a plain column in the Travelers submenu (line 297). Should Travelers mask it too?
