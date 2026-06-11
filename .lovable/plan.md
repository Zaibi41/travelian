# Travelian — Next Plan (Sprint 2)

Re-scan of the codebase after Sprint 1. Sidebar, auth gate, notification settings and payment tabs landed cleanly. The remaining audit items now cluster into four buckets. Sprint 2 covers buckets 1 + 2 (must-fix trust + booking integrity) and closes the Sprint-1 leftovers; buckets 3 + 4 stay queued for Sprint 3/4.

---

## 0. Sprint-1 leftovers to close first

Verified against current files:

- `src/lib/admin-navigation.tsx` still has **`Fare Management`** (line 143) duplicating `/admin/flights`, the **duplicate `Customers`** entry in `Management` (line 220) vs `Customers` category (line 198), and the customer-side `Notifications`/`WhatsApp Support` items (lines 241–242) all pointing at `/admin/customer/support` which is a single page with no tabs.
- `Reports` category points at `/admin` (line 228) — still dishonest.
- All "dishonest" links from audit §C2 (Hotel/Package Markup Rules, Deposit Approvals, UBL/1Link Settings, Audit Logs, Banners, Static Pages, Testimonials, etc.) are no longer in the sidebar, but **no placeholder pages exist** for the ones we want to keep on the roadmap.
- `RoleSwitcher.tsx` is unmounted from `AdminLayout` ✅, but the component file still exists with no DEV-only gate — fine to leave, just confirm.

Action (Task A): finish J5, J6, J8, J12 + add `/admin/reports` placeholder + roadmap pages.

---

## 1. Tasks (in order)

### Task A — Finish sidebar IA cleanup
File: `src/lib/admin-navigation.tsx`, plus a new `src/pages/ReportsPage.tsx` and `src/pages/RoadmapPlaceholderPage.tsx`.

1. Remove `Fare Management` row (line 143).
2. Remove the duplicate `Customers` row inside the `Management` category (line 220) — keep the one in the `Customers` category.
3. Either build real tabs in `CustomerPortalPage` for Notifications/WhatsApp Support or remove those two `Support` items (lines 241–242). Default: remove until tabs exist.
4. Point `Reports` to `/admin/reports`; add route + `ReportsPage` with `EmptyState` "Reports hub coming soon".
5. Add `<Route>` + sidebar entries (System category, super-admin only) for: `Audit Logs`, `Webhook Logs`, `Reconciliation`, `Payment Gateways`. Each renders the new `RoadmapPlaceholderPage` (title + roadmap copy + back-to-dashboard CTA).

### Task B — Booking-Requests inbox upgrade (audit §G)
File: `src/pages/BookingRequestsPage.tsx`.

1. Add a **type filter chip row** above the list using `BookingRequest.type` values (Umrah, Visa, Study Visa, Tour, Group, Manual Flight, WhatsApp Inquiry) + an "All" chip with counts.
2. Replace the current single-row card layout with a **table** on `md+` (Created · Type · Customer · Phone · Service · Status · Assigned · Actions) and keep cards on mobile.
3. Add a **Created date/time** column, sortable, default sort = newest first.
4. Add a **WhatsApp action button** per row → `https://wa.me/<digitsOnly(phone)>?text=Hello%20{{customerName}},%20regarding%20your%20request%20{{requestId}}`.
5. Add an **aging badge** (>2 days = amber, >5 days = red) computed from `createdAt`.
6. Convert the free-text `Assigned staff` field into a `Select` populated from a static staff list constant (until users API is wired).

### Task C — Booking flow integrity (audit §E3, E5, E6, E7)
Files: `src/pages/public/BookingPage.tsx`, `src/lib/booking-store.ts`, new `src/pages/HoldBookingsPage.tsx`.

