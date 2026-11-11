# Admin design system

**Scope: the admin dashboard only.** The public website is the visual *reference*, not a
consumer: the admin copies the public site's sizes, shapes, field style, spacing, icons and layout
into admin-owned files. No public page, component or stylesheet imports anything described here,
and no admin file imports from `src/components/public` or `src/pages/public` (the guard test fails
if one does). A public change cannot change the admin, and the reverse.

Colours are the exception: the admin keeps its own colours (Zohaib, 2026-11-11). They are listed
below next to the public site's, so unifying them later is one decision in one file.

## Where things live

| What | File |
| --- | --- |
| Every admin token (colour, type, control heights, radii, shadows, spacing, focus ring, motion) | `src/styles/admin-tokens.css` |
| Admin layout layer (sidebar, header, dense table rows, page padding) | `src/styles/theme.css` |
| Tailwind names for the tokens (additive only) | `tailwind.config.ts` |
| Shared admin components | `src/components/admin/ui/` |
| Guard test (sizes, colours, radii, public imports, pinned colours) | `src/styles/admin-type-scale.test.ts` |
| Visual regression (public and admin screenshots) | `e2e/visual.spec.ts`, `e2e/__screenshots__/` |

All tokens sit under `:root[data-app-theme="admin"]`; `AdminLayout` sets that attribute on
`<html>` while it is mounted, so dropdowns, dialogs and toasts rendered into `<body>` get them too.

## Tokens

### Type (public site's fonts and Tailwind sizes)

Plus Jakarta Sans for headings, Inter for everything else. Nothing smaller than 12px.

| Tailwind | Size | Use |
| --- | --- | --- |
| `text-page-title` | 24px | Page titles (bold) |
| `text-kpi` / `text-kpi-sm` | 24 / 20px | Big and smaller numbers |
| `text-section` | 18px | Section and panel headings (semibold) |
| `text-body` / `text-nav` | 14px | Body, buttons, fields, sidebar |
| `text-label` / `text-table` | 13px | Field labels, table text |
| `text-helper` | 12px | Helper text, tags, badges |

Do not use `text-xs`, `text-sm`, `text-[13px]` or inline font sizes in admin files.

### Sizes, radii, spacing, focus, motion (copied from the public site)

| Token | Value | Tailwind | Public source |
| --- | --- | --- | --- |
| `--control-height` | 40px (44px on touch) | `h-control` | `h-10` buttons, inputs, selects |
| `--control-height-lg` | 48px | `h-control-lg` | search form fields and button `h-12` |
| `--badge-height`, `--badge-padding-x` | 22px, 10px | `h-badge`, `px-badge-x` | badge `px-2.5 py-0.5 text-xs` + border |
| `--radius` | 10px | `rounded-lg` | `--radius` |
| `--radius-md` | 8px | `rounded-md` | buttons, inputs, selects |
| `--radius-field` | 12px | `rounded-field` (also `rounded-xl`) | search fields, cards |
| `--radius-pill` | full | `rounded-pill` | badges, round swap |
| `--card-padding` | 20px | `px-card` | search card sides |
| `--card-gap`, `--section-gap` | 12px | `gap-card-gap`, `gap-section-gap` | search grid `gap-3` |
| `--space-1` … `--space-8` | 4px grid | | Tailwind spacing |
| `--focus-ring-width`, `--focus-ring-offset` | 2px, 2px | `ring-2 ring-offset-2` | every public control |
| `--motion-fast`, `--motion-base` | 150ms, 200ms | `transition-colors` | |

Admin-only layout (`theme.css`): sidebar 248px, sidebar rows 36px, page padding 24px, KPI stripe
4px, and **dense tables** (28px header, 30px rows): the one place the admin is denser than the
public site.

### Colours (admin values, unchanged)

Primary action buttons are teal (`--action-primary` = `--brand-teal` = `#01747E`, Tailwind
`bg-action`); the guard test fails if that changes. Navy (`--brand-navy`, `#00245D`) is the
sidebar, headings, links, active tabs and the remaining filled buttons. Status colours always come
with a text label: critical (red), needs action (amber), fine (green), each with a `*-text` shade
on a `*-soft` background.

Where the public site uses a different colour for the same role (not unified; Zohaib to decide):

