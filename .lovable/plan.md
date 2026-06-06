## Re-audit findings (Home + /flights-search + /booking)

I re-checked the live preview at 1280px and full-page screenshots. Batch 1 partially landed but several home items did not take effect, and the two new pages have their own gaps. Grouped by page, in order of impact.

---

### 1. Home page — still outstanding from Batch 1

What I expected vs. what I see:

- Trust bar still reads the generic four items ("Secure booking / 4.8 rated support / No Hidden Charges / 24/7 Support"). The promised concrete numbers ("1M+ trips booked", "4.8★ from 12k reviews", "PCI-DSS secure") are not visible. → Re-apply.
- Trending Destinations cards do not show the `from PKR …` price overlay we agreed on. Only the badge (Popular/Trending/Holy City) is present. → Re-apply with overlay.
- Umrah Packages rail: all 3 cards use the **same Makkah hero image** and nearly identical titles ("21 Days Luxury / 21 Days / 21 Day Premium"). Looks like seed data, not curated. → Vary imagery + copy, add nights/from-price/inclusions chips, distinct CTAs.
- Sections **Today's Deals, Featured Hotels, Popular Tours, Travel Guides** are now completely **gone** from the home page (previous build had them as empty rails — now removed entirely). The home jumps Country grid → footer CTA, which is too short for an enterprise OTA. → Restore those four rails using the fallback data we built, between Umrah and Country grid.
- Country cards still only say "4 popular cities" — no property count, no `from PKR`, no rating. → Add 1 metric line per card.
- Single dark "Need help planning your journey?" CTA above footer is fine, but home is missing: reviews carousel, partner logos, app badges, and a recent-searches rail (localStorage-driven).

---

### 2. `/flights-search` — critical issues

Tested `LHE → DXB, Jun 09 2026, 1 adult, economy, one-way`.

Critical
- **0 flights found** empty state. The live provider call returns nothing and there is no curated fallback. Enterprise sites never show 0 results without alternative suggestions. → Add: (a) seeded mock fares for top routes so the rail is never empty in dev/preview, (b) "Try flexible dates / nearby airports / next 3 days" suggestions when truly empty.
- Date strip is **out of sync with the search date**. URL says Jun 09 but the active pill shows "Fri, Jun 5" and the strip starts there. Each pill says "See Price" instead of the actual fare. → Center strip on selected date ±3, fetch min fare per day, show "PKR X" or "—".
- Airlines filter box is **empty** — it should list carriers found in the result set (or a curated top list pre-fetch).

Layout / UX
- No results count + sort dropdown row ("12 results · Sort: Recommended ▾"). Only Best/Cheapest/Fastest pill tabs.
- No loading **skeleton cards** — page shows a thin progress bar then jumps to empty.
- No applied-filter chips above results, no "Clear all".
- Filters sidebar is not sticky on scroll; price slider has no input fields.
- Modify-Search bar at top is good but lacks an inline **swap (⇄)** icon between LHE and DXB (it shows the arrows icon decoratively, not interactive) and no "Add return" affordance.
- No breadcrumbs (`Home / Flights / LHE → DXB`).
- Missing: compare drawer trigger, price-alert subscribe, CO₂ filter, baggage filter, refundable filter.
- Mobile: no bottom sheet for filters/sort, no sticky "Sort & Filter" CTA.
- SEO: no `BreadcrumbList` or `ItemList` JSON-LD, no canonical with the route in slug form (`/flights/LHE-DXB/2026-06-09`).

---

### 3. `/booking` — critical issues

Tested step 1 of flight booking.

Data correctness
- Currency shows **INR 33,467** while the site switcher is PKR. The URL carried `currency=INR` and the page took it literally without converting. → Convert via LocaleContext, or override to active currency and show original as tooltip.
- Itinerary card shows **"0 Stops"** but the URL `layovers` array contains a CMB stop. Stop count is wrong. → Derive from `segments.length - 1`.
- Fare Summary is a single line (`Total Fare`). No base / taxes / fees / add-ons breakdown, no "Includes 7kg carry-on" line. → Use `PricingBreakdownCard`.

Form / flow
- "Flight type — International / Domestic" toggle at the top is **redundant** for a route that's already known (LHE→DXB is international). → Auto-detect from segments; remove the toggle, or hide when both endpoints are determined.
- No **"Free cancellation until …"** badge or fare-rules summary near the CTA.
- "Hold Booking" button needs a tooltip explaining what it does (free 24-hour PNR hold? deposit?). Today it's unlabeled.
- Step indicator (1 Traveler · 2 Seats · 3 Payment · 4 Confirmation) is not sticky on mobile.
- No trust strip near Continue (PCI badge, "Your card is not charged yet", secure SSL).
- Contact: email marked optional, but e-ticket delivery needs it. Soft-require + warning if blank.
- No "Save & continue later" → write progress to localStorage by email, restore on revisit.
- No traveler card collapse when complete; long forms scroll forever.
- A11y: form fields lack `aria-describedby` for the helper text, focus order skips between left form and right rail.

Confirmation step (4) is not in this audit but I will check it in the implementation pass.

---

### Suggested execution batches (revised)

Pick which to run next. Each ≈ one build cycle.

```text
Batch 1b  Home fixes that didn't land   (trust bar numbers, price overlay, restore 4 rails, vary Umrah cards, country metrics)
Batch 2   Flight results UX             (mock fallback, date-strip fix, sort dropdown, skeletons, filter chips, swap icon, sticky filters)
Batch 3   Booking integrity             (currency convert, stop count, fare breakdown, remove redundant toggle, sticky stepper, trust strip, save-and-resume)
Batch 4   Trust & social proof          (reviews carousel, partner logos, urgency badges, recently viewed, recent searches)
Batch 5   Detail pages polish           (gallery lightbox, sticky booking rail, breadcrumbs, JSON-LD schemas)
Batch 6   Account & bookings            (tabs, .ics export, wishlist badge, save-and-resume on booking)
Batch 7   i18n + currency real          (apply conversion site-wide, RTL, translated strings)
Batch 8   A11y + perf sweep             (focus rings, skip link, srcset, preconnect, heading order)
```

Tell me which batch to start with, or say "go in order from 1b" and I'll implement 1b → 2 → 3 sequentially.
