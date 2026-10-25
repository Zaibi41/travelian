> Historical audit: the Visa/Tour retention decision below was superseded by `public-product-retirement.md`.

# Public frontend cleanup audit

## Scope and retained behavior

The navbar already matches the requested Flights, Hotels, Umrah, Visas, Tours, About and Contact hierarchy. It keeps the official logo, phone, currency/language selectors and Sign In. Group Ticketing stays in search. Visas and Tours remain disabled with unavailable labels, following the earlier explicit product decision. No navbar rewrite was needed in this pass.

The public entry points are `/`, `/flights-search`, `/hotels-search`, `/umrah-packages`, `/visa-services`, `/tour-packages`, `/group-ticketing`, `/about` and `/contact`. Detail, booking, account and authentication routes remain intact. The visa/tour route guard continues to redirect home while those services are disabled.

## Confirmed removals

Before deletion, source import traversal from the application and test entry points identified candidate files. Whole-repository reference searches (excluding generated output and dependencies) confirmed only their own declarations referenced these components; there were no imports, dynamic imports, router entries or admin/B2B consumers.

| Removed component | Reason |
| --- | --- |
| `src/components/public/HomeB2B.tsx` | Unmounted promotional For Agents section outside the focused public navigation. |
| `src/components/public/HomeServices.tsx` | Unmounted generic service marketing section duplicating active product navigation. |
| `src/components/public/GroupTicketingCategories.tsx` | Unmounted category presentation; active GroupTicketingPage/search and category API helpers are retained. |

Removed the dormant Transfers entry, four state variables, submit branch, JSX and associated imports from SearchTabs. The default tab set did not include Transfers, and every caller using explicit visibleTabIds selected only Flights. Added accessible names to the remaining search buttons, whose text labels are hidden on mobile. Existing `/transfers-search` and its backend wrapper remain available for direct links.

Removed the Careers footer promotion and shortened Help Center / FAQ to FAQ. The Careers and FAQ URLs still work; legal, support, contact and social links remain necessary website infrastructure.

## Performance changes

PublicTransfersPage, PublicBlogPage, BlogDetailPage, DealsPage, CareersPage, DestinationPage and UmrahSamplePage load on demand. Suspense boundaries are inside PublicLayout so the navigation and footer remain mounted while loading. No new dependencies were added. Existing SEO metadata remains inside each page.

## Intentionally retained

- All route URLs, including legacy URLs: the requirement to preserve deep links prevents treating a routed page as unused solely because it is absent from navigation.
- Blog UI and content API: the admin blog editor and public deep links still use them.
- Transfers page/API: retained for the existing route and integration; only its unreachable search tab was removed.
- UmrahSamplePage: despite its name, the working Umrah search submits to it.
- Visa/Tour visibility flags and page implementations: these are explicit product controls, not obsolete flags.
- RoleSwitcher and older admin booking pages: potential future/admin uses require an independent admin review; admin functionality is outside this cleanup.
- Unmounted UI primitives: reusable library components are not confirmed deprecated product modules.
- Static assets and shared Umrah reference/sample content: runtime, public URL and backend-provided references cannot be ruled out by filename searches alone.
- Booking simulations, local wallet state and estimated prices: backend contracts are required before changing these business flows.

## Validation and limits

Run TypeScript, existing unit tests, production build and full ESLint. Browser checks cover required routes, retained legacy routes, four active search tabs, and widths 1440, 1024, 768, 375 and 320. Browser route tests use empty mocked backend responses and do not certify supplier availability, authenticated admin access, payment processing or booking transactions. Navbar interactions were also tested in the preceding navbar implementation at widths 320–1920.

Existing ESLint debt and bundle-size warnings are tracked in CONTRIBUTING.md. Lazy chunks add a loading state and require the normal deployment practice of keeping hashed assets available to active clients.

## Recommended next work (not implemented)

1. Confirm which legacy public URLs receive production traffic before planning redirects and retirement.
2. Resolve existing conditional booking hooks and other lint errors with dedicated flow checks.
3. Review admin-specific dead code separately with admin/B2B owners.
4. Replace local or simulated financial/booking behavior using agreed backend endpoints.
5. Audit assets against deployed content and backend image URLs before deleting them.
