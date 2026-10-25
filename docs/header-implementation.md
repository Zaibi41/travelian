# Focused OTA header

## Changes in this pass

- `src/components/public/PublicNavbar.tsx`: desktop utility bar (32px) with Request a Booking, phone, currency, language and Sign In; 64px main navigation with the existing logo, product links, separate company links and an active underline. Below 1280px, a logo/hamburger row opens a scrollable menu with grouped navigation and utilities. Existing locale dropdown behavior and outside/Escape dismissal are reused.
- `src/components/public/PublicLayout.tsx`: content starts below the 96px desktop header or 64px mobile header, including authentication pages. This is the only surrounding layout adjustment.
- `src/components/public/SearchTabs.tsx`: mobile product names remain visible; the row scrolls horizontally when needed. The four existing product searches and submission logic are preserved.

Request a Booking uses the existing WhatsApp contact helper and Travelian number. The existing package request page requires a selected Umrah package; no empty request form or new route was invented. Link behavior is verified without sending messages.

## Cleanup status

No additional files or assets were deleted in this header pass. The public Visa/Tour pages, routes, navbar entries and sitemap entries were already removed in this working tree; details and exact deletions are in `public-product-retirement.md`. The earlier general cleanup is recorded in `frontend-cleanup-audit.md`.

Shared admin/B2B inventory and booking types, Umrah visa inclusions, Visa card branding and Group Ticketing supplier names are intentionally retained. They serve protected functionality. Blog, Deals, Transfers and other directly routed legacy pages remain because their retirement is uncertain; they are absent from primary navigation. No flight/payment/auth/supplier logic, production environments or analytics were changed.

## Validation

TypeScript checks, all 64 unit tests and production build pass. Full lint reports the same existing 49 errors and 21 warnings; the navbar/layout files pass targeted lint. Browser validation covers 1920, 1440, 1366, 1280, 1024, 768, 375 and 320px: header dimensions, content offsets, no overlapping controls or horizontal page overflow, booking and phone link targets, currency/language selection, mobile dismissal and all four hero product tabs. Required and retired route behavior was verified in the preceding retirement pass.

Browser checks use mocked/blocked remote requests and do not certify live supplier transactions or payments. Existing bundle warnings remain. Follow-up work is limited to separately reviewing legacy route traffic, shared admin dead code and existing lint errors; these are not removed merely to reduce file count.

Final route inventory is recorded in `public-product-retirement.md`. No new routes were introduced by this header change.
