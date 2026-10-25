# Travelian public search behavior

Visual ownership is documented in DESIGN.md. This records the touched public-search behavior; it does not replace backend or admin rules.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | src/components/ui/select.tsx | Existing option models | Authored, portal-based | Keyboard and popup browser checks |
| Form | Product-specific search bar | Existing product models and adapters | Committed search and local refinements | Component and browser tests |
| Date | Calendar/Popover; Umrah Select for month | Existing date-only helpers and package departure dates | Date or month as supported | Month matching tests and popup checks |
| Travelers | TravelersClassPicker | Existing counter rules | Separate travelers and cabin; Umrah travelers only | Component tests and browser checks |
| Feedback | Shared Sonner/inline state | Existing flow behavior | Inline no-results/status; existing toasts | Browser states |
| Navigation | ProductTabs and router | Existing public routes | Homepage local tabs; product-page route navigation | Tab tests and browser checks |

## Umrah search

Search applies departure city, month, existing tier, room preference and duration to the existing public package catalogue. Room matching means a published positive rate for that room type, not a guarantee of stock. Unknown departure months do not imply availability. Draft controls change immediately; Search commits preferences to the existing `/umrah-packages` route's query string. Back/forward restores the committed draft.

Existing city, tier, duration, airline, distance, status and budget refinement predicates are preserved. Ready-made filters refine locally after a committed hero search; their current local state is not newly exposed to backend APIs. A new hero search resets local refinements to its criteria. Clear search/Reset filters restore all criteria. No-results offers Clear filters and the existing custom enquiry.

Traveller counts are enquiry preferences only. Infants cannot exceed adults. The data does not define per-package adult/child capacity or group pricing. Do not infer those rules. Package enquiries retain useful details and include selected travellers/room; final availability/pricing remains subject to Travelian confirmation.

## State, overlays and safety

This catalogue already combines admin records with existing fallback offers. Preserve that source behavior. Filtering is synchronous; do not fake loading. Introduce skeletons only with an actual authoritative loading state. Use maintained Select and Popover portals with viewport collision behavior, focus restoration and Escape/outside dismissal. Use app-owned validation and status text; never browser dialogs. Do not persist sensitive custom-enquiry text in URL search state.

## Scope and known legacy limits

No supplier/API, payment, authentication, booking schema or admin behavior changes are authorized by this search task. The legacy `/umrah-sample` URL remains accessible; homepage Umrah discovery now leads to the main catalogue. Existing global scrollbar/locale and unrelated lint debt are outside this scoped implementation and must not be represented as fully audited product compliance.
