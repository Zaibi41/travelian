# Public product retirement

The current public product is Flights, Group Ticketing, Hotels, Umrah, About and Contact. This supersedes the earlier decision to show disabled Visas/Tours labels.

## Removed

- PublicNavbar: removed both desktop/mobile Visa and Tour entries and their disabled-label logic.
- App router: removed `/visa-services`, `/visa/:id`, `/tour-packages`, `/tour/:id` and `/study-abroad` with their imports.
- Deleted PublicVisaPage, VisaDetailPage, PublicToursPage and TourDetailPage. Whole-source import and route searches confirmed these are public-only pages. Admin has separate management pages.
- Sitemap generator: removed Visa and Study Abroad entries. Tour pages had no sitemap entry.
- BookingRequestPage: restricted public package enquiries to Umrah and removed retired product detail links.
- Removed Visa-specific blog image fallback URL; shared blog image utilities remain.
- Removed the re-enableable PUBLIC_SERVICE_VISIBILITY flags. A permanent retired-product guard still blocks old public booking queries and coupons from surfacing removed products.

No Visa/Tour-exclusive local assets were found. `public/payments/visa.svg` is a payment network logo and remains necessary. Umrah visa inclusions/rates are part of the retained Umrah product, not standalone Visa services.

## Shared code retained

Admin Visa/Tour inventory, types, pricing, API clients and database-backed records remain per the explicit admin/B2B protection requirement. Shared BookingPage handles `/admin/booking`; its retired-product back links now point to admin management pages. Admin search's detail links also point to retained admin management routes instead of deleted public pages.

Group Ticketing supplier identifiers containing “Travel n Tours” remain: these are live supplier mappings, not Tour products. Payment Visa branding, analytics, auth, production environment settings and backend credentials were not changed.

Other routed legacy pages (Blog, Deals, Transfers, Careers, Umrah sample), reusable UI primitives and older admin modules remain because their router or admin use is confirmed, or removal is uncertain. The prior audit documents dormant code already removed; this pass does not remove working integrations solely to reduce files.

## Routes retained

Core: `/`, `/flights-search`, `/flight/:id`, `/hotels-search`, `/hotel/:id`, `/umrah-packages`, `/umrah/:id`, `/umrah-sample`, `/group-ticketing`, `/group-ticketing/:category`, `/about`, `/contact`.

Supporting: `/booking`, `/request-booking` (Umrah package requests), `/account`, `/my-bookings`, `/signin`, `/register`, `/auth/callback`, `/faq`, `/privacy`, `/terms`, `/careers`, `/transfers-search`, `/blog`, `/blog-public` alias, `/blog/:slug`, `/deals`, `/destination/:slug`. Admin routes are retained.

Removed product URLs now reach the existing frontend Not Found route. Internal public links no longer target these URLs. Existing external bookmarks to removed products will therefore stop opening service pages. Admin “View Visa/Tour” actions now open the relevant management list. These are intentional retirement changes; inspect server-side routing/SEO handling separately if HTTP 410 responses are desired.

## Validation

TypeScript, unit tests, production build and project-wide lint are run. Browser checks cover required routes, removed route handling and desktop/tablet/mobile navbar layouts. API responses are mocked for browser rendering checks; live supplier availability and transactions are not certified.
