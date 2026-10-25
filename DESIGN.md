---
version: alpha
name: Travelian
description: A compact Pakistan-focused OTA for flights, group tickets, hotels and Umrah.
colors:
  primary: "hsl(217 91% 30%)"
  navy: "hsl(222 47% 11%)"
  background: "hsl(220 20% 97%)"
  surface: "hsl(0 0% 100%)"
  border: "hsl(220 13% 91%)"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, sans-serif"
  body:
    fontFamily: "Inter, sans-serif"
rounded:
  xl: "0.75rem"
spacing:
  content-max: "80rem"
  field-height: "3rem"
  search-card-padding: "1.25rem"
components:
  search-card: {}
  product-tabs: {}
  select: {}
  travelers: {}
---

# Travelian design system

## Overview

The reference is the existing Flights and Hotels search system: a navy dotted hero, a white search card and a compact working form. It serves travelers and agents comparing real travel options. Avoid unrelated service categories, decorative marketing panels, colorful selector grids and implied online booking where only enquiries exist.

## Colors

Runtime CSS is canonical (ownership model B). `src/index.css` defines `--primary`, `--sidebar-background`, `--background`, `--card` and `--border`; `tailwind.config.ts` maps those roles to utility classes. The frontmatter mirrors accepted values, not a second generated stylesheet. Use existing semantic tokens for focus, errors and disabled states. WhatsApp treatments remain as approved in existing components.

## Typography

`src/index.css` owns `--font-display` and `--font-body`; the Tailwind adapter exposes display/body roles. Hero headings use the established 1.75rem display scale; field labels are compact muted text, and input text stays readable on mobile. Use en-GB month/date labels in the current English product. Language selection does not certify translation of every legacy screen.

## Layout

`SearchPageShell.tsx` owns the public container, navy/dotted hero and white card. Public inner content uses the single `.travelian-container` utility in `src/index.css`: Tailwind `max-w-7xl` (1280px including padding), centered with 20px phone, 24px tablet and 32px desktop side padding. Backgrounds remain full viewport width. Navbar/utility rows, search heroes/cards, results, homepage sections and footer share this cap. Auth cards, checkout flows and text-only reading measures intentionally retain their narrower widths. Search cards use 20px inner padding and 48px controls. Keep four product choices visible in a scrollable row. Forms use one column on phones, two on tablets, and an appropriate desktop grid; no clipped popovers. The global header remains 64px mobile and 96px desktop including utilities. The existing header (including utilities) is fixed, hidden/inert near the page top, revealed at 100px scroll, and hidden again at 32px or less. Its 200ms transform/opacity transition respects reduced motion. Page content has no reserved header padding, so reveal never shifts content. Auth pages expose their existing inner scroller via `data-public-page-scroll`; dropdown and sheet scrolling never controls header visibility.

## Elevation & Depth

White cards have a subtle semantic border and shared shadow-card elevation. Use portal-rendered overlays above the page/header and collision-aware placement. Avoid decorative gradients inside new search forms.

## Shapes

Search cards, fields and primary search actions use the established rounded-xl family. Shared traveler/cabin popovers retain their compact canonical variant; do not duplicate their counter logic or reintroduce colored tiles.

## Components

The canonical owners are `SearchPageHero`, `SearchCard`, `ProductTabs`, shared Button/Input/Select/Popover primitives and `TravelersClassPicker`. Umrah-specific fields belong in `umrah/UmrahSearchBar.tsx`. Package records and pricing remain owned by existing models and adapters. Busy controls keep dimensions stable; synchronous local filtering must not simulate network loading. Every applied search has an explicit clear action and an announced result or no-results state.

## Do's and Don'ts

Preserve APIs, supplier mappings, roles, pricing and WhatsApp behavior. Scope changes to the requested product. Reuse the official logo. Keep Visas and Tours removed as public products; Umrah visa inclusions and payment Visa branding are separate retained concepts. Do not invent capacities, new package tiers, room rates, certifications or confirmed availability.

## Unified search geometry

`SearchContent` owns the homepage product-switching region. Responsive height budgets in `.unified-search-content` reserve the tallest standard form, action baseline and validation space: 400px mobile, 352px narrow tablet, 304px tablet, 176px desktop. Only the selected form mounts, preserving existing request timing and portal cleanup. Extra multi-city legs may expand the region; the expanded minimum persists across product switches until viewport width changes. Do not clip forms or add independent product-card heights. Umrah search exposes Departure City, Travel Month, Package Type and Duration. Its primary search action shares the field row from 1024px upward; smaller screens stack the action below the fields. Room/traveller data contracts remain intact, but those controls and the clear-search action are omitted from this bar.

Below 1024px, unified search fields align to the top and the primary action uses the shared reserved bottom action area. Keep enough bottom padding for the action and validation so expanded multi-city content remains above both. Mobile product tabs use a two-by-two grid so all four modes remain visible. Hotel mobile dates use a short readable date format; airport popovers retain a readable minimum width within the viewport even when their trigger is narrow.
