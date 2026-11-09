import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ArrowLeftRight, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { AirlineLogo } from "@/components/public/AirlineLogo";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusKpiCard } from "@/components/admin/StatusKpiCard";
import { DashboardErrorNotice } from "@/components/admin/dashboard/DashboardStates";
import { LabeledSelect } from "@/components/admin/bookings/LabeledSelect";
import { GatewayError } from "@/lib/gateway/client";
import { formatMoney } from "@/lib/admin-bookings/format";
import { cn } from "@/lib/utils";
import {
  DEFAULT_FILTERS, airlineLabel, filterFlights, formatDuration, isCompleteFlightSearch, isRefundable, parseFlightSearch,
  searchFlights, stopsLabel, writeFlightSearch,
  type FareView, type FlightSearch, type FlightSearchView, type FlightView, type JourneyView, type ResultFilters,
} from "@/lib/admin-search/flights";

const errorMessage = (error: unknown) =>
  error instanceof GatewayError ? error.message : "Flights couldn't be loaded. Try again in a few minutes.";

function time(local?: string | null) {
  return local && local.length >= 16 ? local.slice(11, 16) : "—";
}

function day(local?: string | null) {
  if (!local) return "";
  const date = parseISO(local);
  return Number.isFinite(date.getTime()) ? format(date, "d MMM") : "";
}

function useCountdown(expiresAt?: string) {
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
}

// Search > Flights (spec 6, D26, mockup search-flights) on the gateway's live search (Southair).
// Hidden until the gateway provides them (docs/backend-todo.md, Search): Multi-city, Cabin
// (the supplier search has no cabin parameter), Provider filter (one provider), Quotes pending,
// Baggage and Price range filters, Fare rules, Quote.
export function FlightsSearch({ renderFareAction, renderBelow }: FlightsSearchProps) {
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
  const canSearch = isCompleteFlightSearch(draft);
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
              severity={countdown.seconds > 0 ? "action" : "critical"}
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
          </div>
          <TravelersPicker value={draft} onChange={next => setDraft({ ...draft, ...next })} />
        </div>
        <form
          className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
          onSubmit={event => {
            event.preventDefault();
            if (canSearch) commit(draft);
          }}
        >
          <CodeInput id="flight-from" label="From" placeholder="Origin (e.g. KHI)" value={draft.from} onChange={from => setDraft({ ...draft, from })} />
          <Button type="button" variant="outline" className="h-control text-body" aria-label="Swap origin and destination"
            onClick={() => setDraft({ ...draft, from: draft.to, to: draft.from })}>
            <ArrowLeftRight className="h-4 w-4" aria-hidden="true" /> Swap
          </Button>
          <CodeInput id="flight-to" label="To" placeholder="Destination (e.g. DXB)" value={draft.to} onChange={to => setDraft({ ...draft, to })} />
          <DateInput id="flight-date" label="Departure date" value={draft.date} onChange={date => setDraft({ ...draft, date })} />
          {draft.trip === "roundtrip" ? (
            <DateInput id="flight-return" label="Return date" value={draft.returnDate} min={draft.date} onChange={returnDate => setDraft({ ...draft, returnDate })} />
          ) : <div className="hidden lg:block" />}
          <Button type="submit" disabled={!canSearch} className="h-control bg-teal text-body text-teal-foreground hover:bg-teal/90">Search flights</Button>
        </form>
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
            <Results data={results.data} filters={filters} onFilters={setFilters} renderFareAction={renderFareAction} />
            {renderBelow?.(results.data, search)}
          </>
        ) : null
      )}
    </div>
  );
}

function CodeInput({ id, label, placeholder, value, onChange }: { id: string; label: string; placeholder: string; value?: string; onChange: (value?: string) => void }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-label font-medium text-muted-foreground">{label}</label>
      <Input
        id={id}
        value={value ?? ""}
        maxLength={3}
        placeholder={placeholder}
        autoComplete="off"
        onChange={event => onChange(event.target.value.toUpperCase().replace(/[^A-Z]/g, "") || undefined)}
        className="h-control rounded-sm text-body uppercase placeholder:normal-case"
      />
    </div>
  );
}

