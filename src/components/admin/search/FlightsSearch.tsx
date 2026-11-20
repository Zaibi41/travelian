import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ChevronDown, Luggage, Minus, Plane, Plus, Users, X } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/admin/ui/dialog";
import { Input } from "@/components/admin/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DashboardErrorNotice } from "@/components/admin/dashboard/DashboardStates";
import { LabeledSelect } from "@/components/admin/ui/LabeledSelect";
import { AirportCombobox } from "@/components/admin/ui/AirportCombobox";
import { RouteRow, SEARCH_FIELD, SearchSubmitButton } from "@/components/admin/ui/search-form";
import { DayFirstDateField } from "@/components/admin/ui/DayFirstDateField";
import { useFlightFares, type FareRoute } from "@/hooks/use-flight-fares";
import { formatDay, todayIso } from "@/lib/admin-search/date-display";
import { NotAvailableNotice } from "@/components/admin/bookings/NotAvailable";
import { GatewayError } from "@/lib/gateway/client";
import { formatMoney } from "@/lib/admin-bookings/format";
import { underBaggageLabel } from "@/lib/baggage";
import { cn } from "@/lib/utils";
import {
  DEFAULT_FILTERS, airlineLabel, baggageOptions, fareBaggage, filterFlights, formatDuration, isCompleteFlightSearch, isRefundable, parseFlightSearch,
  SORT_OPTIONS, adminFlightCalendar, priceBands, searchFlights, stopsLabel, writeFlightSearch,
  type FareView, type FlightSearch, type FlightSearchView, type FlightView, type JourneyView, type ResultFilters,
} from "@/lib/admin-search/flights";

const errorMessage = (error: unknown) =>
  error instanceof GatewayError ? error.message : "Flights couldn't be loaded. Try again in a few minutes.";

export function time(local?: string | null) {
  return local && local.length >= 16 ? local.slice(11, 16) : "—";
}

export function day(local?: string | null) {
  if (!local) return "";
  const date = parseISO(local);
  return Number.isFinite(date.getTime()) ? format(date, "d MMM yyyy") : "";
}

export function useCountdown(expiresAt?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);
  if (!expiresAt) return null;
  const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
  return { seconds, label: `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}` };
}

/** Honest reasons for controls that are shown (mockup) but can't be used yet. */
export const REASONS = {
  multiCity: "Multi-city isn't available from the current flight provider.",
  cabin: "Only Economy is searched for now.",
  returnDate: "Choose Round-trip to add a return date.",
  refund: "Not provided by suppliers yet",
  fareRules: "Not available yet",
  quote: "Quotes aren't available yet",
} as const;

let reasonId = 0;
/** A disabled control that says why: tooltip (title) and an accessible description. */
export function WithReason({ reason, children }: { reason: string; children: (describedBy: string) => React.ReactNode }) {
  const [id] = useState(() => `reason-${++reasonId}`);
  return (
    // relative: keeps the absolutely positioned sr-only text inside a scrolling table.
    <span className="relative inline-flex" title={reason}>
      {children(id)}
      <span id={id} className="sr-only">{reason}</span>
    </span>
  );
}

function clock(iso?: string) {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? format(date, "HH:mm") : null;
}

export interface FareSelection {
  journey: JourneyView;
  flight: FlightView;
  fare: FareView;
}

interface FlightsSearchProps {
  /** Renders the action cell for a fare row (step: select for reprice). */
  renderFareAction?: (selection: FareSelection, search: FlightSearchView) => React.ReactNode;
  /** Content below the results (selection and reprice panel). */
  renderBelow?: (search: FlightSearchView, request: FlightSearch) => React.ReactNode;
  /** Visible reasons for disabled fare actions, shown once under each card's fare table. */
  actionNotes?: string[];
}

