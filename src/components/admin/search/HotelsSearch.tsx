import { useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, parseISO } from "date-fns";
import { BedDouble, ChevronDown, MapPin, Minus, Plus } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardErrorNotice } from "@/components/admin/dashboard/DashboardStates";
import { LabeledSelect } from "@/components/admin/ui/LabeledSelect";
import { DayFirstDateField } from "@/components/admin/ui/DayFirstDateField";
import { AIRPORT_FIELD, AIRPORT_LIST_PANEL, FieldLabel, SEARCH_FIELD, SearchSubmitButton, airportOptionClass } from "@/components/admin/ui/search-form";
import { Chip, Notice } from "@/components/admin/ui/feedback";
import { Button } from "@/components/admin/ui/button";
import { useCountdown } from "@/components/admin/search/FlightsSearch";
import { todayIso } from "@/lib/admin-search/date-display";
import { GatewayError } from "@/lib/gateway/client";
import { cn } from "@/lib/utils";
import {
  CANCELLATION_OPTIONS, MAX_ADULTS_PER_ROOM, NO_AGE, MAX_CHILDREN, MAX_NIGHTS, MAX_ROOMS, POPULAR_DESTINATIONS, STAR_OPTIONS,
  cancellationText, guestsLabel, hotelMoney, hotelRows, hotelSubline, isCompleteHotelSearch, nightsBetween, parseHotelSearch,
  priceOptions, searchHotels, stayProblem, suggestDestinations, writeHotelSearch,
  type CancellationFilter, type DestinationView, type HotelSearch, type HotelSearchView, type PriceFilter, type StarFilter,
} from "@/lib/admin-search/hotels";

const errorMessage = (error: unknown) =>
  error instanceof GatewayError ? error.message : "Hotels couldn't be loaded. Try again in a few minutes.";
const isoDay = (date: Date) => format(date, "yyyy-MM-dd");
const clock = (iso: string) => format(new Date(iso), "HH:mm");

