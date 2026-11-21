@AGENTS.md

## Change discipline
- Change only what the task asks for. Do not redesign, move, rename, restyle or remove any existing control, layout, text or behaviour that the task does not name. Unasked changes create rework.
- If a change seems to need a wider UI or flow change, stop and ask before doing it; list the extra change and why.
- When a task touches a screen, render it before and after and compare; anything that differs and was not asked for is a regression to revert.
- Approved layouts are the reference. Flights search uses the two-line form: line 1 = trip type segmented control (One-way | Round-trip | Multi-city), Travelers dropdown, Cabin dropdown; line 2 = From, swap, To, Departure date, Return date (Round-trip only), Provider, Search flights. Keep approved layouts unless a task says otherwise.

## UI rules (Design Standard)
Full standard: docs/DESIGN_STANDARD.md. It applies to the public site and the admin; follow it in all UI work.
- Every screen answers: Where am I? What can I do here? What happens next? One primary action per view.
- Spacing on the 4/8px grid; 12 columns desktop, 4 mobile; touch targets at least 44×44px.
- Two fonts (Plus Jakarta Sans headings, Inter text); weights 400/500/700; body 14–16px, line height 1.4–1.6, reading text 50–75 characters per line; nothing under 12px (admin tables/labels may use 13px). One H1 per page, headings in order.
- Colour 60-30-10 (neutral / supporting / brand+CTA), tokens only; semantic success green, warning amber, error red, info blue, always with an icon or text; contrast 4.5:1 text, 3:1 large text, icons and UI borders.
- Every interactive element has default, hover, visible keyboard focus, active, disabled, loading and error states; transitions 150–300ms; respect prefers-reduced-motion.
- Confirm destructive actions; errors say what went wrong and how to fix it.
- Test 390 / 768 / 1440 and wide screens with long names, empty, loading (skeleton after 1s) and error/offline states.
- Public SEO: unique title, description and canonical per page via `<SEO>`; checkout, account, My Bookings, sign-in and admin are noindex (src/lib/private-paths.ts + public/robots.txt). Static public pages are prerendered (PRERENDER_ROUTES in scripts/prerender.mjs, preloads in src/pages/public/prerendered-pages.ts); keep exactly one h1 on them or the prerender step fails.
