## Status

Batches A (Booking polish), B (Flights polish), C (Home polish) are done. Build is clean. Remaining: **D → H**.

Below is a single, self-contained prompt you can paste into Codex. It tells it exactly which files to touch, what to add, and what "done" looks like for each batch. Codex can execute the batches in order and stop after each for review, or run end-to-end.

---

## Codex prompt (copy-paste)

````text
You are working on a React 18 + Vite 5 + Tailwind v3 + TypeScript app (Travelian OTA).
Frontend only. Use existing shadcn/ui primitives in src/components/ui/*.
Use semantic tokens from src/index.css + tailwind.config.ts — NEVER raw colors.
Currency/locale: src/contexts/LocaleContext.tsx -> useLocale().formatPrice.
Do not touch backend (aws/**). Keep PRs small; commit per batch.

Execute Batches D → H below in order. After each batch:
  1. Run `bun run build` and fix any TS errors you introduced.
  2. Open the affected route in the preview and confirm the new UI is visible.
  3. Update .lovable/plan.md to mark the batch complete.

================================================================
BATCH D — Flights advanced (src/pages/public/PublicFlightsPage.tsx)
================================================================
1. Filters:
   - Add checkboxes: Baggage included, Refundable, Low CO₂ (<200kg).
   - Wire to existing filter state; derive flags from offer.fareRules / offer.baggage
     (fallback heuristic: refundable=offer.refundable ?? false; baggage=offer.baggageIncluded ?? offer.baggage?.checked>0; co2 from offer.emissionsKg ?? estimate by distance*0.09).
2. Compare drawer:
   - New component src/components/public/FlightCompareDrawer.tsx using ui/drawer.
   - Each result card gets a "Compare" checkbox (max 3). Floating bar appears at bottom:
     "N selected · Compare" -> opens drawer with side-by-side table (price, duration, stops, baggage, refundable, CO₂, airline).
3. Price alert:
   - Subtle card above results: "Notify me when {origin}→{dest} drops below {input}". On submit, push to localStorage key `travelian.priceAlerts` and toast success.
4. Mobile bottom-sheet:
   - On <lg, hide left sidebar; add sticky bottom bar "Filter · Sort" that opens ui/sheet from bottom containing filters + sort.
5. SEO:
   - Add JSON-LD BreadcrumbList + ItemList of top 10 offers via existing SEO component.
   - Add optional slugged route: register `/flights/:pair/:date` in src/App.tsx that redirects/aliases to /flights-search?from=&to=&depart=. Use existing PublicFlightsPage; just parse params.
6. Empty state:
   - When zero real results AND fallback disabled, render a card with 3 suggestion chips:
     "± 3 days flexible", "Nearby airports (ISB, MUX)", "Reset filters".

================================================================
BATCH E — Booking steps 2–4 (src/pages/public/BookingPage.tsx)
================================================================
Audit Review, Payment, Confirmation steps. Add:
- Review step: editable summary blocks with "Edit" links jumping back to step 1; show fare-rules accordion.
- Payment step:
   * Saved-cards stub (localStorage), method tabs (Card, JazzCash, Easypaisa, Bank transfer).
   * 3DS notice; PCI badge row; "You won't be charged until confirmation".
   * Coupon input wired to existing markup-engine discount preview.
- Confirmation step:
   * Big success state, PNR/booking ref, "Add to calendar (.ics)" button (generate client-side),
     "Download e-ticket" (reuse src/lib/eticket-pdf.ts), "Email receipt" toast stub, link to /account/bookings.
- Persist progress to localStorage key `travelian.bookingDraft` on each step change; restore on mount with "Resume your booking?" banner.

================================================================
BATCH F — Trust & social proof (site-wide)
================================================================
- src/components/public/ReviewsCarousel.tsx (3 cards, ui/carousel) and src/components/public/PartnerLogosStrip.tsx.
  Mount on HomePage (already partially planned), PublicHotelsPage, PublicPackagesPage, PublicToursPage.
- src/components/public/RecentlyViewedRail.tsx — reads localStorage `travelian.recentlyViewed` (push from FlightDetail, HotelDetail, TourDetail, PackageDetail on mount). Render on HomePage + each listing page.
- Urgency badges component src/components/public/UrgencyBadge.tsx ("3 booked in last hour", "Only 2 seats left at this price") — deterministic pseudo-random from offer id so it doesn't flicker.

================================================================
BATCH G — Account & bookings (src/pages/public/MyBookingsPage.tsx, AccountPage.tsx)
================================================================
- .ics export button per booking (reuse helper from Batch E).
- Wishlist: heart toggle on hotel/tour/package cards; store in localStorage `travelian.wishlist`; new tab in AccountPage listing them.
- Saved-progress restore: surface the `travelian.bookingDraft` from Batch E as a "Continue booking" card at top of MyBookingsPage.

================================================================
BATCH H — i18n + a11y + perf
================================================================
- i18n: sweep HomePage, PublicFlightsPage, BookingPage, PublicHotelsPage for hard-coded "PKR"/"USD"/number formatting and route through useLocale().formatPrice. Wrap user-visible static strings in a tiny t() helper (src/lib/i18n.ts) with en/ur/ar dictionaries for the top 50 strings; non-translated strings fall through to English.
- RTL: verify layout in dir="rtl" on Home, Flights, Booking; fix any left-/right- only utilities (replace with logical: ms-/me-/ps-/pe-).
- a11y:
   * Add visible focus rings (`focus-visible:ring-2 focus-visible:ring-ring`) to all custom buttons/links missing them.
   * Add a skip-link in src/components/public/PublicLayout.tsx ("Skip to content" → #main).
   * Ensure every <img> has alt; decorative ones get alt="".
- perf:
   * Add srcset / sizes to hero + card images (Unsplash already supports ?w= params).
   * Add <link rel="preconnect"> for fonts + Unsplash in index.html.
   * Lazy-load below-the-fold sections with React.lazy where the bundle saving is >20KB.

================================================================
DEFINITION OF DONE (each batch)
================================================================
- `bun run build` passes.
- No new TypeScript errors.
- New components covered by at least a smoke render check where a vitest file already exists for the area.
- .lovable/plan.md updated with a ✅ next to the completed batch and a one-line note of what shipped.
````

---

## What I need from you

Reply with one of:

1. **"Run Codex on D–H in order"** — I'll execute the batches here, one at a time, pausing after each for your review.
2. **"Only do D and E"** (or any subset) — I'll scope down.
3. **Edits to the prompt above** — tell me what to change before kicking off.