| Role | Public site | Admin | Where |
| --- | --- | --- | --- |
| Primary / links / active tab / focus ring (`--primary`, `--ring`) | `217 91% 30%` (#073C92 blue) | navy `216.8 100% 18.2%` (#00245D) | buttons, links, tabs, focus |
| Search button | `--primary` blue (home search) | navy (`--primary`) | Search > Flights / Group Ticketing |
| Primary action button | blue `--primary` (sign-in, search) | teal `#01747E` (Hold, Continue, View booking) | admin actions |
| Teal (`--teal`) | `184 70% 34%` | `184.8 98.4% 24.9%` (#01747E) | accents |
| Page background | `220 20% 97%` | `217 33% 97%` (#F5F7FA) | page |
| Border / input | `220 13% 91%` | `217 30% 90%` (#DEE4ED) | cards, fields |
| Muted text | `220 9% 46%` | `217 12% 42%` (#5E6878) | labels, hints |
| Muted / secondary surface | `220 14% 96%` | `217 33% 95%` (#EEF1F6) | table header, soft fills |
| Accent | `217 91% 95%` / text `217 91% 25%` | `217 60% 95%` / navy | hover, selected rows |
| Warning / success text on fill | white | dark amber / dark green (contrast) | badges |
| Sidebar | `222 47% 11%`, active `217 91% 50%` | navy, active teal | sidebar |
| Shadows, gradients | tinted `222 47% 11%` | tinted navy | cards, hero |

Inside the admin itself, filled buttons are still of two colours: teal for the main actions
(Hold, Continue at new price, Search again, View booking, Book) and navy for the rest (Save, Add
Customer, Search flights / Search group fares). Unifying them is a colour decision, so it is left
as it is.

## Shared components (`src/components/admin/ui/`)

| Component | File | Use it for |
| --- | --- | --- |
| `Button` (`primary` teal, `default` navy, `secondary`, `outline`, `ghost`, `danger`, `link`; sizes `default` 40px, `sm` 36px, `lg` 48px, `icon`) | `button.tsx` | every admin button; `primary` for the one main action on a screen |
| `Input`, `Textarea`, `FieldShell` (label above, leading icon, hint, error), `FieldLabel`, `describedBy`, `FormCard`, `FormRow` | `field.tsx` | forms and filters |
| `LabeledSelect` (label above), `FilterSelect` (compact "Date All ▾") | `LabeledSelect.tsx`, `FilterSelect.tsx` | selects |
| `DayFirstDateField` ("24 Nov 2026", typed day first or picked; value stays ISO; `variant="search"` for the search look) | `DayFirstDateField.tsx` | every date |
| `TabLinks` (page tabs, each a URL) | `TabLinks.tsx` | Bookings, booking detail, Customers |
| `SearchProductTabs` (Flights, Group Ticketing, Hotels, Umrah with the public icons) | `search-form.tsx`, `product-tabs.ts`, `UmrahIcon.tsx` | Search |
| `RouteRow` + `SwapButton` (From, round outlined swap, To; stacks below 900px with up/down arrows), `AirportLines`, `SelectedAirportCard` (two-line airport card), `SearchSubmitButton` (magnifier), `FieldLabel`, `SEARCH_FIELD`, `AIRPORT_FIELD` | `search-form.tsx` | search forms |
| `AirportCombobox` (free airport search), `SectorAirportSelect` (only the given sectors) | `AirportCombobox.tsx`, `SectorAirportSelect.tsx` | From / To |
| `Chip` (pressed state) | `feedback.tsx` | Suggested routes, quick filters |
| `StatusBadge` (critical / needs action / fine, always with text), `Tag` (neutral, navy, teal) | `StatusBadge.tsx` | statuses and labels |
| `Notice` (info, critical, action, fine), `Panel`, `PanelHeader`, `EmptyState`, `LoadingCards` | `feedback.tsx` | notices, cards, empty and loading states |
| Class builders: `adminButtonVariants`, `chipClass`, `TABLE` (dense table classes), `describedBy` | `classes.ts` | custom buttons, chips, tables, field descriptions |
| `Dialog` … `DialogContent` (max 85% of the viewport, scrolls inside, rounded-xl) | `dialog.tsx` | every admin dialog |
| `AirlineLogo` (admin copy of the public tile) | `AirlineLogo.tsx` | flight results |

Cards are `rounded-xl border border-border bg-card px-card py-3.5 shadow-card` (or `Panel`).
Header and sidebar are structural and keep their own layout.

## Rules

1. Admin files use tokens only: no hex / `rgb()` / `hsl()` colours, no Tailwind palette colours
   (`bg-amber-500`), no arbitrary pixel font sizes, no arbitrary radii, no imports from public
   folders. The guard test enforces it for `src/components/admin/**` and the main admin pages.
2. Do not change a colour value without Zohaib's decision; the guard pins the main ones.
3. Status colour always with text. Money shown as "Rs". No supplier names or environment
   variable names in anything shown to users.
4. Public site: read it, never edit it for admin work. Its screenshots in `e2e/visual.spec.ts`
   must stay identical.
5. Anything shown must still pass `e2e/admin-type-scale.spec.ts` (sizes, no sideways scroll).

## Adding a token or a component

- **Token:** add it to `src/styles/admin-tokens.css` (with a comment saying where the value comes
  from), add a Tailwind name in `tailwind.config.ts` only if needed (new name, never change an
  existing one), and teach `cn` the name in `src/lib/utils.ts` if it is a size or radius.
- **Component:** add it to `src/components/admin/ui/`, built from the tokens, with a unit test in
  `admin-ui.test.tsx` (or its own test file), and list it in the table above. Replace one-off
  copies in admin screens with it.
- Run `npx vitest run`, `npx playwright test e2e/admin-*.spec.ts e2e/visual.spec.ts`, and update
  the admin screenshots only for an intended change (`--update-snapshots`, then review the images).