// Search > Hotels (spec 6; mockup docs/mockups/mockup-search-hotels.png) on the gateway's RateHawk search.
// Hidden until the gateway provides them (docs/backend-todo.md): the Available providers, Search expiry and
// Quotes pending cards (as on Flights, providers and expiry are on the results line instead); Book, Hold and
// Quote (no hotel booking flow yet); Hotel Inventory hotels (D25). Star rating, Price and Cancellation terms
// filter the returned rates without searching again. Source only when the gateway sends it (D25: admins).
export function HotelsSearch() {
  const [params, setParams] = useSearchParams();
  const search = parseHotelSearch(params);
  const [draft, setDraft] = useState<HotelSearch>(search);
  const [tried, setTried] = useState(false);
  const paramsKey = params.toString();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sync the form when the URL changes
  useEffect(() => setDraft(parseHotelSearch(params)), [paramsKey]);

  const complete = isCompleteHotelSearch(search);
  const results = useQuery({
    queryKey: ["admin-search", "hotels", search.destination, search.destinationKind, search.destinationId, search.checkIn,
      search.checkOut, search.rooms, search.adults, search.childAges.join(",")],
    queryFn: ({ signal }) => searchHotels(search, { signal }),
    enabled: complete,
    staleTime: 60_000,
    retry: false, // the supplier's search limit is low (10 a minute); never repeat a failed search by itself
  });

  const commit = (next: HotelSearch) => setParams(writeHotelSearch(params, next), { replace: true });
  // Filters apply to the results straight away (no new search).
  const setFilter = (change: Partial<Pick<HotelSearch, "stars" | "price" | "cancellation">>) => {
    setDraft({ ...draft, ...change });
    commit({ ...search, ...change });
  };
  const problem = stayProblem(draft);
  const currency = results.data?.hotels[0]?.rates[0]?.total.currency;

  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      <section aria-label="Search hotels" className="flex flex-col gap-3 rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="whitespace-nowrap text-label font-medium text-muted-foreground">Popular destinations:</span>
          {POPULAR_DESTINATIONS.map(name => (
            <Chip key={name} data-destination-chip pressed={draft.destination === name && !draft.destinationId}
              onClick={() => setDraft({ ...draft, destination: name, destinationKind: undefined, destinationId: undefined })}>
              {name}
            </Chip>
          ))}
        </div>

        <form
          className="admin-search-form flex min-w-0 flex-col gap-3"
          noValidate
          onSubmit={event => {
            event.preventDefault();
            setTried(true);
            if (!problem) commit({ ...draft, destination: draft.destination.trim() });
          }}
        >
          <div className="admin-search-row">
            <div data-size="destination" className="min-w-0">
              <DestinationField value={draft} onChange={next => setDraft({ ...draft, ...next })} />
            </div>
            <div data-size="date" className="flex min-w-0 flex-col gap-1">
              <FieldLabel htmlFor="hotel-check-in">Check-in</FieldLabel>
              <DayFirstDateField id="hotel-check-in" variant="search" calendarTitle="Select check-in date" placeholder="Check-in date"
                min={todayIso()} value={draft.checkIn}
                onChange={checkIn => {
                  // Keep check-out after check-in: move it to the next day when it no longer is.
                  const moveOut = checkIn && (!draft.checkOut || nightsBetween(checkIn, draft.checkOut) < 1);
                  setDraft({ ...draft, checkIn, checkOut: moveOut ? isoDay(addDays(parseISO(checkIn), 1)) : draft.checkOut });
                }} />
            </div>
            <div data-size="date" className="flex min-w-0 flex-col gap-1">
              <FieldLabel htmlFor="hotel-check-out">Check-out</FieldLabel>
              <DayFirstDateField id="hotel-check-out" variant="search" calendarTitle="Select check-out date" placeholder="Check-out date"
                min={draft.checkIn ? isoDay(addDays(parseISO(draft.checkIn), 1)) : todayIso()}
                max={draft.checkIn ? isoDay(addDays(parseISO(draft.checkIn), MAX_NIGHTS)) : undefined}
                value={draft.checkOut} onChange={checkOut => setDraft({ ...draft, checkOut })} />
            </div>
            <div data-size="guests" className="min-w-0">
              <GuestsPicker value={draft} onChange={next => setDraft({ ...draft, ...next })} />
            </div>
            <div data-size="provider">
              <LabeledSelect id="hotel-stars" label="Star rating" value={draft.stars} triggerClassName={SEARCH_FIELD}
                options={STAR_OPTIONS} onChange={stars => setFilter({ stars: stars as StarFilter })} />
            </div>
            <div data-size="submit"><SearchSubmitButton label="Search hotels" /></div>
          </div>
          {tried && problem && <p role="alert" className="text-body text-status-critical-text">{problem}</p>}
          <div className="flex flex-wrap gap-3">
            <div className="w-full min-w-0 sm:w-64">
              <LabeledSelect id="hotel-price" label="Price" value={draft.price} triggerClassName={SEARCH_FIELD}
                options={priceOptions(currency)} onChange={price => setFilter({ price: price as PriceFilter })} />
            </div>
            <div className="w-full min-w-0 sm:w-64">
              <LabeledSelect id="hotel-cancellation" label="Cancellation terms" value={draft.cancellation} triggerClassName={SEARCH_FIELD}
                options={CANCELLATION_OPTIONS} onChange={cancellation => setFilter({ cancellation: cancellation as CancellationFilter })} />
            </div>
          </div>
        </form>
      </section>

      <Notice tone="action">Rates are valid only until the time shown.</Notice>

      {complete && (
        <section aria-label="Results" className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
          <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-section font-semibold text-foreground">Results</h2>
            {results.data && <StatusLine data={results.data} />}
          </div>
          {results.error ? (
            <DashboardErrorNotice message={errorMessage(results.error)} />
          ) : results.isPending ? (
            <div className="flex flex-col gap-1.5" aria-busy="true" aria-label="Loading results">
              {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-table-row rounded-sm" />)}
            </div>
          ) : results.data.status === "unavailable" ? (
            <DashboardErrorNotice message="Hotel search isn't available right now. Try again in a few minutes." />
          ) : (
            <ResultsTable data={results.data} search={search} />
          )}
        </section>
      )}
    </div>
  );
}

