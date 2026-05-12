# Travelian Platform — Comprehensive Overhaul Plan

This is a large multi-area refactor. I'll group work into batches and execute sequentially, preserving all existing working functionality.

## Batch 1 — Navigation & Header Cleanup
- **PublicNavbar.tsx**: remove language/currency switcher, Heart, Bell, Support, Admin Portal link, generic About link. Add "About Travelian" nav item. Keep Sign In / Register.
- **SearchTabs.tsx**: remove "Activities" tab, replace with "Group Booking". Ensure "Flights" nav goes to `/` (homepage), not `/flights-search`.
- Add **ScrollToTop** component in `App.tsx` so every route change scrolls to top.

## Batch 2 — Hero & Homepage
- Reduce hero banner height, two-line text only ("Travelian" / "Your Trusted Travel Partner"), reduced font.
- Remove "Popular: Makkah Flights..." chip line.
- Fix all homepage section CTAs (Today's Deals, Trending Destinations, Hotel sections, Umrah Book Now, Top Destinations, Popular Tours, Travel Guide Blog) to route to real pages.

## Batch 3 — Search Section Polish
- Search card: rounded top + bottom corners, premium styling.
- Default trip type: One Way (verify).
- Wider inputs, tighter spacing between Date and Search button.
- Calendar opens on full-field click.
- Advanced calendar with month/year dropdowns (DOB 1925→now, expiry now→2050) — already in `advanced-date-picker.tsx`, ensure used.
- Multi-city default 2 rows + "+ Add Flight".
- Cabin dropdown shows all 4 classes; closes on outside click.
- Passenger dropdown fully visible.

## Batch 4 — Search Results Page
- Sticky search bar with improved color/width.
- "Modify Search" button opens edit modal (From/To/Dates/Travelers/Cabin).
- 1-week date row: "Mon, Apr 13" + "See Price", centered selected, no "Cheapest" label.
- Clean internal route summary.

## Batch 5 — Booking / Traveler Form
- Section headings: Traveler Information / Identity Document Information / Contact Information.
- Title default Mr; First Name placeholder "Given Name"; Last Name "Surnames"; Gender optional.
- Identity Document section: DOB, Passport Number, Nationality (default Pakistan), Country of Issuance (default Pakistan), Date of Expiry. Remove Issue Date.
- Domestic flights allow CNIC OR Passport; international = Passport only.
- Contact: Email, Mobile (country code dropdown default +92, type "P" jumps to Pakistan), Alternate Mobile. Numeric-only validation.

## Batch 6 — Authentication
- Create `/signin` and `/register` pages with validation, responsive UI, social login buttons (Google/Facebook/Apple — visual only, no backend).
- Wire navbar Sign In / Register buttons to these routes.

## Batch 7 — About Travelian Page
- Replace `/about` content: hero (Travelian / tagline), Who We Are, Our Services (7 cards), Why Choose Us, Process timeline (Search→Select→Book→Travel), animated stats counters, testimonials slider, CTA section (Contact / Book Flights / WhatsApp).

## Batch 8 — Page Content Expansion
- **Hotels**: Featured, Popular Destinations, Luxury, Deals, Reviews, FAQ.
- **Umrah**: Package comparison, visa assistance, testimonials, timeline, FAQ.
- **Tours**: Categories, destinations, featured, testimonials.
- **Visa**: Visit Visa, Study Visa, country cards, requirements, processing times, FAQ.
- **Deals**: Flight/Hotel/Umrah/Seasonal sections.
- All non-home pages: consistent header (Page Name + tagline) at standardized smaller height.

## Batch 9 — Hotel & Umrah Booking Flows
- Hotel "Select Room" → reuses `/booking` flow (traveler form).
- Umrah "Book Now" → package detail page with details, hotel/flight info, processing time, required docs, T&C, inclusions/exclusions, inquiry CTA.

## Batch 10 — Footer & Routing Cleanup
- Audit `PublicFooter` links; create stub pages where missing (e.g., FAQ, Privacy, Terms, Careers); ensure social icons link out.
- Ensure no dead links across the app.

## Batch 11 — Imagery
- Use AI image generation for hero, hotel, Umrah (Makkah/Madinah), tour destinations, visa country landmarks. Replace emoji/placeholder icons.

## Batch 12 — Final QA
- Verify build, viewport scroll-to-top, all CTAs reach a page, dropdowns don't clip, mobile responsive at 375px.

## Technical Notes
- Add `<ScrollToTop />` listening to `useLocation().pathname`.
- Authentication is UI-only (no Lovable Cloud yet) — buttons show toasts; sign-in form validates with zod.
- New routes to register in `App.tsx`: `/signin`, `/register`, `/umrah/:id` (package detail), plus footer stubs (`/faq`, `/privacy`, `/terms`, `/careers`).
- Reuse `BookingPage` for hotel checkout via query string `?type=hotel&id=...`.
- Keep all admin routes untouched.
- This will touch ~25-30 files and add ~10 new files. Image generation will take additional time.

## Out of Scope (will note for follow-up)
- Real backend auth (Lovable Cloud) — only ask to enable if you want functional login.
- Real payment processing.
- Real flight/hotel inventory APIs.

Approve to proceed, or tell me which batches to prioritize / skip.