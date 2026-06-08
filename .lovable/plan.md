## Re-audit results (Home + /flights-search + /booking)

Big progress since last pass — most Batch 1b/2/3 items have landed. Here is what is **still outstanding**, grouped by impact. Pick one or say "go in order".

---

### Home — minor leftovers

- **Umrah Packages rail** — the three cards still use the **same Makkah hero image** and near-identical titles ("21 Days Luxury / 21 Days / 21 Day Premium"). Looks like seed data. Vary imagery (Madinah skyline, Kaaba night, Jabal Nur), differentiate copy + chip set (Visa / 5★ hotel / Ziyarat), distinct CTAs.
- **Recent Searches** rail says "No recent searches yet" even after a search — not wired to localStorage write on PublicFlightsPage submit. Wire it.
- No **reviews carousel** and no **partner logos** rail (Visa / Mastercard / JazzCash / Easypaisa / IATA / PIA). Add a thin trust strip + 3-card reviews row before footer.
- No **app-download badges** (iOS / Android "coming soon" exists in supplier block but not above-the-fold-friendly).

### /flights-search — remaining gaps

Tested LHE→DXB Jun 15. Results, breadcrumbs, sort dropdown, swap icon, price-range inputs and date-strip prices all working now. Remaining:

- **Currency** — prices still rendered as `INR 33,467` even though the site switcher is PKR. Currency override / conversion not applied to result cards or to the date-strip pill. Route through `useLocale().formatPrice` (treat supplier amount as the base and convert).
- **Loading state** — initial 1–2s shows blank with only a progress bar; no **skeleton cards** in the results column.
- No **applied-filter chips** row above results with "Clear all" (price slider / airlines / stops / time).
- Filter sidebar still **not sticky** on scroll. Add `sticky top-20` on lg+.
- No **baggage / refundable / CO₂** filters, no **compare drawer**, no **price-alert subscribe** ("Notify me when LHE→DXB drops below PKR 80,000").
- No **bottom sheet** for filters/sort on mobile + no sticky "Sort & Filter" CTA.
- SEO: missing `BreadcrumbList` + `ItemList` JSON-LD; URL not slugged (`/flights/LHE-DXB/2026-06-15`).
- Truly-empty state still has no "Try flexible dates / nearby airports" suggestion block (only the curated fallback prevents zero-results today).

### /booking — remaining gaps

Reached step 1 via a real flight click. Currency converts to PKR (+ note "Supplier fare received in INR"), segments + 1 Stop derived correctly, redundant type toggle removed, trust strip + Save & Continue Later present. Remaining:

- **Fare Summary still single-line** — no base / taxes / fees / add-on breakdown. Use `PricingBreakdownCard` (already exists) with: Base fare, Taxes & fees, Seat/baggage add-ons, Total, plus "Includes 7kg carry-on" microcopy.
- **Hold Booking** button has no tooltip — add a hover/tap explanation ("Free 24-hour PNR hold. We will email you to confirm before charging.").
- No **"Free cancellation until …"** badge and no **fare-rules summary** (refundable y/n, change fee) next to the CTA.
- **Stepper not sticky** on mobile when the form scrolls.
- Long form has no **collapse-when-complete** for the Adult card (once required fields are valid, collapse to a summary row).
- **A11y** — form inputs missing `aria-describedby` linking to the helper microcopy ("Name must match exactly as shown on your passport").
- Steps 2 / 3 / 4 (Review, Payment, Confirmation) not re-audited yet; will check during the implementation pass.

---

### Suggested execution batches (revised)

```text
Batch A  Booking polish        Fare breakdown card · Hold tooltip · Free-cancel badge · sticky stepper · collapse-completed adult · aria-describedby
Batch B  Flights polish        Currency conversion on cards + date strip · skeleton cards · applied-filter chips + Clear all · sticky filters
Batch C  Home polish           Vary Umrah cards · wire Recent Searches · reviews carousel + partner logos strip
Batch D  Flights advanced      Baggage / refundable / CO2 filters · compare drawer · price-alert · mobile bottom-sheet · JSON-LD + slugged URL
Batch E  Booking steps 2-4     Audit Review + Payment + Confirmation, then close gaps
Batch F  Trust & social proof  Site-wide reviews, recently-viewed rail, urgency badges
Batch G  Account & bookings    .ics export · wishlist badge · saved-progress restore
Batch H  i18n + a11y + perf    Apply locale across remaining strings · RTL pass · focus rings / skip link / srcset / preconnect
```

Tell me which batch to start with, or reply "go in order from A".