/** "Providers connected 1 (admin only) · Rate valid until 14:52 (09:12 left)". Providers only when the gateway sends them. */
function StatusLine({ data }: { data: HotelSearchView }) {
  const countdown = useCountdown(data.expires_at);
  const expired = countdown !== null && countdown.seconds === 0;
  const connected = data.providers?.filter(provider => provider.status === "responded").length;
  return (
    <p aria-label="Search status" className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-body text-muted-foreground">
      {connected !== undefined && <><span>Providers connected {connected} (admin only)</span><span aria-hidden="true">·</span></>}
      {data.status === "complete" && (
        <span role="timer" aria-live="off" className={cn(expired && "font-semibold text-status-critical-text")}>
          {expired ? "Rates expired, search again" : <>Rate valid until {clock(data.expires_at)} <span className="tabular-nums">({countdown?.label} left)</span></>}
        </span>
      )}
    </p>
  );
}

function ResultsTable({ data, search }: { data: HotelSearchView; search: HotelSearch }) {
  const rows = hotelRows(data.hotels, search);
  const showSource = data.hotels.some(hotel => hotel.source);
  const columns = ["Hotel", "Room type", "Board", "Rate", "Cancellation", ...(showSource ? ["Source"] : []), "Rate valid until"];
  const filtered = search.stars !== "any" || search.price !== "any" || search.cancellation !== "any";
  if (data.hotels.length === 0) {
    return <p className="py-2 text-body text-muted-foreground">No hotels found in {data.destination} for these dates. Try other dates or another destination.</p>;
  }
  return (
    <>
      {data.notice && <Notice tone="action">{data.notice}</Notice>}
      <p className="text-body text-muted-foreground">
        {rows.length === data.hotels.length ? `${rows.length} hotels` : `${rows.length} of ${data.hotels.length} hotels`} in {data.destination}, cheapest first.
      </p>
      {rows.length === 0 ? (
        <p className="py-2 text-body text-muted-foreground">{filtered ? "No hotels match these filters." : "No hotels found."}</p>
      ) : (
        // From 1280px the table fits the card; narrower screens scroll it sideways inside the card.
        <div className="relative max-xl:overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-table max-xl:min-w-[60rem]">
            <colgroup>
              <col className="w-[23%]" /><col className="w-[14%]" /><col className="w-[10%]" /><col className="w-[15%]" />
              <col className="w-[16%]" />{showSource && <col className="w-[10%]" />}<col className="w-[12%]" />
            </colgroup>
            <thead>
              <tr className="bg-muted text-left">
                {columns.map(column => <th key={column} scope="col" className="h-table-header px-2.5 font-semibold text-foreground">{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ hotel, rate }) => (
                <tr key={hotel.id} className="border-b border-border last:border-b-0">
                  <td className="px-2.5 py-2 align-top">
                    <span className="block truncate font-semibold text-foreground" title={hotel.name}>{hotel.name}</span>
                    <span className="block truncate text-label text-muted-foreground" title={hotel.address ?? undefined}>{hotelSubline(hotel) || "—"}</span>
                  </td>
                  <td className="px-2.5 py-2 align-top">
                    <span className="line-clamp-2 text-foreground" title={rate.room_type}>{rate.room_type}</span>
                  </td>
                  <td className="px-2.5 py-2 align-top text-foreground"><span className="block truncate" title={rate.board}>{rate.board}</span></td>
                  <td className="px-2.5 py-2 align-top tabular-nums">
                    <span className="block whitespace-nowrap font-semibold text-foreground">{hotelMoney(rate.total)}</span>
                    <span className="block text-label text-muted-foreground">{hotelMoney(rate.per_night)} a night</span>
                  </td>
                  <td className="px-2.5 py-2 align-top">
                    <span className={cn("line-clamp-2", rate.cancellation === "free_until" ? "text-status-fine-text" : "text-foreground")}>{cancellationText(rate)}</span>
                  </td>
                  {showSource && (
                    <td className="px-2.5 py-2 align-top">
                      {hotel.source && <span className="inline-block max-w-full truncate rounded-full bg-primary/10 px-2 py-0.5 text-label font-semibold text-primary" title={hotel.source}>{hotel.source}</span>}
                    </td>
                  )}
                  <td className="px-2.5 py-2 align-top tabular-nums text-foreground">{format(new Date(data.expires_at), "d MMM yyyy, HH:mm")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/** Destination: free text (the gateway takes the first matching city) or a suggestion from the gateway
 *  (cities, regions and hotels), loaded after 2 characters. Arrow keys, Enter, Escape. */
function DestinationField({ value, onChange }: {
  value: HotelSearch;
  onChange: (next: Pick<HotelSearch, "destination" | "destinationKind" | "destinationId">) => void;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");
  const text = value.destination;
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(text.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [text]);
  const typed = query.length >= 2 && !value.destinationId;
  const suggestions = useQuery({
    queryKey: ["admin-search", "hotel-destinations", query],
    queryFn: ({ signal }) => suggestDestinations(query, { signal }),
    enabled: typed && open,
    staleTime: 10 * 60_000,
    retry: false,
  });
  const items = typed ? suggestions.data?.destinations ?? [] : [];
  const showList = open && typed;
  const choose = (item: DestinationView) => {
    onChange({ destination: item.name, destinationKind: item.kind, destinationId: item.id });
    setOpen(false);
  };
  const activeId = showList && items[active] ? `${listId}-${active}` : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <FieldLabel htmlFor="hotel-destination">Destination</FieldLabel>
      <Popover open={showList} onOpenChange={next => !next && setOpen(false)}>
        <PopoverAnchor asChild>
          <div className="relative min-w-0">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              id="hotel-destination"
              role="combobox"
              aria-expanded={showList}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={activeId}
              value={text}
              maxLength={120}
              placeholder="City or destination"
              autoComplete="off"
              spellCheck={false}
              onFocus={() => setOpen(true)}
              onBlur={() => setOpen(false)}
              onChange={event => {
                setOpen(true);
                setActive(0);
                onChange({ destination: event.target.value, destinationKind: undefined, destinationId: undefined });
              }}
              onKeyDown={event => {
                if (event.key === "ArrowDown" && items.length) {
                  event.preventDefault();
                  setActive(current => (current + 1) % items.length);
                } else if (event.key === "ArrowUp" && items.length) {
                  event.preventDefault();
                  setActive(current => (current - 1 + items.length) % items.length);
                } else if (event.key === "Enter" && showList && items[active]) {
                  event.preventDefault();
                  choose(items[active]);
                } else if (event.key === "Escape" && showList) {
                  event.preventDefault();
                  setOpen(false);
                }
              }}
              className={cn(AIRPORT_FIELD, "flex h-14 w-full min-w-0 truncate pl-10 pr-3 text-body placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
            />
          </div>
        </PopoverAnchor>
        <PopoverContent data-scroll-into-view="" align="start" className={AIRPORT_LIST_PANEL}
          onOpenAutoFocus={event => event.preventDefault()} onCloseAutoFocus={event => event.preventDefault()}
          onInteractOutside={event => { if (event.target === inputRef.current) event.preventDefault(); }}>
          <ul id={listId} role="listbox" aria-label="Destinations" className="flex flex-col gap-0.5">
            {suggestions.isFetching && items.length === 0 && <li role="option" aria-selected={false} aria-disabled className="px-3 py-3 text-body text-muted-foreground">Loading destinations…</li>}
            {suggestions.error && <li role="option" aria-selected={false} aria-disabled className="px-3 py-3 text-body text-muted-foreground">{errorMessage(suggestions.error)}</li>}
            {suggestions.data && items.length === 0 && <li role="option" aria-selected={false} aria-disabled className="px-3 py-3 text-body text-muted-foreground">No destinations found</li>}
            {items.map((item, position) => (
              <li key={`${item.kind}-${item.id}`} id={`${listId}-${position}`} role="option" aria-selected={position === active}
                onPointerDown={event => event.preventDefault()} onPointerEnter={() => setActive(position)} onClick={() => choose(item)}
                className={airportOptionClass(position === active)}>
                <span className="flex min-w-0 items-center gap-2.5">
                  {item.kind === "hotel"
                    ? <BedDouble className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    : <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                  <span className="min-w-0">
                    <span className="block truncate text-body font-medium text-foreground" title={item.name}>{item.name}</span>
                    <span className="block truncate text-label text-muted-foreground">{item.kind === "hotel" ? "Hotel" : [item.country_code, "City or region"].filter(Boolean).join(" · ")}</span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Guests and rooms: rooms, adults (at least one per room, at most 6 per room) and children with their ages. */
function GuestsPicker({ value, onChange }: { value: HotelSearch; onChange: (next: Pick<HotelSearch, "rooms" | "adults" | "childAges">) => void }) {
  const [open, setOpen] = useState(false);
  const set = (change: Partial<Pick<HotelSearch, "rooms" | "adults" | "childAges">>) =>
    onChange({ rooms: value.rooms, adults: value.adults, childAges: value.childAges, ...change });
  const rows = [
    { label: "Rooms", current: value.rooms, min: 1, max: MAX_ROOMS,
      step: (rooms: number) => set({ rooms, adults: Math.min(Math.max(value.adults, rooms), rooms * MAX_ADULTS_PER_ROOM) }) },
    { label: "Adults", current: value.adults, min: value.rooms, max: value.rooms * MAX_ADULTS_PER_ROOM, step: (adults: number) => set({ adults }) },
    { label: "Children", current: value.childAges.length, min: 0, max: MAX_CHILDREN,
      step: (count: number) => set({ childAges: count > value.childAges.length ? [...value.childAges, NO_AGE] : value.childAges.slice(0, count) }) },
  ];
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <FieldLabel htmlFor="hotel-guests">Guests and rooms</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button id="hotel-guests" type="button" className={cn(SEARCH_FIELD, "flex w-full min-w-0 items-center justify-between gap-2 px-3 text-left text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}>
            <span className="truncate">{guestsLabel(value)}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent data-scroll-into-view="" align="start" className="max-h-[min(28rem,var(--radix-popover-content-available-height))] w-72 overflow-y-auto overscroll-contain p-3">
          <div className="flex flex-col gap-2.5">
            {rows.map(row => (
              <div key={row.label} className="flex items-center justify-between gap-3">
                <p className="text-body font-medium text-foreground">{row.label}</p>
                <div className="flex items-center gap-2">
                  <Button type="button" size="icon" variant="outline" className="h-9 w-9" aria-label={`Fewer ${row.label.toLowerCase()}`}
                    disabled={row.current <= row.min} onClick={() => row.step(row.current - 1)}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-5 text-center text-body tabular-nums" aria-live="polite">{row.current}</span>
                  <Button type="button" size="icon" variant="outline" className="h-9 w-9" aria-label={`More ${row.label.toLowerCase()}`}
                    disabled={row.current >= row.max} onClick={() => row.step(row.current + 1)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {value.childAges.map((age, index) => (
              <label key={index} className="flex items-center justify-between gap-3 text-body text-foreground">
                Child {index + 1} age
                <select value={age === NO_AGE ? "" : age} aria-label={`Child ${index + 1} age`}
                  onChange={event => set({ childAges: value.childAges.map((current, position) => (position === index ? Number(event.target.value) : current)) })}
                  className="h-9 w-20 rounded-md border border-border bg-card px-2 text-body">
                  <option value="" disabled>Age</option>
                  {Array.from({ length: 18 }, (_, years) => <option key={years} value={years}>{years}</option>)}
                </select>
              </label>
            ))}
            <Button type="button" size="sm" className="mt-1" onClick={() => setOpen(false)}>Done</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
