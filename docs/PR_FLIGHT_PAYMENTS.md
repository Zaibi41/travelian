# Website flight payments (website + admin): checkout payments, paid states, red alerts, QR upload errors

Companion gateway PR: travelian-api-gateway `feat/flight-payments` (linked on GitHub); this needs it deployed first. Go-live steps: `docs/FLIGHT_PAYMENTS_GOLIVE.md`. Draft: not ready for review yet.

## Changes (0ba08b0, ad3181b, f8ec734, 88e4fef)
- Checkout offers the gateway's methods per fare; card goes to PayFast; Book Only holds. No client-side confirmation.
- My Bookings: "Issuance in progress" / "Issuance pending" / "Our team will contact you shortly"; airline PNR only once issued.
- Admin: red Urgent alerts in Notifications, new booking statuses in the filter, "Paid, not ticketed" card.
- Accounts & Ledgers: clear "Image upload failed: …" errors; Edit (replace / remove QR).
- Floating WhatsApp hidden on checkout below tablet width; flaky flight-results test fixed (airports dataset preloaded).

## Tests
- Website: 705 passed; build clean.

## Before merge / deploy
Migration 0025 after the gateway deploy; flags off until PayFast production, a funded Southair account and SES are ready.


🤖 Generated with [Claude Code](https://claude.com/claude-code)
