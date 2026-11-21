# Travelian Design Standard

Applies to **every screen**: the public website and the admin. New work follows it; existing
screens are moved to it screen by screen (issue #118, one design system). Where an older document
disagrees, this one wins, except for the exceptions listed at the end.

Every screen must answer three questions at a glance:
**Where am I? What can I do here? What happens next?**

## 1. Principles

| Principle | What it means on a Travelian screen |
| --- | --- |
| Clarity | One clear job per screen. Labels say what a thing is in the traveller's or agent's words, not the system's. |
| Consistency | The same thing looks and behaves the same everywhere: one button set, one field style, one status badge, one date picker. An action keeps its name through the flow ("Hold booking" → toast "Booking held"). |
| Visual hierarchy | One primary action per view. Size, weight and colour show importance; decoration does not. |
| Feedback | Every action answers: pressed state, loading state, then success or a clear error. Nothing happens silently. |
| Simplicity | Fewest steps, no clutter. Do not add cards, labels, badges or helper text that nobody asked for. |
| Forgiveness | Prevent errors (sensible defaults, disabled impossible choices, inline validation). Confirm destructive actions in a dialog that names what will be lost. Errors say what went wrong **and how to fix it**. |
| Accessibility | WCAG 2.2 AA: keyboard, screen reader, contrast, touch targets (section 7). |
| Familiar patterns | Use the patterns people know from booking sites and admin tools; no novel controls without a reason. |

## 2. Spacing and layout

- **4/8px grid.** All margins, padding and gaps are multiples of 4px (Tailwind `1` = 4px, `2` = 8px …). Prefer 8px steps; 4px only inside small controls.
- **Whitespace groups.** Related items sit close (8–16px), separate groups further apart (24–32px). Travelers and Cabin stay 12–16px apart.
- **Grid.** 12 columns on desktop, 4 columns on mobile. Content width: `travelian-container` (public) or the admin page padding.
- **Touch targets** at least **44 × 44px** for anything tapped on a phone (buttons, icon buttons, menu items, checkboxes with their label). A smaller visual is fine when the hit area is 44px.

## 3. Typography

- **Two families only:** Plus Jakarta Sans (display and headings), Inter (everything else).
- **Weights:** regular 400, medium 500, bold 700 (semibold 600 is allowed where it already exists; no 800/900 in new work).
- **Scale**

| Role | Size / line height | Family |
| --- | --- | --- |
| Display (hero) | 28–36px / 1.2 | Plus Jakarta Sans, bold |
| H1 (page title, one per page) | 24px / 1.3 | Plus Jakarta Sans, bold |
| H2 (section) | 20px / 1.35 | Plus Jakarta Sans, bold |
| H3 (card / panel) | 18px / 1.4 | Plus Jakarta Sans, semibold |
| H4 (group label) | 16px / 1.4 | Inter, semibold |
| Body | 14–16px / 1.5 | Inter, regular |
| Caption / helper | 12–13px / 1.4 | Inter, regular or medium |

- **Nothing under 12px.** Line height 1.4–1.6 for text. Reading text (terms, FAQ answers, blog) is 50–75 characters per line (`max-w-prose` / `max-w-2xl`).
- Headings go in order (h1 → h2 → h3); no skipped levels. Use sentence case. No all-caps labels in new work.

## 4. Colour

- **60-30-10.** About 60% neutral surfaces (background, cards), 30% supporting (borders, muted text, secondary panels), 10% brand blue and CTAs. One primary (blue) button per view.
- **Semantic colours,** always paired with an icon or text, never colour alone:

| Meaning | Colour | Example |
| --- | --- | --- |
| Success | green | "Ticket issued" with a check icon |
| Warning | amber | "Hold expires in 2 h" with a clock icon |
| Error | red | "Payment failed. Try another card or pay by bank transfer." |
| Info | blue | "Some results may be missing" with an info icon |

- **Contrast:** text at least **4.5:1**; large text (24px+, or 19px bold), icons and UI borders that show a control at least **3:1**. Keep the AA palette fixes from the 32-inch screen work.
- Colours come from tokens only (`hsl(var(--…))` / Tailwind token names), never hard-coded hex values in components.

## 5. States (every interactive element)

| State | Rule |
| --- | --- |
| Default | Looks clickable (button shape, link colour/underline on hover). |
| Hover | Visible change (background or border), pointer devices only. |
| Focus | **Visible focus ring for keyboard** (`focus-visible:ring-2 ring-ring ring-offset-2`). Never remove an outline without a replacement. |
| Active | Pressed feedback (darker or slightly inset). |
| Disabled | Lower contrast, `disabled` / `aria-disabled`, not focusable as an action; say why when it is not obvious. |
| Loading | Spinner or skeleton in place, button keeps its width, `aria-busy`; the label says what is happening ("Holding seats…"). |
| Error | Red border + message under the field linked by `aria-describedby`; focus moves to the first invalid field. |

- **Motion:** 150–300ms ease-out for state changes. Respect `prefers-reduced-motion` (`motion-reduce:` variants / the global reduced-motion rule). Motion answers a user action; no decorative entrance animations on every section.

## 6. Responsive

- Test at **390, 768, 1440** and a wide screen (1920+), plus 1024 where a layout switches.
- Test with long names (airline, airport, agency, provider), empty states, loading skeletons, and offline/error states.
- No horizontal page scroll; long text truncates with an ellipsis and a `title`.

## 7. Speed and accessibility checklist

- Under **100ms** feels instant: give immediate visual feedback on press.
- Over **1s**: show a skeleton or progress indicator, never a blank area.
- Images have `width`/`height` (no layout shift), `alt` text (empty `alt=""` when decorative), and `loading="lazy"` below the fold.
- Every field has a visible `<label>`; icon-only buttons have an `aria-label` that contains any visible text.
- Landmarks: one `<main>`, skip link to it, `<nav>` with a label, dialogs trap focus and close on Escape.
- Public pages: unique title + description, one H1, canonical URL (see `src/components/SEO.tsx`). Checkout, account, My Bookings, sign-in and admin are `noindex` (`src/lib/private-paths.ts`, `public/robots.txt`).

## 8. Exceptions (approved rules that stay)

- **Admin density:** admin tables, field labels and nav may use 13px (`text-table`, `text-label`) as set in AGENTS.md "Type: 13px body"; all other admin text follows section 3. Nothing under 12px anywhere.
- **Admin layout:** the admin keeps its own layout (sidebar, dense tables) while using the same tokens and components as the public site.
- **Approved layouts** in CLAUDE.md (e.g. the two-line Flights search form) stay as they are unless a task changes them.
