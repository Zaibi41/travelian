import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Minus, Plane, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusKpiCard } from "@/components/admin/StatusKpiCard";
import { DashboardErrorNotice } from "@/components/admin/dashboard/DashboardStates";
import { LabeledSelect } from "@/components/admin/bookings/LabeledSelect";
import { AirportCombobox } from "@/components/admin/search/AirportCombobox";
import { RouteRow, SEARCH_FIELD, SearchSubmitButton } from "@/components/admin/search/SearchFormParts";
import { DayFirstDateField } from "@/components/admin/DayFirstDateField";
import { formatDay } from "@/lib/admin-search/date-display";
import { NotAvailableNotice } from "@/components/admin/bookings/NotAvailable";
import { GatewayError } from "@/lib/gateway/client";
import { formatMoney } from "@/lib/admin-bookings/format";
import { cn } from "@/lib/utils";
import {
  DEFAULT_FILTERS, airlineLabel, baggageOptions, filterFlights, formatDuration, isCompleteFlightSearch, isRefundable, parseFlightSearch,
  priceBands, searchFlights, stopsLabel, writeFlightSearch,
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
  refund: "Not available yet",
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
  const countdown = useCountdown(results.data?.expires_at);
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
      {results.data && (
        <div className="grid grid-cols-1 gap-card-gap sm:grid-cols-2">
          {results.data.providers && (
            <StatusKpiCard
              label="Available providers"
              value={`${results.data.providers.filter(p => p.status === "responded").length} of ${results.data.providers.length}`}
            />
          )}
          {results.data.status === "complete" && countdown && (
            <StatusKpiCard
              label="Search expiry"
              value={countdown.seconds > 0 ? countdown.label : "Expired"}
              // Mockup search-flights: a running timer carries no warning tag. Once expired the card
              // turns critical; the value "Expired" is its text label, so no separate tag is shown.
              severity={countdown.seconds > 0 ? undefined : "critical"}
              showBadge={false}
              hint={countdown.seconds > 0 ? "Fares must be revalidated before booking" : "Search again for current fares"}
            />
          )}
        </div>
      )}

      <section aria-label="Search flights" className="flex flex-col gap-3 rounded-lg border border-border bg-card px-card py-3.5 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Trip type" className="inline-flex rounded-sm border border-border bg-muted p-0.5">
            {(["oneway", "roundtrip"] as const).map(trip => (
              <button
                key={trip}
                type="button"
                role="radio"
                aria-checked={draft.trip === trip}
                onClick={() => setDraft({ ...draft, trip, returnDate: trip === "oneway" ? undefined : draft.returnDate })}
                className={cn(
                  "h-8 rounded-sm px-3 text-body font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  draft.trip === trip ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {trip === "oneway" ? "One-way" : "Round-trip"}
              </button>
            ))}
            <WithReason reason={REASONS.multiCity}>
              {describedBy => (
                <button type="button" role="radio" aria-checked={false} disabled aria-describedby={describedBy}
                  className="h-8 cursor-not-allowed rounded-sm px-3 text-body font-medium text-muted-foreground opacity-60">
                  Multi-city
                </button>
              )}
            </WithReason>
          </div>
          <TravelersPicker value={draft} onChange={next => setDraft({ ...draft, ...next })} />
          <CabinPicker />
        </div>
        <form
          className="flex min-w-0 flex-col gap-3"
          onSubmit={event => {
            event.preventDefault();
            if (canSearch) commit(draft);
          }}
        >
          {/* Row 1: From and To with the round swap between them (shared RouteRow; stacked below ~900px). */}
          <RouteRow
            from={<AirportCombobox id="flight-from" label="From" placeholder="Origin" icon="departure" value={draft.from} onChange={from => setDraft({ ...draft, from })} />}
            to={<AirportCombobox id="flight-to" label="To" placeholder="Destination" icon="arrival" value={draft.to} onChange={to => setDraft({ ...draft, to })} />}
            onSwap={() => setDraft({ ...draft, from: draft.to, to: draft.from })}
          />
          {/* Row 2: dates, provider (admin only) and Search flights. */}
          <div className={cn(
            "grid grid-cols-1 items-end gap-3 sm:grid-cols-2",
            providerNames.length ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]",
          )}>
            <DateInput id="flight-date" label="Departure date" value={draft.date} onChange={date => setDraft({ ...draft, date })} />
            <DateInput id="flight-return" label="Return date" value={draft.trip === "roundtrip" ? draft.returnDate : undefined} min={draft.date}
              disabledReason={draft.trip === "roundtrip" ? undefined : REASONS.returnDate} onChange={returnDate => setDraft({ ...draft, returnDate })} />
            {providerNames.length > 0 && (
              <LabeledSelect id="flight-provider" label="Provider" value={filters.provider} triggerClassName={SEARCH_FIELD}
                options={[{ value: "any", label: "All providers" }, ...providerNames.map(name => ({ value: name, label: name }))]}
                onChange={provider => setFilters({ ...filters, provider })} />
            )}
            <SearchSubmitButton label="Search flights" disabled={!canSearch} />
          </div>
        </form>
        {sameAirport && <p role="alert" className="text-body text-status-critical-text">Origin and destination are the same airport. Choose a different destination.</p>}
      </section>

      {complete && (
        <p role="note" className="rounded-lg border border-status-action/40 bg-status-action-soft px-card py-2.5 text-body text-status-action-text">
          Search prices are indicative. A fare must be revalidated before any money is taken. The booked price is final.
        </p>
      )}

      {complete && (
        results.error ? (
          <DashboardErrorNotice message={errorMessage(results.error)} />
        ) : results.isPending ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-card px-card py-3.5 shadow-card" aria-busy="true" aria-label="Loading flights">
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

function DateInput({ id, label, value, min, disabledReason, onChange }: {
  id: string; label: string; value?: string; min?: string; disabledReason?: string; onChange: (value?: string) => void;
}) {
  return (
    <div className="relative flex min-w-0 flex-col gap-1" title={disabledReason}>
      <label htmlFor={id} className="text-label font-medium text-muted-foreground">{label}</label>
      <DayFirstDateField id={id} value={value} min={min} disabled={Boolean(disabledReason)} variant="search"
        describedBy={disabledReason ? `${id}-reason` : undefined} onChange={onChange} />
      {disabledReason && <span id={`${id}-reason`} className="sr-only">{disabledReason}</span>}
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

function TravelersPicker({ value, onChange }: { value: FlightSearch; onChange: (next: Partial<FlightSearch>) => void }) {
  const [open, setOpen] = useState(false);
  const total = value.adults + value.children + value.infants;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-8 text-body">{total} {total === 1 ? "Traveler" : "Travelers"}</Button>
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
                  <Button type="button" size="icon" variant="outline" className="h-8 w-8" aria-label={`Fewer ${row.label.toLowerCase()}`}
                    disabled={current <= row.min} onClick={() => onChange({ [row.key]: current - 1, ...(row.key === "adults" && value.infants > current - 1 ? { infants: current - 1 } : {}) })}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-5 text-center text-body tabular-nums" aria-live="polite">{current}</span>
                  <Button type="button" size="icon" variant="outline" className="h-8 w-8" aria-label={`More ${row.label.toLowerCase()}`}
                    disabled={current >= max} onClick={() => onChange({ [row.key]: current + 1 })}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
          <Button type="button" className="mt-1 h-8 text-body" onClick={() => setOpen(false)}>Done</Button>
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

function Results({ data, search, filters, onFilters, renderFareAction, actionNotes }: {
  data: FlightSearchView; search: FlightSearch; filters: ResultFilters; onFilters: (next: ResultFilters) => void;
  renderFareAction?: FlightsSearchProps["renderFareAction"]; actionNotes?: string[];
}) {
  const allFlights = data.journeys.flatMap(journey => journey.flights);
  const airlines = useMemo(() => [...new Set(allFlights.map(airlineLabel))].sort(), [allFlights]);
  const hasRefundInfo = allFlights.some(flight => flight.fares.some(fare => isRefundable(fare) !== null));
  const baggage = useMemo(() => baggageOptions(allFlights), [allFlights]);
  const bands = useMemo(() => priceBands(allFlights), [allFlights]);
  const responding = data.providers ? `${data.providers.filter(p => p.status === "responded").length} of ${data.providers.length}` : null;
  const validUntil = clock(data.expires_at);
  // D24: a provider failed or timed out. Its notice replaces the "no flights" message.
  const providerFailed = Boolean(data.notice) || Boolean(data.providers?.some(provider => provider.status === "failed"));
  const partialNotice = "Some results may be missing.";       // shown here only when the header has no notice

  // Nothing came back: say so honestly. "Some results may be missing" (D24) is only for
  // partial results, shown with them below when the gateway sends that notice.
  if (data.status === "unavailable") {
    return (
      <NotAvailableNotice title="Flight search isn't available yet">
        The flight provider isn't returning results through the gateway yet.
      </NotAvailableNotice>
    );
  }
  return (
    <section aria-label="Results" className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card px-card py-3.5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-section font-semibold text-foreground">Results</h2>
          {data.notice && <p className="text-body text-status-action-text">{data.notice}</p>}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-body text-muted-foreground">
          {responding && <span>Providers responding {responding}</span>}
          {responding && validUntil && <span aria-hidden="true">·</span>}
          {validUntil && <span>Fare valid until {validUntil}</span>}
          {allFlights.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <label htmlFor="flight-sort">Sort by</label>
              <Select value={filters.sort} onValueChange={sort => onFilters({ ...filters, sort: sort as ResultFilters["sort"] })}>
                <SelectTrigger id="flight-sort" className="h-8 w-auto min-w-[10rem] rounded-sm border-border bg-card px-2.5 text-body text-foreground shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price" className="text-body">Price, low to high</SelectItem>
                  <SelectItem value="departure" className="text-body">Departure time</SelectItem>
                  <SelectItem value="duration" className="text-body">Shortest</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </div>
      {allFlights.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <LabeledSelect id="flight-filter-airline" label="Airline" value={filters.airline}
            options={[{ value: "any", label: "All" }, ...airlines.map(name => ({ value: name, label: name }))]}
            onChange={airline => onFilters({ ...filters, airline })} />
          <LabeledSelect id="flight-filter-stops" label="Stops" value={filters.stops}
            options={[{ value: "any", label: "Any" }, { value: "nonstop", label: "Non-stop" }, { value: "one", label: "1 stop" }, { value: "two_plus", label: "2+ stops" }]}
            onChange={stops => onFilters({ ...filters, stops: stops as ResultFilters["stops"] })} />
          <LabeledSelect id="flight-filter-time" label="Departure time" value={filters.time}
            options={[{ value: "any", label: "Any" }, { value: "morning", label: "Morning (05–12)" }, { value: "afternoon", label: "Afternoon (12–17)" }, { value: "evening", label: "Evening (17–21)" }, { value: "night", label: "Night (21–05)" }]}
            onChange={time => onFilters({ ...filters, time: time as ResultFilters["time"] })} />
          <LabeledSelect id="flight-filter-baggage" label="Baggage" value={filters.baggage}
            options={[{ value: "any", label: "Any" }, ...baggage]}
            onChange={value => onFilters({ ...filters, baggage: value })} />
          <LabeledSelect id="flight-filter-refund" label="Refundable" value={hasRefundInfo ? filters.refund : "any"}
            options={[{ value: "any", label: "Any" }, { value: "refundable", label: "Refundable" }, { value: "non_refundable", label: "Non-refundable" }]}
            disabled={!hasRefundInfo} note={hasRefundInfo ? undefined : REASONS.refund}
            onChange={refund => onFilters({ ...filters, refund: refund as ResultFilters["refund"] })} />
          <LabeledSelect id="flight-filter-price" label="Price range" value={filters.price}
            options={[{ value: "any", label: "Any" }, ...bands.map(band => ({ value: band.value, label: band.label }))]}
            disabled={bands.length === 0} note={bands.length === 0 ? "Not enough prices to filter" : undefined}
            onChange={price => onFilters({ ...filters, price })} />
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
        <Button type="button" variant="outline" className="h-8 shrink-0 text-body">Flight details</Button>
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

function FlightCard({ journey, flight, data, renderFareAction, actionNotes }: {
  journey: JourneyView; flight: FlightView; data: FlightSearchView; renderFareAction?: FlightsSearchProps["renderFareAction"]; actionNotes?: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const fares = expanded ? flight.fares : flight.fares.slice(0, VISIBLE_FARES);
  const meta = [formatDuration(flight.duration_minutes), stopsLabel(flight)].filter(Boolean).join(" · ");
  const showsProvider = flight.fares.some(fare => fare.supplier);
  return (
    <article aria-label={`${airlineLabel(flight)} ${flight.flight_number ?? ""}`} className="min-w-0 overflow-hidden rounded-md border border-border">
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] border-collapse text-table">
          <thead>
            <tr className="bg-muted text-left">
              {["Fare", "Meal", "Baggage", "Refund", "Price", showsProvider ? "Hold left · Provider" : "Hold left", ...(renderFareAction ? ["Actions"] : [])].map(column => (
                <th key={column} scope="col" className="h-table-header px-2.5 font-semibold text-foreground">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fares.map(fare => {
              const refundable = isRefundable(fare);
              return (
                <tr key={fare.id} className="border-t border-border align-top">
                  <td className="px-2.5 py-2 font-semibold text-foreground">{fare.name}</td>
                  <td className="max-w-[9rem] px-2.5 py-2"><span className={cn("line-clamp-2 break-words", !fare.meal && "text-muted-foreground")} title={fare.meal ?? undefined}>{fare.meal ?? "Meal info not available"}</span></td>
                  <td className="max-w-[9rem] px-2.5 py-2"><span className={cn("line-clamp-2 break-words", !fare.baggage && "text-muted-foreground")} title={fare.baggage ?? undefined}>{fare.baggage ?? "Baggage info not available"}</span></td>
                  <td className="max-w-[9rem] px-2.5 py-2">
                    {refundable === null ? <span className="line-clamp-2 text-muted-foreground">{REASONS.refund}</span>
                      : <StatusBadge severity={refundable ? "fine" : "critical"}>{refundable ? "Refundable" : "Non-refundable"}</StatusBadge>}
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-2 tabular-nums">
                    {fare.selling_price ? <><span className="font-semibold text-foreground">{formatMoney(fare.selling_price)}</span> <span className="text-label text-muted-foreground">per adult</span></> : <span className="text-muted-foreground">Price not available</span>}
                  </td>
                  <td className="max-w-[10rem] px-2.5 py-2">
                    <span className={cn("line-clamp-2 break-words", !fare.time_limit && "text-muted-foreground")} title={fare.time_limit ?? undefined}>{fare.time_limit ?? "Hold time not available"}</span>
                    {fare.supplier && <span className="block truncate text-label text-muted-foreground" title={fare.supplier}>{fare.supplier}</span>}
                  </td>
                  {renderFareAction && <td className="px-2.5 py-2">{renderFareAction({ journey, flight, fare }, data)}</td>}
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
