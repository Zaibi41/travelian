# Lambda leftovers, Umrah, bank masking, blank Notifications (19 November 2026)

What was found before B14–B17 changed anything.

## A1. Old Lambda PayFast path and group-ticketing feed

- Both are routes inside the **one** legacy Lambda behind `api.travelian.pk` (Caddy sends every non-`/v1` path to it).
  Live on 19 Nov: `POST /payments/payfast/session` answered 400; `GET /group-ticketing/groups` returned 87 KB of fares
  with supplier labels ("AH", "D&S"). The Lambda's `POST /payments/payfast/callback` marks a booking paid without
  verification.
- The same function still serves `/content/*` (blog, packages, customers, notification settings and logs, pricing
  rules, group collections), legacy `/flights/*` and `/hotels/search`, and a scheduled journey-reminder event, so the
  function, its role and its API Gateway cannot be deleted. AWS resources could not be listed from this machine (no
  AWS credentials).
- Frontend: `src/lib/payment-api.ts createPayFastSession` (unused); `src/lib/group-ticketing.ts fetchGroupTickets`,
  `fetchGroupTicketCategories`, `fetchGroupTicketDetail`. Only live caller: the public Group Ticketing details panel
  (`fetchGroupTicketDetail`, as a fallback when a fare had no itinerary). Gateway: no code references (Caddy fallback
  and deploy docs only).

## A2. Umrah

Entry points: public nav tabs and homepage search tabs (`product-navigation.ts`), footer Products links, routes
`/umrah-packages`, `/umrah/:id`, `/umrah-sample`, `/booking?type=umrah`, `/request-booking?category=umrah`, About service
card, "Umrah Packages" button on the booking page, Makkah destination highlight, admin menu "Umrah Packages"
(`/admin/packages`), `sitemap.xml` (and its generator). Copy offering Umrah: homepage hero and SEO, footer tagline,
homepage CTA and FAQ, About, Contact, FAQ, Deals, My Bookings, blog article footer, 404 description, `index.html` meta.

## A3. Bank account masking

The gateway stored only `**** **** 1234` (`payment_accounts.account_number_masked`); the full number was discarded
on save. Customers at checkout saw only the masked form: without a QR image they could not make the transfer.

## A4. Blank `/admin/notifications`

The page's code module failed to load: the local Vite dev server answered **504 Outdated Optimize Dep** for
`@radix-ui/react-tabs` (its pre-bundled dependency cache went stale while running, after branch switches), so the
lazy import rejected. The app had **no error boundary**, so React unmounted everything: a blank screen. Not caused by
SES, Parameter Store or `aws-setup.sh`. Production does not hit this exact failure (old asset files are never deleted
on deploy) but had the same blank-screen behaviour for any page error. Restart the dev server with
`npm run dev -- --force`.
