// Shared parts of the admin search forms (Search > Flights and Group Ticketing; Hotels and Umrah
// can reuse them). The look follows the public website's search form (src/components/public:
// SearchTabs, AirportCombobox, GroupTicketingSearchBar, ProductTabs): rounded fields with a
// leading icon, an outlined round swap button, a filled search button with a magnifier, and
// icon tabs. Sizes use the admin type scale.

import { Link } from "react-router-dom";
import { ArrowLeftRight, ArrowUpDown, Plane, PlaneLanding, PlaneTakeoff, Search, X } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ADMIN_PRODUCT_TABS } from "@/components/admin/ui/product-tabs";
import type { Airport } from "@/lib/admin-search/airports";
import { cn } from "@/lib/utils";

/** Field shell: public search field look (rounded, soft fill), on the admin scale. 56px, the same
 *  height as the two-line airport fields, so a one-line search form lines up. */
export const SEARCH_FIELD = "h-14 rounded-xl border border-muted-foreground/80 bg-muted/30 text-body";
/** Airport fields are taller: two lines ("LHE - Lahore", then the airport name and country). */
export const AIRPORT_FIELD = "min-h-14 rounded-xl border border-muted-foreground/80 bg-muted/30";

export type AirportIconKind = "departure" | "arrival" | "plain";
const ICONS = { departure: PlaneTakeoff, arrival: PlaneLanding, plain: Plane } as const;

export function AirportIcon({ kind, className }: { kind: AirportIconKind; className?: string }) {
  const Icon = ICONS[kind];
  return <Icon className={cn("h-4 w-4 shrink-0 text-muted-foreground", className)} aria-hidden="true" />;
}

/** Line 1 "LHE - Lahore" (bold); line 2 the airport name and country, wrapping to two lines.
 *  An airport not in the list shows its code alone. The full text is a hover title fallback. */
export function AirportLines({ code, airport, icon = "plain" }: { code: string; airport?: Airport; icon?: AirportIconKind }) {
  const first = airport ? `${airport.iata} - ${airport.city}` : code;
  const second = airport ? `${airport.name}, ${airport.country}` : "";
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2.5" title={second ? `${first}, ${second}` : first}>
      <AirportIcon kind={icon} />
      <span className="flex min-w-0 flex-col gap-0.5 text-left">
        <span data-airport-line="1" className="truncate text-body font-semibold leading-5 text-foreground">{first}</span>
        {second && <span data-airport-line="2" className="line-clamp-2 break-words text-label leading-[1.15rem] text-muted-foreground">{second}</span>}
      </span>
    </span>
  );
}

/** A chosen airport: the two-line card in the field look, with an x that clears it. The card
 *  itself is a button that reopens the choice. */
export function SelectedAirportCard({ id, label, code, airport, icon, onOpen, onClear }: {
  id: string; label: string; code: string; airport?: Airport; icon: AirportIconKind; onOpen: () => void; onClear: () => void;
}) {
  const name = airport ? `${airport.iata} - ${airport.city}, ${airport.name}, ${airport.country}` : code;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <FieldLabel id={`${id}-label`}>{label}</FieldLabel>
      <div className={cn(AIRPORT_FIELD, "flex min-w-0 items-center gap-1 py-1.5 pl-3 pr-1")}>
        <button id={id} type="button" aria-labelledby={`${id}-label ${id}`} onClick={onOpen} title={name}
          className="flex min-h-10 min-w-0 flex-1 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <AirportLines code={code} airport={airport} icon={icon} />
        </button>
        <button type="button" aria-label={`Clear ${label.toLowerCase()} airport`} onClick={onClear}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Dropdown list panel and rows shared by the airport fields (at least 360px wide, 48px rows). */
export const AIRPORT_LIST_PANEL = "w-[max(var(--radix-popper-anchor-width),360px)] max-w-[calc(100vw-1.5rem)] max-h-[min(24rem,var(--radix-popover-content-available-height))] overflow-y-auto overscroll-contain p-1.5";
export const airportOptionClass = (active: boolean) => cn("flex min-h-12 min-w-0 cursor-pointer items-center rounded-md px-3 py-2",
  active ? "bg-accent ring-1 ring-inset ring-primary/40" : "hover:bg-muted/60");

export function FieldLabel({ htmlFor, id, children }: { htmlFor?: string; id?: string; children: React.ReactNode }) {
  const className = "text-label font-medium text-muted-foreground";
  return htmlFor ? <label htmlFor={htmlFor} id={id} className={className}>{children}</label> : <span id={id} className={className}>{children}</span>;
}

/** Round, outlined, icon-only swap button (public site style), centred on the line between
 *  From and To. Stacked below ~900px it sits on a horizontal line with up/down arrows. */
export function SwapButton({ onSwap }: { onSwap: () => void }) {
  const label = "Swap origin and destination";
  return (
    <div className="relative flex h-14 items-center justify-center min-[900px]:h-auto min-[900px]:flex-col min-[900px]:justify-start min-[900px]:gap-1">
      {/* Same height as the field labels, so the button centres on the fields, not on the labels. */}
      <span aria-hidden="true" className="invisible hidden text-label font-medium min-[900px]:block">From</span>
      <div className="relative flex w-full flex-1 items-center justify-center self-stretch">
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border min-[900px]:inset-x-auto min-[900px]:inset-y-0 min-[900px]:left-1/2 min-[900px]:top-0 min-[900px]:h-auto min-[900px]:w-px min-[900px]:-translate-x-1/2 min-[900px]:translate-y-0" />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={label}
                data-swap-button
                onClick={onSwap}
                className={cn(
                  "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary/30 bg-card text-primary transition-colors",
                  "[@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11",
                  "hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                )}
              >
                <ArrowLeftRight className="hidden h-4 w-4 min-[900px]:block" aria-hidden="true" />
                <ArrowUpDown className="h-4 w-4 min-[900px]:hidden" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

/** From and To, each half the row, with the round swap button between them; stacked below ~900px. */
export function RouteRow({ from, to, onSwap }: { from: React.ReactNode; to: React.ReactNode; onSwap: () => void }) {
  return (
    <div data-route-row className="grid grid-cols-1 min-[900px]:grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,1fr)]">
      {from}
      <SwapButton onSwap={onSwap} />
      {to}
    </div>
  );
}

/** Filled search button with the magnifier (public site style); the admin keeps its own label. */
export function SearchSubmitButton({ label, disabled }: { label: string; disabled?: boolean }) {
  return (
    <Button type="submit" size="lg" disabled={disabled} className="h-14">
      <Search aria-hidden="true" /> {label}
    </Button>
  );
}

/** Search product tabs with the public site's icons and active-tab styling. */
export function SearchProductTabs({ active, label = "Search products" }: { active: string; label?: string }) {
  return (
    <nav aria-label={label}>
      <div className="grid grid-cols-2 overflow-hidden rounded-t-xl border-b border-border bg-muted/40 sm:grid-cols-4">
        {ADMIN_PRODUCT_TABS.map(tab => (
          <Link
            key={tab.id}
            to={`/admin/search?tab=${tab.id}`}
            aria-current={tab.id === active ? "page" : undefined}
            className={cn(
              "flex min-h-12 min-w-0 items-center justify-center gap-2 border-b-2 px-4 text-body font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
              tab.id === active ? "border-primary bg-primary/5 text-primary" : "border-transparent text-muted-foreground hover:bg-card/60 hover:text-primary",
            )}
          >
            <tab.icon data-tab-icon className="h-4 w-4 shrink-0" aria-hidden="true" />{tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