function DateInput({ id, label, value, min, onChange }: { id: string; label: string; value?: string; min?: string; onChange: (value?: string) => void }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-label font-medium text-muted-foreground">{label}</label>
      <Input id={id} type="date" value={value ?? ""} min={min} onChange={event => onChange(event.target.value || undefined)} className="h-control rounded-sm text-body" />
    </div>
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

function Results({ data, filters, onFilters, renderFareAction }: {
  data: FlightSearchView; filters: ResultFilters; onFilters: (next: ResultFilters) => void;
  renderFareAction?: FlightsSearchProps["renderFareAction"];
}) {
  const allFlights = data.journeys.flatMap(journey => journey.flights);
  const airlines = useMemo(() => [...new Set(allFlights.map(airlineLabel))].sort(), [allFlights]);
  const hasRefundInfo = allFlights.some(flight => flight.fares.some(fare => isRefundable(fare) !== null));

  if (data.status === "unavailable") {
    return <DashboardErrorNotice message={data.notice ?? "Some results may be missing."} />;
  }
  return (
    <section aria-label="Results" className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card px-card py-3.5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-section font-semibold text-foreground">Results</h2>
        {data.notice && <p className="text-body text-status-action-text">{data.notice}</p>}
      </div>
      {allFlights.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <LabeledSelect id="flight-filter-airline" label="Airline" value={filters.airline}
            options={[{ value: "any", label: "All" }, ...airlines.map(name => ({ value: name, label: name }))]}
            onChange={airline => onFilters({ ...filters, airline })} />
          <LabeledSelect id="flight-filter-stops" label="Stops" value={filters.stops}
            options={[{ value: "any", label: "Any" }, { value: "nonstop", label: "Non-stop" }, { value: "one", label: "1 stop" }, { value: "two_plus", label: "2+ stops" }]}
            onChange={stops => onFilters({ ...filters, stops: stops as ResultFilters["stops"] })} />
          <LabeledSelect id="flight-filter-time" label="Departure time" value={filters.time}
            options={[{ value: "any", label: "Any" }, { value: "morning", label: "Morning (05–12)" }, { value: "afternoon", label: "Afternoon (12–17)" }, { value: "evening", label: "Evening (17–21)" }, { value: "night", label: "Night (21–05)" }]}
            onChange={time => onFilters({ ...filters, time: time as ResultFilters["time"] })} />
          {hasRefundInfo && (
            <LabeledSelect id="flight-filter-refund" label="Refundable" value={filters.refund}
              options={[{ value: "any", label: "Any" }, { value: "refundable", label: "Refundable" }, { value: "non_refundable", label: "Non-refundable" }]}
              onChange={refund => onFilters({ ...filters, refund: refund as ResultFilters["refund"] })} />
          )}
          <LabeledSelect id="flight-sort" label="Sort by" value={filters.sort}
            options={[{ value: "price", label: "Price, low to high" }, { value: "departure", label: "Departure time" }, { value: "duration", label: "Shortest" }]}
            onChange={sort => onFilters({ ...filters, sort: sort as ResultFilters["sort"] })} />
        </div>
      )}
      {data.journeys.length === 0 && <p className="py-2 text-body text-muted-foreground">No flights found for this search.</p>}
      {data.journeys.map(journey => {
        const flights = filterFlights(journey.flights, filters);
        return (
          <div key={journey.direction} className="flex flex-col gap-2.5">
            {data.journeys.length > 1 && (
              <h3 className="text-body font-semibold text-foreground">
                {journey.direction === "outbound" ? "Outbound" : "Return"} · {journey.origin} → {journey.destination}
              </h3>
            )}
            {flights.length === 0 ? (
              <p className="py-1 text-body text-muted-foreground">No flights match these filters.</p>
            ) : flights.map(flight => (
              <FlightCard key={flight.id} journey={journey} flight={flight} data={data} renderFareAction={renderFareAction} />
            ))}
          </div>
        );
      })}
    </section>
  );
}

