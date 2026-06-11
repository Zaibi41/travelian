# Travelian — QA / Business-Flow Audit Report
_Reviewer: Lovable agent · Mode: analysis only, no code changes · Source: live codebase in this project (matches travelian.pk build)_

---

## A. Executive Summary

The platform is feature-rich and the public booking flow (Home → Flight Search → Booking) is in solid shape after the recent Batch A/B/C polish. The biggest gaps are **not on the storefront** — they are in the **admin sidebar IA** and **role separation**:

1. **Sidebar bloat & duplication.** Many "items" are actually the same route shown twice with different labels (e.g. `Ticketing & Invoices` + `Issue Ticket` both point at `/admin/tickets`; `Refunds & Cancellations` + `Refund PNR` both point at `/admin/bookings`; `Suppliers / API Providers` + `Airline Logo Library` both point at `/admin/provider-systems`; `Flight Pricing & Rules` + `Fare Management` both point at `/admin/flights`). This makes the console feel "fake".
2. **Role switcher is exposed in the header.** Per your own brief, each role should be a separate login.
3. **Notification "Settings"** (admin email, phone, WhatsApp/SMS/Email toggles, templates, test-send) **do not exist as a UI**. The page only renders a feed + delivery logs.
4. **Booking Requests inbox** is implemented but **does not segment by request type** (Umrah / Visa / Study / Tour / Group / Manual Flight / WhatsApp), and has no WhatsApp action button or "Created date/time" column.
5. **Many sidebar links are dishonest** — Hotel Markup Rules, Package Markup Rules, Commission Rules, UBL Settings, 1Link Settings, Payment Webhook Logs, Audit Logs, Reconciliation, Credit Limits, Static Pages, Testimonials, Website Banners, Approvals Center, Follow-ups, Failed Searches, Support Tickets — all of them just deep-link to a generic page that does not have the named tab/section. The user clicks "1Link Settings" and lands on `/admin/secrets` with no 1Link tab. This is the #1 trust-killer.
6. **No B2B-critical screens:** Hold Booking queue, Pay-from-Wallet confirmation modal, Fare-rules viewer, Deposit-approval queue, Wallet ledger filtered to one agency, Credit-limit setter UI.

Priority: fix #1, #2, #3, #4, #5 before any new feature work.

---

## B. Public Website Issues

| # | Page / Route | Current problem | Why it is a problem | Recommended fix | Priority |
|---|---|---|---|---|---|
| B1 | `/` HomePage – Umrah rail | Three Umrah cards still default to the same Makkah hero when CMS is empty | Looks like seed data | Curated fallback already varies titles/chips; finish by sourcing 3 distinct Unsplash images (Madinah skyline, Kaaba night, Jabal Nur) into `fallbackUmrah` | Med |
| B2 | `/` Recent Searches rail | Says "No recent searches yet" even after a search if the user never reached `/flights-search` from the home form | Tells the user the feature is broken | On HomePage flight-form submit, also write to `travelian.recentFlightSearches` (currently only written inside `PublicFlightsPage`) | Med |
| B3 | `/` Trust strip | Partner logos rail (Visa / Mastercard / JazzCash / Easypaisa / IATA / PIA) and 3-card reviews carousel still missing before footer | Reduces trust for first-time visitors | Add `PartnerLogosStrip` + `ReviewsCarousel` per plan Batch F | High |
| B4 | Navbar | "Study Abroad" route exists (`/study-abroad`) but is **not in the top navbar** (only Flights/Hotels/Umrah/Tours/Visa/Group) | Hides a paid service line | Add "Study Visa" under a "More" mega-menu or as its own top item | High |
| B5 | Group Ticketing | Reachable from sidebar but inconsistent surfacing on public navbar; CTA copy varies between pages | Confusing intent | Standardise label "Group Ticketing" + sub-categories chip row on `/group-ticketing` | Med |
| B6 | WhatsApp inquiry button | Floating WhatsApp icon exists but is **not present on Umrah / Visa / Study / Group pages** consistently; phone number is hard-coded in `WhatsAppIcon.tsx` rather than centralised | Inconsistent CTAs; cannot be changed by admin | Move number to settings + ensure floating button mounts in `PublicLayout` (one place) | High |
| B7 | `/flights-search` | Currency now converts, skeleton cards land. Still missing: applied-filter chips with "Clear all", sticky sidebar on `lg+`, mobile bottom-sheet for filters, JSON-LD (BreadcrumbList + ItemList), slugged URL `/flights/LHE-DXB/2026-06-15` | Limits SEO and mobile UX | See Batch D in `.lovable/plan.md` | High |
| B8 | `/booking` | Fare breakdown card landed; Step 1 OK. Steps 2 (Review) / 3 (Payment) / 4 (Confirmation) have not been re-audited and lack: editable summary blocks, saved-card method tabs (Card/JazzCash/Easypaisa/Bank), 3DS notice, PCI badge row, `.ics` download, "Resume booking" restore banner | Booking abandonment risk at payment | Batch E in plan | High |
| B9 | Footer / favicon | Favicon set to brand logo but `og:image` defaults to PNG with transparent BG → poor preview on dark social cards | Bad share previews | Add solid-bg OG image variant in `/public` and reference in `SEO.tsx` | Low |
| B10 | Mobile responsiveness | Home + Flights look fine ≤ 414px; **Booking page Stepper is not sticky on mobile**; long pages cause user to scroll back up to see which step they are on | Friction | Add `sticky top-16 z-30` to the stepper on `< md` | Med |
| B11 | Mock content | "Today's deals" deal badges are partly hard-coded percentages rather than computed from `originalPrice` vs `price`; Tour rail shows the same provider tagline on all cards in fallback | Reads as demo data | Compute discount % from data; vary tag lines in fallback | Low |
| B12 | Broken/dead links | `View Public Site` in admin works; **no 404 link audit** on the public site. Routes like `/blog-public` (instead of `/blog`) are inconsistent with the rest of the public URL scheme | Confusing URLs | Rename `/blog-public` → `/blog` and 301-style redirect in router | Med |