// Search > Flights (spec 6, D26, mockup search-flights) on the gateway's live search (Southair).
// Shown but disabled, with the reason (REASONS): Multi-city, cabins other than Economy, Refundable
// filter without refund data, Fare rules, Book, Hold, Quote. Hidden until there is data
// (docs/backend-todo.md, Search): Quotes pending card, "Staff fare" tag, airline logos.
export function FlightsSearch({ renderFareAction, renderBelow, actionNotes }: FlightsSearchProps) {
  const [params, setParams] = useSearchParams();
  const search = parseFlightSearch(params);
  const [draft, setDraft] = useState<FlightSearch>(search);
  const paramsKey = params.toString();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sync the form when the URL changes
  useEffect(() => setDraft(parseFlightSearch(params)), [paramsKey]);
  const [filters, setFilters] = useState<ResultFilters>(DEFAULT_FILTERS);

  const complete = isCompleteFlightSearch(search);
  const results = useQuery({
    queryKey: ["admin-search", "flights", search],
    queryFn: ({ signal }) => (isCompleteFlightSearch(search) ? searchFlights(search, { signal }) : Promise.reject(new Error("incomplete"))),
    enabled: complete,
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  // Provider names come only to roles the gateway allows (D23); nothing is shown otherwise.
  const providerNames = (results.data?.providers ?? []).map(provider => provider.name);
  const canSearch = isCompleteFlightSearch(draft);
  const sameAirport = Boolean(draft.from && draft.from === draft.to);
  const commit = (next: FlightSearch) => {
    setFilters(DEFAULT_FILTERS);
    setParams(writeFlightSearch(params, next), { replace: true });
  };

  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      <section aria-label="Search flights" className="flex flex-col gap-3 rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
        <form
          className="admin-search-form flex min-w-0 flex-col gap-3"
          onSubmit={event => {
            event.preventDefault();
            if (canSearch) commit(draft);
          }}
        >
          {/* Line 1: trip type, Travelers and Cabin, left-aligned. */}
          <div className="flex flex-wrap items-center gap-2">
            <TripTypeControl value={draft.trip} onChange={trip => setDraft({ ...draft, trip, returnDate: trip === "oneway" ? undefined : draft.returnDate })} />
            <TravelersPicker value={draft} onChange={next => setDraft({ ...draft, ...next })} />
            <CabinPicker />
          </div>
          {/* Line 2, like the public site: From, swap, To, dates, provider (admin only) and Search flights. Fields
              keep compact widths and From / To take the rest; narrower forms wrap (theme.css, .admin-search-row). */}
          <div className="admin-search-row">
            <div data-size="route" className="min-w-0">
              <RouteRow
                from={<AirportCombobox id="flight-from" label="From" placeholder="Origin" icon="departure" value={draft.from} onChange={from => setDraft({ ...draft, from })} />}
                to={<AirportCombobox id="flight-to" label="To" placeholder="Destination" icon="arrival" value={draft.to} onChange={to => setDraft({ ...draft, to })} />}
                onSwap={() => setDraft({ ...draft, from: draft.to, to: draft.from })}
              />
            </div>
            <div data-size="date"><DateInput id="flight-date" label="Departure date" value={draft.date} min={todayIso()} onChange={date => setDraft({ ...draft, date })}
              fareRoute={draft.from && draft.to ? { from: draft.from, to: draft.to, adults: draft.adults, cabin: "economy" } : undefined} /></div>
            {draft.trip === "roundtrip" && (
              <div data-size="date"><DateInput id="flight-return" label="Return date" value={draft.returnDate} min={draft.date} onChange={returnDate => setDraft({ ...draft, returnDate })} /></div>
            )}
            {providerNames.length > 0 && (
              <div data-size="provider">
                <LabeledSelect id="flight-provider" label="Provider" value={filters.provider} triggerClassName={SEARCH_FIELD}
                  options={[{ value: "any", label: "All providers" }, ...providerNames.map(name => ({ value: name, label: name }))]}
                  onChange={provider => setFilters({ ...filters, provider })} />
              </div>
            )}
            <div data-size="submit"><SearchSubmitButton label="Search flights" disabled={!canSearch} /></div>
          </div>
        </form>
        {sameAirport && <p role="alert" className="text-body text-status-critical-text">Origin and destination are the same airport. Choose a different destination.</p>}
      </section>

      {complete && (
        results.error ? (
          <DashboardErrorNotice message={errorMessage(results.error)} />
        ) : results.isPending ? (
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-card py-3.5 shadow-card" aria-busy="true" aria-label="Loading flights">
            {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-24 rounded-md" />)}
          </div>
        ) : results.data ? (
          <>
            <Results data={results.data} search={search} filters={filters} onFilters={setFilters} renderFareAction={renderFareAction} actionNotes={actionNotes} />
            {renderBelow?.(results.data, search)}
          </>
        ) : null
      )}
    </div>
  );
}

/** fareRoute (Departure date, as on the website): the website's fare calendar opens in the popup. Its prices load in
 *  the background as soon as From and To are both set (#55), so they are there when the calendar opens. */
function DateInput({ id, label, value, min, onChange, fareRoute }: { id: string; label: string; value?: string; min?: string; onChange: (value?: string) => void; fareRoute?: FareRoute }) {
  const fares = useFlightFares(true, fareRoute, adminFlightCalendar);
  return (
    <div className="relative flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-label font-medium text-muted-foreground">{label}</label>
      <DayFirstDateField id={id} value={value} min={min} variant="search" calendarTitle={`Select ${label.toLowerCase()}`} onChange={onChange}
        fares={fares.ready ? { days: fares.days, checking: fares.checking, anyDate: true, status: fares.status } : undefined} />
    </div>
  );
}

/** Trip type above the fields (as before): One-way | Round-trip | Multi-city, a segmented control; Multi-city
 *  is shown but off, with the reason. */
function TripTypeControl({ value, onChange }: { value: FlightSearch["trip"]; onChange: (trip: FlightSearch["trip"]) => void }) {
  return (
    <div role="radiogroup" aria-label="Trip type" className="inline-flex rounded-sm border border-border bg-muted p-0.5">
      {(["oneway", "roundtrip"] as const).map(trip => (
        <button key={trip} type="button" role="radio" aria-checked={value === trip} onClick={() => onChange(trip)}
          className={cn("h-8 rounded-sm px-3 text-body font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === trip ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
          {trip === "oneway" ? "One-way" : "Round-trip"}
        </button>
      ))}
      <WithReason reason={REASONS.multiCity}>
        {describedBy => (
          <button type="button" role="radio" aria-checked={false} disabled aria-describedby={describedBy}
            className="h-8 cursor-not-allowed rounded-sm px-3 text-body font-medium text-muted-foreground opacity-60">Multi-city</button>
        )}
      </WithReason>
    </div>
  );
}

const CABINS = ["Economy", "Premium Economy", "Business", "First"] as const;

/** Cabin Class: Economy only; the other cabins are listed but disabled (the provider search has no cabin). */
function CabinPicker() {
  return (
    <Select value="Economy">
      <SelectTrigger aria-label="Cabin Class" className="h-8 w-auto min-w-[7.5rem] gap-2 rounded-sm border-border bg-card px-3 text-body shadow-none">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CABINS.map(cabin => (
          <SelectItem key={cabin} value={cabin} disabled={cabin !== "Economy"} className="text-body data-[state=checked]:text-primary">
            {cabin}{cabin !== "Economy" && <span className="sr-only"> ({REASONS.cabin})</span>}
          </SelectItem>
        ))}
        <p className="px-2 py-1.5 text-label text-muted-foreground">{REASONS.cabin}</p>
      </SelectContent>
    </Select>
  );
}

const TRAVELER_ROWS = [
  { key: "adults", label: "Adults", hint: "12+ years", min: 1, max: 9 },
  { key: "children", label: "Children", hint: "2–11 years", min: 0, max: 8 },
  { key: "infants", label: "Infants", hint: "Under 2, one per adult", min: 0, max: 8 },
] as const;

/** "1 adult", "2 adults, 1 child, 1 infant". */
function travelersLabel({ adults, children, infants }: Pick<FlightSearch, "adults" | "children" | "infants">) {
  const parts = [`${adults} ${adults === 1 ? "adult" : "adults"}`];
  if (children) parts.push(`${children} ${children === 1 ? "child" : "children"}`);
  if (infants) parts.push(`${infants} ${infants === 1 ? "infant" : "infants"}`);
  return parts.join(", ");
}

/** Travelers dropdown: adults, children and infants, each with its minimum; infants at most one per adult. */
function TravelersPicker({ value, onChange }: { value: FlightSearch; onChange: (next: Partial<FlightSearch>) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label={`Travelers: ${travelersLabel(value)}`} className="gap-1.5">
          <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{travelersLabel(value)}
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="flex flex-col gap-2.5">
          {TRAVELER_ROWS.map(row => {
            const current = value[row.key];
            const max = row.key === "infants" ? Math.min(row.max, value.adults) : row.max;
            return (
              <div key={row.key} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-body font-medium text-foreground">{row.label}</p>
                  <p className="text-label text-muted-foreground">{row.hint}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" size="icon" variant="outline" className="h-9 w-9" aria-label={`Fewer ${row.label.toLowerCase()}`}
                    disabled={current <= row.min} onClick={() => onChange({ [row.key]: current - 1, ...(row.key === "adults" && value.infants > current - 1 ? { infants: current - 1 } : {}) })}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-5 text-center text-body tabular-nums" aria-live="polite">{current}</span>
                  <Button type="button" size="icon" variant="outline" className="h-9 w-9" aria-label={`More ${row.label.toLowerCase()}`}
                    disabled={current >= max} onClick={() => onChange({ [row.key]: current + 1 })}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
          <Button type="button" size="sm" className="mt-1" onClick={() => setOpen(false)}>Done</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** "No flights found for LHE to KHI on 24 Nov 2026. Try another date." */
export function noFlightsMessage(from: string, to: string, date?: string) {
  return `No flights found for ${from} to ${to}${date ? ` on ${formatDay(date)}` : ""}. Try another date.`;
}

/** Any result filter other than the sort order is applied. */
export const filtersApplied = (filters: ResultFilters) =>
  (Object.keys(DEFAULT_FILTERS) as (keyof ResultFilters)[]).some(key => key !== "sort" && filters[key] !== DEFAULT_FILTERS[key]);

const STOPS_OPTIONS = [{ value: "any", label: "Any" }, { value: "nonstop", label: "Non-stop" }, { value: "one", label: "1 stop" }, { value: "two_plus", label: "2+ stops" }];
const TIME_OPTIONS = [{ value: "any", label: "Any" }, { value: "morning", label: "Morning (05–12)" }, { value: "afternoon", label: "Afternoon (12–17)" },
  { value: "evening", label: "Evening (17–21)" }, { value: "night", label: "Night (21–05)" }];
const REFUND_OPTIONS = [{ value: "any", label: "Any" }, { value: "refundable", label: "Refundable" }, { value: "non_refundable", label: "Non-refundable" }];

type FilterKey = Exclude<keyof ResultFilters, "sort">;
interface FilterGroup { key: FilterKey; title: string; options: { value: string; label: string }[]; disabledReason?: string }

/** One filter in the rail (as on the public results page): a small card with a title and its choices. */
function FilterCard({ group, value, onChange }: { group: FilterGroup; value: string; onChange: (value: string) => void }) {
  const name = `flight-filter-${group.key}`;
  return (
    <fieldset aria-label={group.title} title={group.disabledReason} disabled={Boolean(group.disabledReason)}
      aria-describedby={group.disabledReason ? `${name}-reason` : undefined}
      className={cn("min-w-0 rounded-xl border border-border bg-card px-3 py-2.5 shadow-card", group.disabledReason && "opacity-60")}>
      <legend className="float-left mb-1.5 w-full text-label font-semibold text-foreground">{group.title}</legend>
      {group.disabledReason && <span id={`${name}-reason`} className="sr-only">{group.disabledReason}</span>}
      <div className="clear-left flex flex-col gap-1">
        {group.options.map(option => (
          <label key={option.value} className={cn("flex min-w-0 items-center gap-2 text-label", group.disabledReason ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer text-foreground")} title={option.label}>
            <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)}
              className="h-3.5 w-3.5 shrink-0 accent-[hsl(var(--primary))]" />
            <span className="min-w-0 truncate">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Results({ data, search, filters, onFilters, renderFareAction, actionNotes }: {
  data: FlightSearchView; search: FlightSearch; filters: ResultFilters; onFilters: (next: ResultFilters) => void;
  renderFareAction?: FlightsSearchProps["renderFareAction"]; actionNotes?: string[];
}) {
  const allFlights = data.journeys.flatMap(journey => journey.flights);
  const airlines = useMemo(() => [...new Set(allFlights.map(airlineLabel))].sort(), [allFlights]);
  const hasRefundInfo = allFlights.some(flight => flight.fares.some(fare => isRefundable(fare) !== null));
  const baggage = useMemo(() => baggageOptions(allFlights), [allFlights]);
  const bands = useMemo(() => priceBands(allFlights), [allFlights]);
  const providers = (data.providers ?? []).map(provider => provider.name);
  // D24: a provider failed or timed out. Its notice replaces the "no flights" message.
  const providerFailed = Boolean(data.notice) || Boolean(data.providers?.some(provider => provider.status === "failed"));
  const partialNotice = "Some results may be missing.";

  // Nothing came back: say so honestly. "Some results may be missing" (D24) is only for
  // partial results, shown with them below when the gateway sends that notice.
  if (data.status === "unavailable") {
    return (
      <NotAvailableNotice title="Flight search isn't available yet">
        The flight provider isn't returning results through the gateway yet.
      </NotAvailableNotice>
    );
  }
  // All seven filters. Refundable stays visible but off while no supplier sends refund data;
  // Provider only for roles the gateway sends provider names to.
  const groups: FilterGroup[] = [
    { key: "airline", title: "Airline", options: [{ value: "any", label: "All" }, ...airlines.map(name => ({ value: name, label: name }))] },
    { key: "stops", title: "Stops", options: STOPS_OPTIONS },
    { key: "time", title: "Departure time", options: TIME_OPTIONS },
    { key: "baggage", title: "Baggage", options: [{ value: "any", label: "Any" }, ...baggage] },
    { key: "refund", title: "Refundable", options: REFUND_OPTIONS, disabledReason: hasRefundInfo ? undefined : REASONS.refund },
    { key: "price", title: "Price range", options: [{ value: "any", label: "Any" }, ...bands.map(band => ({ value: band.value, label: band.label }))],
      disabledReason: bands.length === 0 ? "Not enough prices to filter" : undefined },
    ...(providers.length ? [{ key: "provider" as const, title: "Provider", options: [{ value: "any", label: "All providers" }, ...providers.map(name => ({ value: name, label: name }))] }] : []),
  ];
  const active = groups.flatMap(group => {
    const value = filters[group.key];
    if (value === DEFAULT_FILTERS[group.key]) return [];
    const option = group.options.find(item => item.value === value);
    return option ? [{ key: group.key, label: `${group.title}: ${option.label}` }] : [];
  });
  const clearAll = () => onFilters({ ...DEFAULT_FILTERS, sort: filters.sort });
  const filterRail = (
    <div className="flex min-w-0 flex-col gap-2.5">
      {groups.map(group => (
        <FilterCard key={group.key} group={group} value={group.key === "refund" && !hasRefundInfo ? "any" : filters[group.key]}
          onChange={value => onFilters({ ...filters, [group.key]: value })} />
      ))}
    </div>
  );

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <StatusLine data={data} />
      <div className={cn("grid min-w-0 grid-cols-1 items-start gap-section-gap", allFlights.length > 0 && "xl:grid-cols-[13rem_minmax(0,1fr)]")}>
        {allFlights.length > 0 && (
          <aside aria-label="Filters" className="min-w-0">
            {/* Below 1280px: the same filter cards behind one Filters toggle, so the fare tables keep their width. */}
            <details className="group rounded-xl border border-border bg-card shadow-card xl:hidden">
              <summary className="flex h-control cursor-pointer list-none items-center justify-between px-3 text-body font-semibold text-foreground">
                Filters{active.length ? ` (${active.length})` : ""}
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="grid grid-cols-1 gap-2.5 px-3 pb-3 sm:grid-cols-2">{groups.map(group => (
                <FilterCard key={group.key} group={group} value={group.key === "refund" && !hasRefundInfo ? "any" : filters[group.key]}
                  onChange={value => onFilters({ ...filters, [group.key]: value })} />
              ))}</div>
            </details>
            <div className="hidden xl:block">{filterRail}</div>
          </aside>
        )}
        <section aria-label="Results" className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-section font-semibold text-foreground">Results</h2>
              {data.notice && <p className="text-body text-status-action-text">{data.notice}</p>}
            </div>
            {allFlights.length > 0 && (
              <div className="flex items-center gap-2 text-body text-muted-foreground">
                <label htmlFor="flight-sort">Sort by</label>
                <Select value={filters.sort} onValueChange={sort => onFilters({ ...filters, sort: sort as ResultFilters["sort"] })}>
                  <SelectTrigger id="flight-sort" className="h-control w-auto min-w-[12rem] rounded-md border-border bg-card px-3 text-body text-foreground shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map(option => <SelectItem key={option.value} value={option.value} className="text-body">{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {active.length > 0 && (
            <div role="group" aria-label="Active filters" className="flex flex-wrap items-center gap-2">
              {active.map(chip => (
                <button key={chip.key} type="button" aria-label={`Remove filter ${chip.label}`} onClick={() => onFilters({ ...filters, [chip.key]: DEFAULT_FILTERS[chip.key] })}
                  className="inline-flex max-w-full items-center gap-1 rounded-pill border border-border bg-card px-2.5 py-1 text-label font-medium text-foreground hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="truncate">{chip.label}</span><X className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              ))}
              <Button type="button" variant="ghost" size="sm" onClick={clearAll}>Clear all</Button>
            </div>
          )}
          {data.journeys.length === 0 && (
            providerFailed ? (data.notice ? null : <p className="py-2 text-body text-status-action-text">{partialNotice}</p>)
              : <p className="py-2 text-body text-muted-foreground">{noFlightsMessage(search.from ?? "", search.to ?? "", search.date)}</p>
          )}
          {data.journeys.map(journey => {
            const flights = filterFlights(journey.flights, filters);
            const journeyDate = journey.direction === "outbound" ? search.date : search.returnDate;
            // Nothing came back for this journey: the date message, unless a provider failed (then the
            // partial-failure notice stays). Filters only explain an empty list when there were flights.
            const empty = journey.flights.length === 0
              ? (providerFailed ? (data.notice ? null : <p className="py-1 text-body text-status-action-text">{partialNotice}</p>)
                : <p className="py-1 text-body text-muted-foreground">{noFlightsMessage(journey.origin, journey.destination, journeyDate)}</p>)
              : <p className="py-1 text-body text-muted-foreground">No flights match these filters.</p>;
            return (
              <div key={journey.direction} className="flex flex-col gap-2.5">
                {data.journeys.length > 1 && (
                  <h3 className="text-body font-semibold text-foreground">
                    {journey.direction === "outbound" ? "Outbound" : "Return"} · {journey.origin} → {journey.destination}
                  </h3>
                )}
                {flights.length === 0 ? empty : flights.map(flight => (
                  <FlightCard key={flight.id} journey={journey} flight={flight} data={data} renderFareAction={renderFareAction} actionNotes={actionNotes} />
                ))}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}

/** One compact line above the results: "Providers responding 1 of 1 · Fares valid until 14:52 (09:12 left) ·
 *  Prices are revalidated before booking". Provider counts only when the gateway sends providers. */
function StatusLine({ data }: { data: FlightSearchView }) {
  const countdown = useCountdown(data.expires_at);
  const responding = data.providers ? `${data.providers.filter(p => p.status === "responded").length} of ${data.providers.length}` : null;
  const until = clock(data.expires_at);
  const expired = countdown !== null && countdown.seconds === 0;
  const parts: React.ReactNode[] = [
    responding && <span key="providers">Providers responding {responding}</span>,
    until && data.status === "complete" && (
      <span key="valid" role="timer" aria-live="off" className={cn(expired && "font-semibold text-status-critical-text")}>
        {expired ? "Fares expired, search again" : <>Fares valid until {until} <span className="tabular-nums">({countdown?.label} left)</span></>}
      </span>
    ),
    <span key="revalidate">Prices are revalidated before booking</span>,
  ].filter(Boolean);
  return (
    <p aria-label="Search status" className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-body text-muted-foreground">
      {parts.map((part, index) => <span key={index} className="contents">{index > 0 && <span aria-hidden="true">{" · "}</span>}{part}</span>)}
    </p>
  );
}

const VISIBLE_FARES = 2;

/** Neutral placeholder: the gateway sends no logo for live flights, and supplier-hosted logos are never used. */
function LogoPlaceholder({ flight }: { flight: FlightView }) {
  return (
    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-label font-semibold text-muted-foreground">
      {flight.airline_code ?? <Plane className="h-4 w-4" />}
    </span>
  );
}

function FlightDetails({ journey, flight }: { journey: JourneyView; flight: FlightView }) {
  const rows: [string, string | null][] = [
    ["Airline", airlineLabel(flight)],
    ["Flight", flight.flight_number ?? null],
    ["From", journey.origin],
    ["To", journey.destination],
    ["Departs", flight.departure_local ? `${day(flight.departure_local)} ${time(flight.departure_local)}` : null],
    ["Arrives", flight.arrival_local ? `${day(flight.arrival_local)} ${time(flight.arrival_local)}` : null],
    ["Duration", formatDuration(flight.duration_minutes)],
    ["Stops", stopsLabel(flight)],
  ];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="shrink-0">Flight details</Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] w-[calc(100%-2rem)] max-w-lg flex-col gap-3 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-section">Flight details</DialogTitle>
        </DialogHeader>
        <dl className="grid min-h-0 grid-cols-[minmax(6rem,8rem)_minmax(0,1fr)] overflow-y-auto text-body">
          {rows.map(([name, value]) => (
            <div key={name} className="contents">
              <dt className="border-b border-border py-2 font-semibold text-foreground">{name}</dt>
              <dd className={cn("min-w-0 truncate border-b border-border py-2", value ? "text-foreground" : "text-muted-foreground")} title={value ?? undefined}>{value ?? "Not available"}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}

/** A missing value is a dash (its meaning for screen readers), never a "not available" sentence. */
/** Short form with a bag icon; full words on hover and for screen readers (#36). */
function BaggageCell({ fare }: { fare: FareView }) {
  const baggage = fareBaggage(fare);
  return (
    <span className={cn("flex min-w-0 items-center gap-1", !baggage.known && "text-muted-foreground")} title={baggage.detail}>
      <Luggage aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate" aria-hidden="true">{underBaggageLabel(baggage.short)}</span>
      <span className="sr-only">{baggage.detail}</span>
    </span>
  );
}

function Missing({ value }: { value?: string | null }) {
  if (!value) return <span className="text-muted-foreground"><span aria-hidden="true">—</span><span className="sr-only">Not available</span></span>;
  return <span className="line-clamp-2 break-words" title={value}>{value}</span>;
}

function FlightCard({ journey, flight, data, renderFareAction, actionNotes }: {
  journey: JourneyView; flight: FlightView; data: FlightSearchView; renderFareAction?: FlightsSearchProps["renderFareAction"]; actionNotes?: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const fares = expanded ? flight.fares : flight.fares.slice(0, VISIBLE_FARES);
  const meta = [formatDuration(flight.duration_minutes), stopsLabel(flight)].filter(Boolean).join(" · ");
  const showsProvider = flight.fares.some(fare => fare.supplier);
  return (
    <article aria-label={`${airlineLabel(flight)} ${flight.flight_number ?? ""}`} className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 lg:grid-cols-[auto_minmax(8rem,12rem)_minmax(0,1fr)_auto]">
        <span className="col-start-1 row-start-1"><LogoPlaceholder flight={flight} /></span>
        <div className="col-start-2 row-start-1 min-w-0">
          <p className="truncate font-semibold text-foreground" title={airlineLabel(flight)}>{airlineLabel(flight)}</p>
          <p className="truncate text-label text-muted-foreground">{flight.flight_number ?? "—"}</p>
        </div>
        <div className="col-span-3 col-start-1 row-start-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 lg:col-span-1 lg:col-start-3 lg:row-start-1">
          <div className="min-w-0">
            <p className="text-section font-semibold tabular-nums text-foreground">{time(flight.departure_local)}</p>
            <p className="truncate text-label text-muted-foreground">{day(flight.departure_local)} · {journey.origin}</p>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
            <span className="truncate text-label text-muted-foreground" title={meta || undefined}>{meta || "—"}</span>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>
          <div className="min-w-0 text-right">
            <p className="text-section font-semibold tabular-nums text-foreground">{time(flight.arrival_local)}</p>
            <p className="truncate text-label text-muted-foreground">{day(flight.arrival_local)} · {journey.destination}</p>
          </div>
        </div>
        <div className="col-start-3 row-start-1 lg:col-start-4">
          <FlightDetails journey={journey} flight={flight} />
        </div>
      </div>
      {/* From 1024px the table fits its card (columns wrap); only phones and tablets scroll it sideways. */}
      <div className="max-lg:overflow-x-auto">
        <table className="w-full border-collapse text-table max-lg:min-w-[52rem]">
          <thead>
            <tr className="bg-muted text-left">
              {["Fare", "Meal", "Baggage", "Refund", showsProvider ? "Hold left · Provider" : "Hold left"].map(column => (
                <th key={column} scope="col" className="h-table-header px-2.5 font-semibold text-foreground">{column}</th>
              ))}
              <th scope="col" className="h-table-header px-2.5 text-right font-semibold text-foreground">Price</th>
              {renderFareAction && <th scope="col" className="h-table-header px-2.5 text-right font-semibold text-foreground">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {fares.map(fare => {
              const refundable = isRefundable(fare);
              return (
                <tr key={fare.id} className="border-t border-border align-middle">
                  <td className="px-2.5 py-2 font-semibold text-foreground">{fare.name}</td>
                  <td className="max-w-[9rem] px-2.5 py-2"><Missing value={fare.meal} /></td>
                  <td className="max-w-[9rem] px-2.5 py-2"><BaggageCell fare={fare} /></td>
                  <td className="max-w-[9rem] px-2.5 py-2">
                    {refundable === null ? <Missing value={null} />
                      : <StatusBadge severity={refundable ? "fine" : "critical"}>{refundable ? "Refundable" : "Non-refundable"}</StatusBadge>}
                  </td>
                  <td className="max-w-[10rem] px-2.5 py-2">
                    <Missing value={fare.time_limit} />
                    {fare.supplier && <span className="block truncate text-label text-muted-foreground" title={fare.supplier}>{fare.supplier}</span>}
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-2 text-right tabular-nums">
                    {fare.selling_price ? <><span className="font-semibold text-foreground">{formatMoney(fare.selling_price)}</span> <span className="text-label text-muted-foreground">per adult</span></> : <Missing value={null} />}
                  </td>
                  {renderFareAction && <td className="px-2.5 py-2 text-right">{renderFareAction({ journey, flight, fare }, data)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {renderFareAction && actionNotes?.length ? (
        <p className="border-t border-border px-3 py-2 text-label text-muted-foreground">{actionNotes.join(" · ")}</p>
      ) : null}
      {flight.fares.length > VISIBLE_FARES && (
        <button type="button" onClick={() => setExpanded(!expanded)} className="w-full border-t border-border py-2 text-body font-medium text-teal hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {expanded ? "Show fewer fares" : `Show ${flight.fares.length - VISIBLE_FARES} more fares`}
        </button>
      )}
    </article>
  );
}