function FlightCard({ journey, flight, data, renderFareAction }: {
  journey: JourneyView; flight: FlightView; data: FlightSearchView; renderFareAction?: FlightsSearchProps["renderFareAction"];
}) {
  const [expanded, setExpanded] = useState(false);
  const fares = expanded ? flight.fares : flight.fares.slice(0, 3);
  const meta = [formatDuration(flight.duration_minutes), stopsLabel(flight)].filter(Boolean).join(" · ");
  return (
    <article aria-label={`${airlineLabel(flight)} ${flight.flight_number ?? ""}`} className="overflow-hidden rounded-md border border-border">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-3 py-2.5 sm:grid-cols-[auto_minmax(8rem,12rem)_minmax(0,1fr)]">
        <AirlineLogo airline={airlineLabel(flight)} flightNumber={flight.flight_number ?? undefined} className="h-10 w-10 rounded-md" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground" title={airlineLabel(flight)}>{airlineLabel(flight)}</p>
          <p className="truncate text-label text-muted-foreground">{flight.flight_number ?? "—"}</p>
        </div>
        <div className="col-span-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:col-span-1">
          <div>
            <p className="text-section font-semibold tabular-nums text-foreground">{time(flight.departure_local)}</p>
            <p className="text-label text-muted-foreground">{day(flight.departure_local)} · {journey.origin}</p>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
            <span className="truncate text-label text-muted-foreground">{meta || "—"}</span>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>
          <div className="text-right">
            <p className="text-section font-semibold tabular-nums text-foreground">{time(flight.arrival_local)}</p>
            <p className="text-label text-muted-foreground">{day(flight.arrival_local)} · {journey.destination}</p>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-table">
          <thead>
            <tr className="bg-muted text-left">
              {["Fare", "Meal", "Baggage", "Refund", "Price", "Hold left", ...(renderFareAction ? ["Actions"] : [])].map(column => (
                <th key={column} scope="col" className="h-table-header px-2.5 font-semibold text-foreground">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fares.map(fare => {
              const refundable = isRefundable(fare);
              return (
                <tr key={fare.id} className="border-t border-border">
                  <td className="px-2.5 py-2 font-semibold text-foreground">{fare.name}</td>
                  <td className="max-w-[10rem] px-2.5 py-2"><span className="block truncate" title={fare.meal ?? undefined}>{fare.meal ?? "Meal info not available"}</span></td>
                  <td className="max-w-[10rem] px-2.5 py-2"><span className="block truncate" title={fare.baggage ?? undefined}>{fare.baggage ?? "Baggage info not available"}</span></td>
                  <td className="px-2.5 py-2">
                    {refundable === null ? <span className="text-muted-foreground">{fare.refund ?? "—"}</span>
                      : <StatusBadge severity={refundable ? "fine" : "critical"}>{refundable ? "Refundable" : "Non-refundable"}</StatusBadge>}
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-2 tabular-nums">
                    {fare.selling_price ? <><span className="font-semibold text-foreground">{formatMoney(fare.selling_price)}</span> <span className="text-label text-muted-foreground">per adult</span></> : <span className="text-muted-foreground">Price not available</span>}
                  </td>
                  <td className="max-w-[12rem] px-2.5 py-2"><span className="block truncate" title={fare.time_limit ?? undefined}>{fare.time_limit ?? "—"}</span></td>
                  {renderFareAction && <td className="whitespace-nowrap px-2.5 py-2">{renderFareAction({ journey, flight, fare }, data)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {flight.fares.length > 3 && (
        <button type="button" onClick={() => setExpanded(!expanded)} className="w-full border-t border-border py-2 text-body font-medium text-teal hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {expanded ? "Show fewer fares" : `Show ${flight.fares.length - 3} more fares`}
        </button>
      )}
    </article>
  );
}
