# Travelian Super Admin Dashboard: handoff (9 Nov 2026)

## Project
Travelian (Lahore B2C + B2B online travel agency). React/Vite/TypeScript frontend (repo `travelian`, branch `feature/admin-dashboard-home`, dev at localhost:8080/admin) and FastAPI gateway (repo `travelian-api-gateway`, same branch, Postgres, Cognito auth, to be deployed on AWS Lightsail). Pure SPA: all data and actions go through the gateway `/v1/...` with the user's token. The frontend never computes money or permissions. `AGENTS.md` holds the rules. Nothing is pushed.

## Sources of truth
- `docs/spec-v3.md` (14 menus; section 23 holds D23 to D26)
- `docs/mockups/` (24 PNGs; README lists them)
- `docs/roadmap.md`, `docs/backend-todo.md`

## Rules
- Build only screens that have a mockup. Add nothing not in the spec or a mockup. Never remove existing options.
- Official logo; text-only 14-item sidebar; "Rs" for money; hide cards with no data.
- Honest "not available yet" states, never invented numbers. Status colours always paired with text.

## Field visibility (D23, enforced by the gateway, not the page)
- Super Admin and Admin see supplier names, cost and margin.
- Staff do not by default. Two permissions can be granted per role or user: "can see supplier names" and "can see cost and margin".
- Agency, sub-agency and customer never see them (the gateway does not send the fields).
- D24: a provider failure shows "Some results may be missing".
- D25: Hotels stays in Search.
- D26: one flight card with fare rows under it.
- Passport and date of birth are masked everywhere, with a logged reveal. Edit forms open empty and show only the masked value.

## Mockups
- Approved and saved: Dashboard, Search (4 tabs), Bookings (7 sub-menus + 9 detail tabs).
- Saved, approval pending: Customers & Travelers (3 mockups).
- Next in the order: Finance (Menu 05).

## Built so far (Claude Code)
- Dashboard (real data).
- Staff role + 2 permissions (gateway 18098c2).
- Bookings list/detail endpoints (gateway 1557573).
- Bookings and Booking detail pages (frontend 7dc0d1d).
- Search tabs (frontend a7bafd6): Group Ticketing real, others honest shells.
- Wip commits: gateway 091b0fc (Southair hold, flag off, migration 0010), frontend 6e81739 (regenerated types).
- Codex: gateway 0a3c208 (stops leaking supplier names from /check-availability; safe to merge). Frontend f166234 (agency Group Ticketing tab) is NOT merged: needs a decision. Codex's uncommitted frontend checkout rewrite is NOT to be merged (2 failing tests, removes agency flight search).
- Customers & Travelers not started.
- Gateway `.env` loads regardless of the start folder (gateway be9aaf8).
- Gateway TESTING.md (gateway c1495cb); frontend TESTING.md, setting up on a new machine (frontend 8d78896).
- A 503 now shows the gateway's own message (frontend 0380924).
- Single-branch consolidation done: all work is on `feature/admin-dashboard-home` in both repos. `codex/frontend-fixes` (f166234) is still unmerged.

## Decisions already made
- Bookings cards follow the current filters; clicking a card applies that filter.
- `/admin/requests` stays for agency roles until agency Bookings is built through the gateway, then it is removed.
- Group Ticketing available sectors: 6 chips plus a full dropdown.
- Flights search is "not available yet" for internal roles until the Southair adapter works.

## Open work, in priority order
1. Dashboard error "Booking data isn't available yet" (the frontend shows this for ANY 503). Likely cause: the gateway loaded no `.env` when started from a different folder (fix made, to be committed). Not proven. Need the `detail` text of the failing `summary` request (browser dev tools, Network tab). Possible values: "Agency service unavailable.", "Dashboard booking data is not available.", "Authentication is not configured.", "Identity verification is temporarily unavailable." Change the frontend to show the gateway's own 503 message.
2. HIGH: `/v1/group-ticketing/*` leaked supplier cost, supplier-hosted logos and raw supplier fields. Partly fixed in gateway 89e4d8c and 0a3c208; verify.
3. Checkout fixes (legacy flight search used by agency roles): price comes from the URL (price=100 showed "Total PKR 100"; the gateway must reprice); `flightId` and logos expose the supplier (sooperfare); sidebar highlights nothing on /admin/flights-search and /admin/booking; "Free cancellation until" changes between loads (probably invented); public-checkout wording in admin; price range filter starts 0 to 700.
4. Southair (flights, UAT). Flow: login (7-day token), search, hold (PNR, ticket_ref, time_limit), fare_info within 10 minutes, customer pays, ticketing (CASH, exact total, before time_limit, never retried), PNR lookup. No API for cancel hold, void, refund, reissue or multi-city; holds expire; servicing is manual. Booking and ticketing need a funded Sub Travel Agent account. `SOUTHAIR_BOOKING_ENABLED` is off; ticketing has a separate flag, also off. After any ticketing error, check the PNR before anything else; mark "Unknown issuance" if unresolved. Questions for Southair: is fare_info available before booking? Does a hold cost anything? How long is the time limit? Can UAT ticket, and with what balance? Infant link index (0 or 1)? Void window? Migration 0010 is not yet applied locally.
5. Rate Hawk (hotels): needs its documentation; search only first.
6. Customers & Travelers screens after approval; then the Finance mockup.
7. Later: legacy admin screens still use the old `/content` API; role alignment (8 frontend roles vs gateway roles); real bookings source before go-live (the 18 rows are sample data); gateway-side masking and logged reveal; Lightsail deployment; npm ci peer-dependency fix; open-redirect fix on `?redirect=`; 18 open spec confirmations (e.g. #18 price-difference limit).

## Security
- Never put credentials in the repo or chat. They go in the gateway `.env` (git-ignored) or Lightsail env.
- Diagnostics may run gateway code that loads `.env` but must never print secret values.
- Browser tools do not enter passwords; the user signs in.
- Rotate the passwords that were exposed in a shared spreadsheet (#15). Secure or delete the CSV export containing passenger data.

## Working method
Claude Code builds from prompts; the user pastes its reports to the chat; the chat reviews against mockups and tests the running site in the browser; findings go back to Claude Code as one prompt. Codex can be used when Claude's window is used up: separate branch, no Southair files, no credentials. Only one agent works on a repo at a time.