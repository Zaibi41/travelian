## Architecture (applies to everything)
- The frontend is a pure SPA. All data and actions go through
  travelian-api-gateway (/v1/...), authenticated with the user's token.
- The frontend never calls the database, DynamoDB, a supplier or an airline
  directly, and never calls the old unauthenticated /content/* endpoints for
  admin screens.
- Frontend: routing, forms, display, loading/error states, filters kept in
  the URL. It does not compute money, profit, balances or permissions, and
  hiding is never a security measure; the API decides what is returned.
- Gateway: authentication, role and scope checks, field-level visibility,
  validation, business rules, talking to other systems.
- Endpoints are defined in the gateway as OpenAPI schemas. Generate the
  frontend types and client from that schema so the repos cannot drift.
- If an endpoint doesn't exist yet, hide the card or screen and add the
  endpoint to the backend to-do list. Do not build a workaround.
- Check docs/roadmap.md for what is planned next; do not start a later item unless asked.

## Admin Dashboard Rules (admin area only)
The rules in the sections below this one, about the public website, apply
to customer-facing pages. They do not apply to admin screens unless stated.
- Source of truth: docs/spec-v3.md and the approved mockup for each screen.
  Build only screens that have a mockup. Other menus show a placeholder
  page with the menu name.
- Do not add any card, filter, widget or label that is not in the spec.
  If something seems missing, ask first.
- Theme: src/styles/theme.css, active under data-app-theme="admin".
  Use theme tokens only, never hard-coded colors. Status colors (critical,
  action, fine) always come with a text label.
- Type: 13px body, 12px labels, nothing below 12px. Headings use
  Plus Jakarta Sans.
- Currency label is "Rs". Money is stored and passed as integer paisa.
- Default date filter is "All". Needs-action cards ignore the date filter.
- A card with no real data behind it is hidden, never shown as 0.
  A real zero on a needs-action or risk card shows the green "fine" stripe.
- B2C customers have no wallet. Wallets exist for B2B agencies only.
- Supplier cost, margin and airline IDs are never returned to Agency Owner
  roles. This is enforced by the API.
- No chatbot functionality for now.
- Never put credentials, passwords or secrets in the repo or in code.
- The "Responsive Testing Rule", "Text Overflow Rule" and "Final QA Before
  Completion" sections below also apply to admin screens. Test admin at 1440,
  1024, 768 and 390px, and with long names (agency, airline, provider).
- When a card, filter or widget is hidden because its data doesn't exist yet,
  add it to docs/backend-todo.md with the endpoint or table it needs.

## Travelian Product / UI Rules

These rules apply when the user explicitly asks for UI, layout, styling, frontend behavior, flight results, Modify Search, homepage, footer, navbar, modal, dropdown, or responsive fixes.

### Do Not Re-add Removed Features

Do not re-add anything that was already removed, hidden, or intentionally simplified unless the user explicitly asks for it again.

Specifically:
- Do not re-add the WhatsApp button in the navbar if it was removed.
- Do not re-add the WhatsApp button in CTA sections if it was removed.
- Do not re-add standalone WhatsApp text lines in CTA sections.
- Do not re-add the Currency field inside Modify Search if it was removed.
- Do not re-add footer bottom text such as “Registered travel company · Secure online payments” if it was removed.
- Do not re-add duplicate hero tabs if the navbar already handles those sections.
- Do not re-add Book Fare, View Details, or View Fare Options buttons if the current UI flow says to hide them.
- Do not re-add internal supplier/API labels on customer-facing UI.

If a feature was hidden temporarily, keep the underlying logic safe, but do not show it in the UI unless explicitly requested.

### Global Dropdown / Popover / Calendar Rule

Every dropdown, popover, selector, and calendar must:
- Open from its own related trigger field or button.
- Stay visually attached to the trigger.
- Appear above nearby sections.
- Never hide behind hero section, navbar, modal, cards, trust badges, or lower sections.
- Never be clipped by parent containers.
- Stay inside the viewport.
- Be fully selectable by the user.
- Close on outside click where supported.
- Close on Escape key where supported.
- Work on desktop, tablet, and mobile.

Affected elements include:
- From airport dropdown
- To airport dropdown
- Departure date calendar
- Return date calendar
- Travelers dropdown
- Cabin Class dropdown
- Currency dropdown where still used
- Language dropdown
- Modify Search dropdowns
- Any future dropdown or popover

If a dropdown is being clipped, check parent containers for:
- overflow-hidden
- overflow-auto
- wrong z-index
- wrong absolute positioning

If needed, use portal rendering with proper z-index and anchor positioning.

### Global Modal Rule

Every modal must:
- Open centered inside the visible viewport.
- Not appear behind sticky navbar/header.
- Not overflow outside the screen.
- Have max-height based on viewport, such as 85vh or 90vh.
- Have internal scroll when content is long.
- Keep the modal header visible.
- Keep the close X button visible.
- Keep important footer buttons visible where required.
- Prevent background page scrolling while modal is open.
- Close with X button.
- Close on Escape key where supported.
- Close on outside overlay click where supported.

Do not complete a modal fix if it only works for the shortest content case.

### Responsive Testing Rule

Every UI change must be tested on:
- Desktop
- Tablet
- Mobile
- Around min-width 1024px
- Around 768px
- Small mobile width

If the issue appears only at a specific breakpoint, such as min-width 1024px, specifically test that breakpoint before completion.

### Spacing and Compactness Rule

Travelian UI should be clean, premium, compact, and customer-friendly.

Avoid:
- Too much vertical whitespace
- Oversized cards
- Large empty gaps between related controls
- Duplicate sections
- Repeated buttons
- Overly tall dropdowns
- Unnecessary text blocks

Apply compact spacing especially in:
- Hero search form
- Travelers and Cabin Class controls
- Modify Search modal
- Why Travelian section
- How Travelian Works section
- Footer bottom row
- FAQ and accordion sections

If two controls are related, keep them visually close.

Example:
Travelers and Cabin Class should have around 12px–16px gap on desktop.

### Text Overflow Rule

Long text must not break the layout.

Apply ellipsis where needed for:
- Airport names
- Airline names
- Hotel names
- City names
- Route names
- Fare names
- Baggage text
- Meal text
- Supplier content
- Dropdown options

Never allow text to overlap, overflow, or push buttons out of alignment.

## Travelian Flight UI Rules

Flight-related UI must be tested with multiple real scenarios before marking the task complete.

Always test:
- Non-stop flight
- 1-stop flight
- 2-stop / multi-stop flight
- One-way search
- Round-trip search
- Multi-city search
- Short airline name
- Long airline name
- Short airport name
- Long airport name
- Missing baggage
- Baggage available
- Missing meal
- Meal available
- Long fare rules
- Multiple fare tiers/options

### Customer-Facing Data Rule

Do not show technical/internal supplier data to customers.

Hide from public UI:
- Supplier API code
- Internal provider name
- Raw API identifiers
- AIRSIALAPI
- FLYJINNAHONEAPI
- Debug labels
- Internal source codes

These can remain in backend/admin logs but must not appear on customer-facing cards.

### Flight Listing Rule

Flight listing cards should be customer-friendly and support multiple fare options.

Each flight card should support:
- Airline logo
- Airline name
- Flight number
- Route
- Departure time
- Arrival time
- IATA code
- City/airport name
- Duration
- Stop type
- Fare tiers/options
- Meal info
- Baggage info
- Price
- Info icon where required
- WhatsApp Help only if currently enabled

For multiple fare options, show one parent flight card and multiple fare rows under it.

If baggage/meal value is missing, null, unavailable, or supplier-rule text, show a clean fallback:
- No Meal
- No Baggage
- Baggage info not available
- Meal info not available

Do not show ugly raw text like:
- Subject to supplier rules
- See supplier details
- null
- undefined
- not available text repeatedly

### Modify Search Rule

Modify Search modal must work for:
- One-way
- Round-trip
- Multi-city

Rules:
- Date picker must open above modal content, not behind it.
- Return date must work for round-trip.
- Travelers & Class dropdown must scroll properly.
- Currency field should not appear if removed.
- Modal body should scroll internally.
- Close button must always be visible.
- Cancel and Search Flights buttons must remain accessible.
- No overlap at min-width 1024px.

Do not complete if only One-way works.

### Travelers and Cabin Class Rule

Travelers and Cabin Class should remain separate controls unless the user explicitly asks to combine them.

Travelers:
- Adults minimum 1
- Children minimum 0
- Infants minimum 0
- Disable minus button at minimum value.
- Keep plus/minus aligned.
- Done button visible.
- Compact readable dropdown.

Cabin Class:
- Title should be Cabin Class.
- Options: Economy, Premium Economy, Business, First.
- Selected state should be Travelian blue.
- Dropdown should be compact.
- Done button visible if used.

## Travelian Homepage / Footer Rules

Footer must stay clean and consistent.

Rules:
- Rename Products to Services if requested.
- Add icons before footer section headings where required.
- Contact section should also have heading icon if other footer headings use icons.
- Social icons should include Facebook, Instagram, YouTube, and TikTok if configured.
- Bottom copyright should be centered if right-side text is removed.
- Do not add duplicate trust text in the footer bottom row.
- Do not re-add removed footer text unless explicitly requested.

CTA sections:
- Do not re-add standalone WhatsApp text lines if removed.
- Do not re-add WhatsApp buttons if removed from that specific section.
- Call Travelian button should follow Travelian blue theme where requested.

## Exact Requirements / No Invention Rule

- Use the user's exact requested terminology for labels, fields, statuses, and workflows.
- Do not invent additional concepts, fields, labels, badges, helper text, relationships, or workflow states.
- Do not infer product requirements merely because they are common in another application.
- If a required behavior cannot be determined from the request or existing implementation, ask the user before adding it.
- Keep changes limited to the requested scope and established project behavior.
- Examples: do not introduce terms such as “Document,” “Lead traveler,” or “Also travelling” when the user requested only passport/ID card details and did not request those concepts.

## Final QA Before Completion

Before saying the task is done, confirm:
- The requested issue is fixed.
- Related edge cases are tested.
- No removed feature was re-added.
- No dropdown/modal is hidden or clipped.
- Mobile layout works.
- Desktop layout works.
- No new visual overlap exists.
- No long text breaks the layout.
- No internal supplier/API data is visible to customers.
- No sensitive backend data is logged.
- Existing confirmed flows are not broken.

Do not mark the task complete if the fix only works for the simplest visible screenshot.
<!-- LOVABLE:BEGIN -->
- Keep hotel search controls in a hotel-specific component; isolate presentation changes from Flights and Group Ticketing.
<!-- LOVABLE:END -->