---

## C. Dashboard / Menu Issues

Source of truth: `src/lib/admin-navigation.tsx`. The current sidebar emits **17 categories** with ~85 items. Many are decorative.

### C1 — Duplicate route, different label (must merge or remove)

| Sidebar label | Route | Action |
|---|---|---|
| `Ticketing & Invoices` + `Issue Ticket` | both `/admin/tickets` | **Remove "Issue Ticket"** from sidebar. "Issue" is an action that lives inside Booking Detail / Tickets list. |
| `Refunds & Cancellations` + `Refund PNR` | both `/admin/bookings` | **Remove "Refund PNR"**. Refund flow lives inside Booking Detail. |
| `Flight Pricing & Rules` + `Fare Management` | both `/admin/flights` | Keep `Flight Pricing & Rules`. Either delete `Fare Management` or build a separate `/admin/fare-management` page that only manages fare classes/RBDs (different from pricing rules). |
| `Suppliers / API Providers` + `Airline Logo Library` | both `/admin/provider-systems` | **Convert "Airline Logo Library" into a tab** inside Provider Systems page, remove from sidebar. |
| `Customers` (Management) + `Customers` (Customers) | both `/admin/customers` | Remove one (keep under "Customers" category). |
| `Manage Quotations` | `/admin/bookings` | **Hide entirely** until a real quotations module exists. |
| `Notifications` (Operations) + `Notifications` (Support, customer-side) | different routes but same label | Keep but disambiguate label → "System Notifications" vs "My Notifications". |
| `Support Tickets` (Operations) + `Support Tickets` (Support, customer-side) | both point at a notifications/support route that does not have a tickets list | Build or remove. Right now both are dishonest links. |

### C2 — Dishonest links (label promises a page that does not exist)

Each of these claims a destination that the target route does **not actually have a tab or section for**. Fix is either (a) build the section, (b) point to the correct route, or (c) remove until built.