1. **Fare recheck interstitial (E3).** Between Step 1 "Continue" and Step 2 show a 1.2 s loader card "Verifying fare with airline…" then either continue or surface a `Dialog` "Price changed from PKR X → PKR Y. Accept new price?" with Accept/Decline. Logic is mocked: 15 % chance of a +2 % price bump, deterministic via `requestId` hash so it is testable.
2. **Hold queue (E5).** New route `/admin/bookings/holds` shown in the Bookings & Ticketing category for internal + agency roles. Lists bookings with `status === "held"` from `booking-store`, shows expiry countdown (`HH:MM:SS`) until `holdExpiresAt`, and an "Issue now" / "Cancel hold" action pair. If expiry is reached client-side, status auto-flips to `expired` and a toast fires.
3. **Pay-modal (E6).** On Step 3 "Pay & Issue" open a `Dialog` summarising payable amount, wallet balance, and resulting balance, with a final confirm button. Disable confirm when wallet < payable for the "Issue from Wallet" method (E7 precheck).
4. **Role-based CTAs.** In `BookingPage.tsx` drive the visible action buttons from `useRole().currentRole`:
   - `customer` → `Pay & Book`, `Reserve / Request Booking`, `WhatsApp Help`.
   - `agency_owner` / `agency_staff` → `Hold`, `Pay & Issue`, `Issue from Wallet`.
   - Internal roles → all of the above.

### Task D — Public site fixes (audit §B4, B6, B10)
1. **Study Abroad in navbar** — `src/components/public/PublicNavbar.tsx`: add `Study Visa` link (route `/study-abroad`) between Visa and Group.
2. **Centralised WhatsApp number** — move the hard-coded number out of `src/components/public/WhatsAppIcon.tsx` into a single constant in `src/lib/site-config.ts` (new file) read by both the floating icon and any inline CTAs. Ensure the floating button is mounted exactly once in `PublicLayout` (remove any duplicate mounts in individual pages).
3. **Booking stepper sticky on mobile** — in the public `BookingPage` stepper container add `sticky top-16 z-30 bg-background/95 backdrop-blur md:static`.

### Task E — Documentation
1. Append a Sprint-2 completion section to `.lovable/audit-report.md` with ✅ next to each task touched.
2. Update `.lovable/plan.md` to mark Sprint 1 as done and Sprint 2 as in-flight.

---

## 2. Out of scope (queued for Sprint 3 / 4)

- Wallet method tabs, deposit-approvals queue, manual adjustment dialog, refund workflow page, invoices split (§F).
- Real Reports builder, CMS editors (Banners / Pages / Testimonials), audit-log viewer (§K).
- Flight-search advanced filters / JSON-LD / mobile bottom-sheet (§B7).
- Booking Steps 2–4 polish beyond what Task C requires (§B8).
- Server-side super-admin guards (needs backend).

---

## 3. Technical notes

- Stick to existing primitives: `Tabs`, `Dialog`, `Select`, `Table`, `Badge`, `EmptyState`, `useRole`, `booking-store`.
- All persistence remains client-side (`localStorage`) until backend lands; mirror the `travelian.notificationSettings` pattern from Sprint 1 for new state (`travelian.bookingHolds`, `travelian.siteConfig`).
- No edits inside `aws/**` and no schema changes.
- After each task: rely on the harness build, then visit the affected admin/public route in the preview to confirm.

---

## 4. Open questions (please confirm before I start)

1. **Roadmap placeholders** — okay to add Audit Logs / Webhook Logs / Reconciliation / Payment Gateways as visible-but-empty pages, or hide them from the sidebar until they are real? (Default: show with placeholder.)
2. **Hold expiry default** — if a booking has no `holdExpiresAt`, default to `createdAt + 24h`? Or skip the countdown for those?
3. **Staff picker source** — fine to ship a hard-coded 4-name list for now (Asad, Maira, Fahad, Bilal) and swap to the real users API later?
4. **Fare-recheck behaviour** — keep the 15 % mocked price-change rate, or always pass through (no dialog) until real supplier API is wired?
