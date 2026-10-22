# Hotels search and listing
- [x] Add matching destination, date, guest and room search controls.
- [x] Show compact horizontal results; preserve filters and FAQ.
- [x] Verify real search (successful response, zero live properties), calendars and guest controls at 1280/1024/768/375; verify populated listing and star filter with isolated QA fixtures.
- [ ] Project-wide clean validation is blocked by existing Flight and Group Ticketing errors; those files were left untouched as requested.

## 2026-10-18
- [x] Hotels tab on homepage uses same HotelSearchBar as /hotels-search
- [x] Fix preview typecheck errors (flight types, Info import, lucide title props)
- [x] Destination field opens popular-cities dropdown (reference screenshot)

## 2026-10-19
- [x] Site-wide dropdown clipping fix: hero overflow scoped to decorative layer, select z-index aligned to 1120, airport popover collision handling restored, hotel destination panel portaled
- [x] Cabin popup selected state: flat themed card + gold checkmark/ring (blue gradient removed)

## 2026-10-21
- [x] Homepage search bar: Umrah tab added with compact inline form (departure city, travel month, duration, package type) -> /umrah-sample with URL params
- [x] /umrah-sample reduced: search-card filters, four tier category cards with lowest "Starting from" price, matching packages section, WhatsApp-only custom-request strip (long form removed), FAQs + disclaimer kept
- [x] Verified at 1280 and 375: tab form, search navigation, tier filter, cards, WhatsApp strip; tsc clean, build OK
- [ ] Pending: user to confirm which tier carries the "Most popular" badge (currently Executive); per-package photos still fall back to the banner hero image