- `Hotel Markup Rules` → `/admin/hotels` (no markup tab there)
- `Package Markup Rules` → `/admin/packages`
- `Agency Pricing Rules` → `/admin/agencies`
- `Commission Rules` → `/admin/settings`
- `Bank Transfers`, `1Link Payments`, `Card Payments` → all `/admin/payments` (no method-specific tabs)
- `Deposit Approvals`, `Approvals Center`, `Credit Limits` → `/admin/wallet` (no such sub-views)
- `Reconciliation`, `Payment Gateways` → `/admin/payments`
- `Failed Searches / API Issues` → `/admin/flights` (no such tab)
- `Support Tickets`, `Follow-ups` → `/admin/notifications` (notifications feed only)
- `Document Center` → `/admin/documents` (OK if page exists; verify)
- `UBL Settings`, `1Link Settings` → `/admin/secrets` (Secret Manager – not 1Link/UBL UI)
- `Payment Webhook Logs`, `Payment Failure Logs`, `Audit Logs`, `API Settings` → `/admin/provider-systems` (no such tabs)
- `Website Banners`, `Static Pages`, `Testimonials` → `/admin/settings`
- `My Work Report`, `Sales Reports`, `Business Reports`, `Agency Reports`, `Financial Reports`, `API Performance Reports`, `Booking Report`, `Wallet Report`, `Staff Performance` → all point at `/admin`, `/admin/wallet`, `/admin/bookings`, `/admin/users` — none of which render a "report" view today.

→ **Recommendation:** keep the Reports category but reduce to **one real link** `Reports → /admin/reports` until the actual report builder exists. Same for Website & CMS (keep only `Blog / News` until Banners / Pages / Testimonials are real). Same for System / Gateway Settings.

### C3 — Sidebar IA proposal (slim)

```
Dashboard
Search & Book      Flights · Hotels · Umrah · Tours · Visa · Group Ticketing
Bookings           All Bookings · Booking Requests · Refunds & Cancellations · Tickets & Invoices
Inventory          Hotels · Umrah Packages · Tour Packages · Visa Packages
Pricing            Flight Pricing & Rules · Deals & Promotions · (Markup rules when built)
Finance            Wallets · Payments · Deposit Approvals · Transactions · Refunds
Customers & Agencies  Customers · Agencies · Users & Staff
Operations         Notifications · Documents · Support Tickets
Reports            Reports (single hub)
Website & CMS      Blog / News  (Banners/Pages/Testimonials once built)
System             Suppliers & APIs · Secret Manager · Roles & Permissions · Settings
```

### C4 — Collapse / expand behaviour

`AdminSidebar.tsx` opens **only the active category** and closes others on navigation (`setOpenGroups({ [categoryToOpen]: true })`). This is fine for a slim menu but in the current bloated menu users lose context. Either (a) let multiple groups stay open until manually closed, or (b) ship C3 first then keep current behaviour.

### C5 — Missing business-critical modules

- **Hold Booking queue** (`/admin/bookings?status=on_hold`) — there is no dedicated view; agents must filter manually.
- **Fare Rules viewer** for a selected fare — required before "Pay & Issue".
- **Deposit-approval queue** for B2B wallet top-ups — currently just a sidebar label.
- **Refund workflow page** (request → approve → execute → settle).
- **Cancellation policy editor** under Inventory.
- **Group Ticketing inquiries inbox** (today routed into Booking Requests but not segmented).
- **CMS pages list** (Banners, Static Pages, Testimonials).
- **Audit log viewer** with filters by user / module / date.

---

## D. Role-Based Permission Issues

| # | Issue | Fix | Priority |
|---|---|---|---|
| D1 | Role switcher in header. | Remove `RoleSwitcher` from `AdminHeader`; rely on real authenticated session via Cognito. Keep it only behind a `?devRole=` query flag in non-prod builds. | **High** |
| D2 | `getInitialRole()` falls back to `customer` when no session is found and the user is on `/admin/...`. This means any unauthenticated visitor lands on a Customer Portal that they have no business seeing. | Redirect to `/signin?next=...` instead of defaulting to a role. | High |
| D3 | `canAccessAdminPath` is permissive: it considers a path accessible if **any** nav item with that role points at it. Because so many nav items share the same `/admin/...` URL, this effectively grants too-wide access. e.g. `/admin/secrets` is in the System category for `platformOwnerRoles` only — good — but `/admin/wallet` is granted to customers via "Wallets & Payments" customer items pointing at `/admin/customer/wallet`, so the path check is correct only by accident. | Drive RBAC from a `routePermissions` map keyed by route, not by reverse-derived sidebar items. | Med |
| D4 | Agency Owner sees `Agency Staff`, `Staff Permissions` under Staff Management, but the linked route `/admin/users` is the platform-wide users page — agency owners should not see other agencies' users. | Build `/admin/agency/users` scoped to the agency. | High |
| D5 | Customer sees `Refunds` and `Invoices` items that go to `/admin/customer/bookings` — fine. But `Wishlist` and `Rewards` link to `/admin/customer/wishlist` / `/admin/customer/rewards` and the routes use a wildcard `/admin/customer/*` → page renders the same `CustomerPortalPage` for everything. Verify these tabs actually exist inside the portal. | Audit `CustomerPortalPage` route handling; if tabs are missing, build them. | Med |
| D6 | No QA / Internal Support view differs from Super Admin — both see everything. | Define what QA can mutate (probably read-only). | Low |

---

## E. Booking Flow Issues

Expected pipeline: **Search → Select fare → Fare recheck → Passenger details → (Hold | Pay & Issue | Issue from Wallet) → Ticket PDF → Confirmation**.

| # | Step | Current state | Gap | Priority |
|---|---|---|---|---|
| E1 | Search | Public + admin both clean (no auto-search on load). ✅ | — | — |
| E2 | Select fare | Result cards work, but no fare-class / brand-fare selector (Economy Saver vs Flex). | Add fare-brand chooser before continuing to booking. | Med |
| E3 | Fare recheck | **Not implemented** as a visible step. Suppliers can re-price between selection and booking; user must be informed. | Add a "Verifying fare with airline…" interstitial that calls a recheck endpoint and surfaces any price/timing change with explicit "Accept new price" CTA. | High |
| E4 | Passenger details | Step 1 polished (aria-describedby, free-cancel badge, hold tooltip, fare breakdown). ✅ | Add collapse-when-complete for adult cards; persist draft to localStorage. | Med |
| E5 | Hold Booking (B2B) | Button + tooltip exist on Step 1 but no **/admin/bookings?status=on_hold** queue, no expiry countdown, no auto-cancel rule. | Build queue + expiry job (mocked). | High |
| E6 | Pay & Issue (B2B) | No payment confirmation modal that summarises wallet/card cost before issue. | Build modal. | High |
| E7 | Issue from Wallet (B2B) | No wallet-balance check before allowing issuance; no insufficient-funds error path. | Add precheck. | High |
| E8 | Ticket PDF | `src/lib/eticket-pdf.ts` exists. Verify it is reachable from Confirmation step + Bookings list "Download e-ticket" action. | Wire button. | Med |
| E9 | Refund / Cancellation | No customer-facing initiator; admin has no refund workflow page (see C5). | Build. | High |
| E10 | Booking expiry | No countdown timer on Hold bookings. | Build. | Med |
| E11 | Booking Requests | See section G. | — | — |
| E12 | Payment verification | Payment methods page lists nothing actionable. | Build. | High |

### B2C vs B2B CTAs

- **B2C Customer:** today the booking page exposes Hold / Pay & Issue / Issue from Wallet to every role. Should be:
  - Customer → `Pay & Book` + `Reserve / Request Booking` + `WhatsApp Help`.
  - Agency → `Hold` + `Pay & Issue` + `Issue from Wallet`.
- Drive button visibility from `useRole().currentRole` in `BookingPage.tsx`.

---

## F. Wallet / Payment Flow Issues

| # | Issue | Fix | Priority |
|---|---|---|---|
| F1 | Agency wallet & Customer wallet share `/admin/wallet` and `/admin/customer/wallet`; ledger filtering by entity is not visible. | Add entity filter + ledger export. | High |
| F2 | "Add Balance", "Pay via 1Link", "Pay by Card", "Bank Transfer", "Deposit Request" all link to the same `/admin/wallet` page — no tabs. | Build sub-tabs on Wallet page for each method. | High |
| F3 | "Deposit Approvals" sidebar item is dishonest (see C2). Build a real approvals queue. | Build. | High |
| F4 | "Manual adjustment with reason" — no UI. | Add an Admin-only "Adjust Balance" dialog with mandatory reason + audit trail. | High |
| F5 | "Reconciliation" — no UI. | Build later. | Low |
| F6 | "Payment Gateways" — no UI. Gateway toggles, sandbox/live mode, fees per gateway should live here. | Build. | Med |
| F7 | Invoices: `Invoices` in agency section points to `/admin/tickets` — invoices and tickets are different entities. | Split `/admin/invoices`. | Med |
| F8 | Refunds: agency + admin + customer all link to `/admin/bookings` for refunds — same generic page. | Build `/admin/refunds`. | High |

---

## G. Booking Requests Issues

The page `/admin/booking-requests` renders a single list of `BookingRequest` items with status, assigned staff, notes — good foundation. Gaps:

| # | Field / Feature | Current | Recommended |
|---|---|---|---|
| G1 | Request **type segmentation** | Single list. | Add type filter chips: Umrah / Visa / Study Visa / Tour / Group / Manual Flight / WhatsApp Inquiry. |
| G2 | "Phone" + "Email optional" columns | `BookingRequest` has them but the list view does not surface them prominently. | Show phone + WhatsApp action button per row. |
| G3 | WhatsApp action | Missing. | Add `WhatsApp` button that opens `https://wa.me/<phone>?text=...prefilled`. |
| G4 | "Created date/time" column | Not visible in list (only inside edit). | Add column + sort by newest. |
| G5 | "Selected service/package" | Field exists (`packageName`) — confirm it is shown. | Verify; add link to source service. |
| G6 | Assigned staff dropdown | Free-text input today. | Convert to staff picker with avatars. |
| G7 | Inbox unification | Customer WhatsApp / inquiry forms / public `BookingRequestPage` submissions — verify they all write into `listBookingRequests`. | Wire any orphans. |
| G8 | SLA / aging | No "request is older than X days" badge. | Add. |

---

## H. Notification / Settings Issues

| # | Issue | Fix | Priority |
|---|---|---|---|
| H1 | `NotificationsPage` shows feed + delivery logs but **no Settings**: no admin email, admin phone, channel toggles (WhatsApp/SMS/Email), safe-journey reminder schedule, message templates, or "Send test" button. | Add a `Settings` tab on `/admin/notifications` with: Admin email, Admin phone, WhatsApp on/off, SMS on/off, Email on/off, Safe-journey reminder lead-time, Template editor (booking confirmation, e-ticket, payment received, hold expiry, refund initiated), "Send test" action per channel. | **High** |
| H2 | Templates should support `{{variables}}`. | Add variable picker. | Med |
| H3 | Delivery log row shows error string but no "Retry" action. | Add Retry button. | Low |

---

## I. UI / UX Issues

| # | Area | Issue | Fix | Priority |
|---|---|---|---|---|
| I1 | Sidebar | Long, mostly dishonest. | C3 IA cleanup. | High |
| I2 | Header | Role switcher in production. | Remove. | High |
| I3 | Sidebar collapse | Only one category open at a time — when most items are duplicates this is fine, after C3 IA cleanup keep this behaviour. | — | — |
| I4 | Empty states | Many admin pages show raw tables with no empty illustration / CTA. | Use `EmptyState` component everywhere. | Med |
| I5 | Status badges | Inconsistent (some use colour, some don't). | Standardise via `StatusBadge`. | Low |
| I6 | Toasts | OK. | — | — |
| I7 | Public mobile | Booking stepper not sticky; nav menu OK. | Fix stepper. | Med |
| I8 | A11y | Public pass landed (focus rings, aria); admin pages still missing skip-link + landmark roles. | Add. | Med |

---

## J. Duplicate Items to Remove or Merge (action list)

Apply these directly to `src/lib/admin-navigation.tsx`:

1. **Remove** `Issue Ticket` (line 124).
2. **Remove** `Refund PNR` (line 127).
3. **Remove** `Manage Quotations` (line 130).
4. **Remove** `Airline Logo Library` (line 238) — turn into a tab inside Provider Systems.
5. **Either remove or repurpose** `Fare Management` (line 146).
6. **De-duplicate** `Customers` between Management and Customers categories (lines 217 / 235).
7. **Remove** the Operations duplicate `Manual Booking Requests` (line 209) — Booking Requests already covers it.
8. **Remove** the Customer-side `Notifications` and `Support Tickets` items in Support category (lines 269–270) unless those routes actually render — verify first.
9. **Collapse** all Financial method labels (`1Link Payments`, `Bank Transfers`, `Card Payments`) into a single `Payments` with method tabs inside the page.
10. **Collapse** all method labels in Agency Finance the same way.
11. **Collapse** all method labels in Wallet & Payments (customer) the same way.
12. **Collapse** Reports category into one `Reports` link until report builder exists.

After these deletions the sidebar drops from ~85 items to ~45 — much closer to enterprise norm.

---

## K. Missing Features (build queue)

1. Notification Settings UI (H1).
2. Hold Booking queue with expiry countdown (E5, E10).
3. Fare recheck interstitial (E3).
4. Wallet method tabs + Deposit-approval queue + Manual adjustment dialog (F2-F4).
5. Refund workflow page (E9, F8).
6. Real Reports hub.
7. CMS Banners / Static Pages / Testimonials editors.
8. Audit log viewer.
9. Agency-scoped users page (D4).
10. Centralised WhatsApp number + floating button everywhere (B6).
11. Study Abroad in top navbar (B4).
12. Booking-request inbox: WhatsApp action, type chips, created-at column (G1, G3, G4).

---

## L. Priority Fixes (do this order)

**Sprint 1 (1–2 days, IA + trust):**
- J1–J12: sidebar cleanup.
- D1: remove role switcher in production (gate behind `?devRole=` only).
- D2: redirect unauthenticated `/admin` visitors to `/signin`.
- H1: notification settings tab.
- C2: either build or remove the dishonest sidebar links.

**Sprint 2 (3–5 days, booking integrity):**
- E3 fare recheck, E5 hold queue, E6 pay-modal, E7 wallet precheck, E9 refund workflow.
- G1, G3, G4 booking-requests inbox upgrades.
- B4 Study Abroad in navbar, B6 WhatsApp consolidation.

**Sprint 3 (1 week, finance):**
- F2 wallet method tabs, F3 deposit approvals queue, F4 manual adjustment, F8 refunds page, F7 invoices split.

**Sprint 4 (UX polish):**
- B7 flight-search advanced filters / JSON-LD / mobile bottom-sheet.
- B8 booking steps 2-4.
- Reports hub.
- CMS editors.

---

## M. Final Recommended Implementation Plan for Codex

Copy-paste this prompt into Codex. It is scoped to **Sprint 1 only** — re-issue similar prompts for later sprints after each pass.

````text
You are working on a React 18 + Vite 5 + Tailwind v3 + TypeScript frontend (Travelian OTA).
No backend changes (aws/** is off-limits). Use existing shadcn/ui primitives and semantic tokens.
Reference: .lovable/audit-report.md (sections C, D, H, J).

Execute SPRINT 1 in this order. After each task: `bun run build`, fix TS errors, open the affected
route in the preview, then move on. Update .lovable/audit-report.md with ✅ next to each completed task.

================================================================
TASK 1 — Sidebar IA cleanup  (file: src/lib/admin-navigation.tsx)
================================================================
Apply the 12 deletions/collapses listed in section J of the audit report:
  J1  Remove the standalone `Issue Ticket` item.
  J2  Remove the standalone `Refund PNR` item.
  J3  Remove the `Manage Quotations` item.
  J4  Remove `Airline Logo Library` from sidebar; add a `Logos` tab inside ProviderSystemsPage that
      reuses the existing logo upload component.
  J5  Remove `Fare Management` (the `Flight Pricing & Rules` item covers it for now).
  J6  Keep only one `Customers` item (in the Customers category); remove the duplicate from Management.
  J7  Remove `Manual Booking Requests` from Operations (Booking Requests covers it).
  J8  Remove customer-side `Notifications` and `Support Tickets` items unless their target routes
      actually render — verify `CustomerPortalPage` first.
  J9  Replace `1Link Payments`, `Bank Transfers`, `Card Payments` with one `Payments` item pointing
      to /admin/payments and add method tabs inside PaymentsPage (Card / 1Link / Bank Transfer).
  J10 Same collapse for Agency Finance method items.
  J11 Same collapse for customer Wallet & Payments method items.
  J12 Collapse the Reports category to a single `Reports` item pointing to /admin/reports; create a
      placeholder ReportsPage at that route with a "Reports hub coming soon" empty state.

================================================================
TASK 2 — Remove dishonest sidebar links  (file: src/lib/admin-navigation.tsx)
================================================================
For each item listed in audit section C2, either (a) remove from sidebar, or (b) keep but route to a
new placeholder page with the named title and an EmptyState that says "This module is on the
roadmap". Do NOT keep a label that lies about its destination.
Items to handle: Hotel Markup Rules, Package Markup Rules, Agency Pricing Rules, Commission Rules,
Deposit Approvals, Approvals Center, Credit Limits, Reconciliation, Payment Gateways, Failed Searches,
Support Tickets, Follow-ups, UBL Settings, 1Link Settings, Payment Webhook Logs, Payment Failure Logs,
Audit Logs, API Settings, Website Banners, Static Pages, Testimonials.

================================================================
TASK 3 — Remove role switcher from production UI
================================================================
File: src/components/RoleSwitcher.tsx and wherever it is mounted (AdminHeader / AdminLayout).
- Keep the component but render it only when `import.meta.env.DEV` is true OR the URL contains
  `?devRole=1`.
- In production builds users see only their real name + role label, no dropdown.

================================================================
TASK 4 — Auth gate for /admin
================================================================
File: src/contexts/RoleContext.tsx (`getInitialRole`).
- If `getSession()` returns null AND the current pathname starts with `/admin`, do NOT default to
  `customer`. Instead navigate to `/signin?next=<pathname>` (use the router via a wrapper effect, or
  add the check in AdminLayout). Customer Portal should require a real customer session.

================================================================
TASK 5 — Notification Settings tab
================================================================
File: src/pages/NotificationsPage.tsx.
- Wrap current content in a shadcn Tabs component with three tabs: Inbox · Delivery Logs · Settings.
- Build the Settings tab with the following form (no backend; persist to localStorage key
  `travelian.notificationSettings`):
    * Admin email (input)
    * Admin phone (input, +country picker — reuse `CountryCodePicker`)
    * Channel toggles: WhatsApp, SMS, Email
    * Safe-journey reminder lead-time (Select: 24h / 12h / 6h / 2h before departure)
    * Templates editor: 5 cards (Booking confirmation, E-ticket issued, Payment received, Hold expiry,
      Refund initiated) each with Subject + Body textarea supporting `{{variables}}`.
    * "Send test" button per channel that toasts success.
- Show settings only for super_admin / admin roles.

================================================================
DEFINITION OF DONE
================================================================
- `bun run build` passes.
- No new TypeScript errors.
- Sidebar item count for super_admin drops below 50.
- /admin without a session redirects to /signin.
- /admin/notifications has a Settings tab with all listed controls.
- Each "roadmap" placeholder page renders cleanly with an EmptyState.
- audit-report.md updated with ✅ next to each completed task.
````

---

## Open Questions (please confirm before Codex starts)

1. **Quotations module** — kill permanently, or hide-for-now and ship later? (I assumed hide.)
2. **Fare Management vs Flight Pricing & Rules** — are these meant to be two distinct admin screens (fare-class/RBD mapping vs. markup rules), or just one? Current code points both labels at the same page.
3. **Customer Portal `/admin/customer/*`** — is this intentional, or should the customer dashboard live under `/account/*` on the public site only? Today customers land in an admin-styled shell which feels off.
4. **Reports** — do you want a real report builder now, or just a placeholder until later?
5. **WhatsApp number** — should it be one global number (settings) or per-service-line (Umrah vs Flights vs Visa)?
6. **Role switcher** — keep behind `?devRole=` flag in DEV only, or remove the component entirely?

---

_End of report. No files changed except this report at `.lovable/audit-report.md`._

---

## Sprint 2 Progress (auto-updated)

- ✅ Task A — Sidebar IA cleanup finished: removed `Fare Management`, duplicate `Customers`, redundant customer `Notifications`. Reports now routes to `/admin/reports` (placeholder page). Added Audit Logs / Webhook Logs / Reconciliation / Payment Gateways as visible roadmap pages.
- ✅ Task A — Added `Hold Bookings` queue at `/admin/bookings/holds` with live countdown.
- ✅ Task B — Booking Requests inbox upgraded: type filter chips with counts, sortable Created column, age badge, WhatsApp action, table on desktop / cards on mobile, staff Select.
- ✅ Task C — Fare-recheck interstitial (deterministic 15% mock), Payment-confirmation dialog with wallet precheck, role-based CTAs (customer gets Reserve / Request Booking + WhatsApp Help, Pay button label switches to "Pay & Book").
- ✅ Task D — Study Visa + Group Ticketing added to public navbar; WhatsApp number centralised in `src/lib/site-config.ts`; floating WhatsApp button mounted once in `PublicLayout`.
- Booking stepper was already sticky (`sticky top-0`) on the public BookingPage — no change required.
- ✅ Sprint 2 follow-up — Centralized remaining public/detail WhatsApp CTAs, expanded Booking Request type chips for Group / Manual Flight / WhatsApp Inquiry, removed redundant sidebar WhatsApp Support item, and made automatic hold expiry use the `expired` status instead of manual cancellation.
