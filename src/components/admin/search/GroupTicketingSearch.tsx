import { todayIso } from "@/lib/admin-search/date-display";
import { Fragment, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GroupFareCalendar, type CalendarDay } from "@/components/GroupFareCalendar";
import { useFareCalendars } from "@/hooks/use-flight-fares";
import { gatewayGet } from "@/lib/gateway/client";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Compass } from "lucide-react";
import { Input } from "@/components/admin/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardErrorNotice } from "@/components/admin/dashboard/DashboardStates";
import { LabeledSelect } from "@/components/admin/ui/LabeledSelect";
import { DayFirstDateField } from "@/components/admin/ui/DayFirstDateField";
import { FieldLabel, RouteRow, SEARCH_FIELD, SearchSubmitButton } from "@/components/admin/ui/search-form";
import { SectorAirportSelect } from "@/components/admin/ui/SectorAirportSelect";
import { Chip } from "@/components/admin/ui/feedback";
import { AirlineLogo } from "@/components/admin/ui/AirlineLogo";
import { underBaggageLabel } from "@/lib/baggage";
import { cn } from "@/lib/utils";
import { GatewayError, gatewayAssetUrl } from "@/lib/gateway/client";
import { GROUP_FARE_NOTICE, GROUP_FARE_REFUND } from "@/lib/group-fare-terms";
import { Notice } from "@/components/admin/ui/feedback";
import { Button } from "@/components/admin/ui/button";
import { formatMoney } from "@/lib/admin-bookings/format";
import { groupHoldFormPath } from "@/lib/admin-search/group-holds";
import {
  fetchGroupInventory, inventoryOptions, isCompleteSearch, parseGroupSearch, resultRows, searchGroupFares, writeGroupSearch,
  type GroupResultRow, type GroupSearch,
} from "@/lib/admin-search/group-ticketing";

const ANY = "any";
/** Shown under a disabled Hold seats when the gateway gave no reason of its own. */
const HOLD_OFF_REASON = "Holding isn't available for this provider";
const errorMessage = (error: unknown) =>
  error instanceof GatewayError ? error.message : "Group fares couldn't be loaded. Try again in a few minutes.";

/** Travelian's own logo file first, then the gateway-served logo (never the supplier's host), then the airline code. */
function GroupAirlineLogo({ row }: { row: GroupResultRow }) {
  return (
    <AirlineLogo
      airline={row.airline ?? ""}
      flightNumber={row.flightNumber ?? undefined}
      imageUrl={gatewayAssetUrl(row.logoUrl)}
      className="h-9 w-9 rounded-xl sm:h-10 sm:w-10"
    />
  );
}

/** " 06:40–10:05", " 06:40", or "" when the provider sent no time. */
function times(departs?: string | null, arrives?: string | null) {
  if (!departs) return "";
  return arrives ? ` ${departs}–${arrives}` : ` ${departs}`;
}

function departure(value?: string | null) {
  if (!value) return "—";
  const date = parseISO(value);
  return Number.isFinite(date.getTime()) ? format(date, "d MMM yyyy") : value;
}

// Search > Group Ticketing (spec 6; mockup PDF docs/2026-11-14 page 9), on the gateway's real
// group inventory (Skypass and Dhillu & Sahi). Hidden until the gateway provides them
// (docs/backend-todo.md): the Available providers, Search expiry and Quotes pending cards;
// Children and Infants (group fares are adults only); Hold rule; Book and Quote. The price is the
// listing's per-adult price with Travelian's markup. Hold seats opens the traveler details page
// with the fare and this search in the URL; it is off, with the reason, where the provider can't hold. The results scroll area is
// `relative` so the sr-only "Action" header stays inside it (an absolutely positioned element would
// otherwise widen the page at 390px).
export function GroupTicketingSearch() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const search = parseGroupSearch(params);
  const [draft, setDraft] = useState<GroupSearch>(search);
  const paramsKey = params.toString();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sync the form when the URL changes
  useEffect(() => setDraft(parseGroupSearch(params)), [paramsKey]);

  const inventory = useQuery({
    queryKey: ["admin-search", "group-inventory"],
    queryFn: ({ signal }) => fetchGroupInventory({ signal }),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const results = useQuery({
    queryKey: ["admin-search", "group-search", search.from, search.to, search.date, search.adults],
    queryFn: ({ signal }) => (isCompleteSearch(search) ? searchGroupFares(search, { signal }) : Promise.reject(new Error("incomplete"))),
    enabled: isCompleteSearch(search),
    staleTime: 60_000,
    retry: 1,
  });

  // B7: the fare calendar for the chosen sector (real supplier prices only, D33), and the same calendar for the sector
  // being chosen, inside the Departure Date popup (as on the website's group search). #55: no cache; each loads in the
  // background once From and To are set (debounced, a change aborts the old request) and is kept only while this
  // form shows that sector. When both are the same sector, one request serves both.
  const sectorChosen = Boolean(search.from && search.to);
  const draftSector = Boolean(draft.from && draft.to);
  const calendarKey = (from?: string, to?: string) => (from && to ? `${from}-${to}-${search.adults}` : null);
  const searchKey = calendarKey(search.from, search.to);
  const draftKey = calendarKey(draft.from, draft.to);
  const fareCalendar = useFareCalendars([searchKey, draftKey], (key, signal) => {
    const [origin, destination, adults] = key.split("-");
    return gatewayGet("/v1/group-ticketing/calendar", { origin, destination, adults: Number(adults) }, { signal }) as Promise<{ days: CalendarDay[] }>;
  });
  const calendar = fareCalendar(searchKey);
  const draftCalendar = fareCalendar(draftKey);

  const options = inventoryOptions(inventory.data?.data ?? []);
  const airports = (side: "from" | "to") => [...new Set(options.sectors.map(sector => sector[side]))].sort();
  // Suggested routes: real sectors only, the 4 with the most departures (inventoryOptions sorts by count).
  const suggested = options.sectors.slice(0, 4);
  const commit = (next: GroupSearch) => setParams(writeGroupSearch(params, next), { replace: true });
  const rows = results.data ? resultRows(results.data.data, search.airline) : [];
  const canSearch = isCompleteSearch(draft);

  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      <section aria-label="Search group fares" className="flex flex-col gap-3 rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
        {/* Row 1: Suggested routes (the 4 sectors with most departures), then Select available sector,
            Airline and Adults (moved up from the field row so that row matches the public site:
            From, swap, To, date, search). */}
        <div className="flex flex-wrap items-end gap-3">
          {inventory.error ? (
            <div className="min-w-0 flex-[1_1_20rem]"><DashboardErrorNotice message={errorMessage(inventory.error)} /></div>
          ) : (
            <>
              <div className="min-w-0 flex-[1_1_20rem]">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  {inventory.isPending && <Skeleton className="h-8 w-56 rounded-md" />}
                  {suggested.length > 0 && (
                    <>
                      <span className="flex items-center gap-1.5 whitespace-nowrap text-label font-medium text-muted-foreground">
                        <Compass className="h-4 w-4" aria-hidden="true" /> Suggested routes:
                      </span>
                      {suggested.map(sector => {
                        const selected = draft.from === sector.from && draft.to === sector.to;
                        return (
                          <Chip
                            key={`${sector.from}-${sector.to}`}
                            data-route-chip
                            pressed={selected}
                            onClick={() => setDraft({ ...draft, from: sector.from, to: sector.to })}
                          >
                            {sector.from} → {sector.to} <span className="font-normal opacity-80">({sector.count})</span>
                          </Chip>
                        );
                      })}
                    </>
                  )}
                  {inventory.data && options.sectors.length === 0 && (
                    <p className="text-body text-muted-foreground">No group sectors are available right now.</p>
                  )}
                </div>
              </div>
              <div className="w-full min-w-0 sm:w-56">
                <LabeledSelect
                  id="group-sector"
                  label="Select available sector"
                  value={draft.from && draft.to && options.sectors.some(sector => sector.from === draft.from && sector.to === draft.to) ? `${draft.from}-${draft.to}` : ANY}
                  options={[
                    { value: ANY, label: "All available sectors" },
                    ...options.sectors.map(sector => ({ value: `${sector.from}-${sector.to}`, label: `${sector.from} → ${sector.to} (${sector.count})` })),
                  ]}
                  onChange={value => {
                    const [from, to] = value === ANY ? [undefined, undefined] : value.split("-");
                    setDraft({ ...draft, from, to });
                  }}
                />
              </div>
            </>
          )}
          <div className="w-full min-w-0 sm:w-44">
            <LabeledSelect id="group-airline" label="Airline" value={draft.airline ?? ANY}
              options={[{ value: ANY, label: "All airlines" }, ...options.airlines.map(airline => ({ value: airline, label: airline }))]}
              onChange={value => setDraft({ ...draft, airline: value === ANY ? undefined : value })} />
          </div>
          <div className="flex w-full min-w-0 flex-col gap-1 sm:w-24">
            <FieldLabel htmlFor="group-adults">Adults</FieldLabel>
            <Input id="group-adults" form="group-search-form" type="number" min={1} max={9} value={draft.adults}
              onChange={event => setDraft({ ...draft, adults: Math.min(9, Math.max(1, Number(event.target.value) || 1)) })}
              className="bg-card" />
          </div>
        </div>

        <form
          id="group-search-form"
          className="admin-search-form flex min-w-0 flex-col gap-3"
          onSubmit={event => {
            event.preventDefault();
            if (canSearch) commit(draft);
          }}
        >
          {/* The same field row as Search > Flights (theme.css, .admin-search-row): From and To (limited to the
              available sectors) with the round swap, Departure Date and the search button. */}
          <div className="admin-search-row">
            <div data-size="route" className="min-w-0">
              <RouteRow
                from={<SectorAirportSelect id="group-from" label="From" placeholder="Origin" icon="departure" codes={airports("from")} value={draft.from}
                  onChange={from => setDraft({ ...draft, from })} />}
                to={<SectorAirportSelect id="group-to" label="To" placeholder="Destination" icon="arrival" codes={airports("to")} value={draft.to}
                  onChange={to => setDraft({ ...draft, to })} />}
                onSwap={() => setDraft({ ...draft, from: draft.to, to: draft.from })}
              />
            </div>
            <div data-size="date" className="flex min-w-0 flex-col gap-1">
              <FieldLabel htmlFor="group-date">Departure Date</FieldLabel>
              <DayFirstDateField id="group-date" variant="search" calendarTitle="Select departure date" min={todayIso()} value={draft.date} onChange={date => setDraft({ ...draft, date })}
                fares={draftSector ? draftCalendar : undefined} />
            </div>
            <div data-size="submit"><SearchSubmitButton label="Search group fares" disabled={!canSearch} /></div>
          </div>
        </form>
      </section>
      {sectorChosen && calendar.status === "ready" && (
        <GroupFareCalendar
          days={calendar.days}
          selected={search.date}
          caption={`Fare calendar · ${search.from} → ${search.to}`}
          onPick={date => commit({ ...search, date })}
        />
      )}

      {isCompleteSearch(search) && (
        <section aria-label="Results" className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
          <div>
            <h2 className="text-section font-semibold text-foreground">Results</h2>
            <p className="text-body text-muted-foreground">Prices are per adult, from the provider's listing.</p>
          </div>
          {results.error ? (
            <DashboardErrorNotice message={errorMessage(results.error)} />
          ) : results.isPending ? (
            <div className="flex flex-col gap-1.5" aria-busy="true" aria-label="Loading results">
              {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-table-row rounded-sm" />)}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-2 text-body text-muted-foreground">No group fares match this search.</p>
          ) : (
            <>
            <Notice tone="action">{GROUP_FARE_NOTICE}</Notice>
            {/* From 1024px the table fits the card; only phones and tablets scroll it sideways. */}
            <div className="relative max-lg:overflow-x-auto">
              <table className="w-full border-collapse text-table max-lg:min-w-[54rem]">
                <thead>
                  <tr className="bg-muted text-left">
                    {["Departure", "Airline", "Seats left", "Baggage", "Meal", "Refund", "Price per passenger"].map(column => (
                      <th key={column} scope="col" className="h-table-header px-2.5 font-semibold text-foreground">{column}</th>
                    ))}
                    <th scope="col" className="h-table-header px-2.5"><span className="sr-only">Action</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const back = row.returnLeg;
                    return (
                      <Fragment key={row.id}>
                      <tr className={cn("border-border", row.source ? "" : "border-b last:border-b-0")}>
                        <td className="px-2.5 py-2 align-top">
                          <span className="block whitespace-nowrap tabular-nums text-foreground">
                            {departure(row.departureDate)}{times(row.departureTime, row.arrivalTime)}
                          </span>
                          <span className="block text-label text-muted-foreground">{[row.sector ?? "—", back ? row.flightNumber : null].filter(Boolean).join(" · ")}</span>
                          {back && (
                            <span data-return-leg className="mt-1.5 block border-t border-border pt-1.5">
                              <span className="block whitespace-nowrap tabular-nums text-foreground">
                                Return {departure(back.departureDate)}{times(back.departureTime, back.arrivalTime)}
                              </span>
                              <span className="block text-label text-muted-foreground">{[back.route ?? "—", back.flightNumber].filter(Boolean).join(" · ")}</span>
                            </span>
                          )}
                        </td>
                        <td className="max-w-[16rem] px-2.5 py-2 align-top">
                          <span className="flex min-w-0 items-center gap-2">
                            <GroupAirlineLogo row={row} />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-foreground" title={row.airline ?? undefined}>{row.airline ?? "—"}</span>
                              {row.flightNumber && <span className="block truncate text-label text-muted-foreground">{row.flightNumber}{back?.flightNumber ? ` / ${back.flightNumber}` : ""}</span>}
                            </span>
                          </span>
                        </td>
                        <td className="px-2.5 py-2 align-top tabular-nums text-foreground">{row.seatsLeft ?? "—"}</td>
                        <td className="max-w-[12rem] px-2.5 py-2 align-top">
                          <span className={cn("block truncate", row.baggage.known ? "text-foreground" : "text-muted-foreground")} title={row.baggage.detail}>{underBaggageLabel(row.baggage.short)}</span>
                          {back && <span className="block truncate text-label text-muted-foreground" title={back.baggage.detail}>Return {back.baggage.known ? back.baggage.short : "baggage: check with airline"}</span>}
                        </td>
                        <td className="whitespace-nowrap px-2.5 py-2 align-top text-foreground">
                          {row.meal === "Yes" ? "Meal" : "No Meal"}
                        </td>
                        <td className="whitespace-nowrap px-2.5 py-2 align-top text-foreground">{GROUP_FARE_REFUND}</td>
                        <td className="whitespace-nowrap px-2.5 py-2 align-top tabular-nums">
                          {row.price ? <span className="font-semibold text-foreground">{formatMoney(row.price)}</span> : <span className="text-muted-foreground">Price not available</span>}
                        </td>
                        <td className="px-2.5 py-2 text-right align-top">
                          <Button type="button" variant="primary" size="sm" disabled={!row.canHold}
                            title={row.canHold ? undefined : row.holdUnavailableReason ?? HOLD_OFF_REASON}
                            aria-label={`Hold seats, ${row.airline ?? "group fare"} ${departure(row.departureDate)}`}
                            aria-describedby={row.canHold ? undefined : `hold-off-${row.id}`}
                            onClick={() => navigate(groupHoldFormPath(row.id, search))}>
                            Hold seats
                          </Button>
                          {!row.canHold && <span id={`hold-off-${row.id}`} className="mt-1 block max-w-[10rem] text-left text-table text-muted-foreground sm:ml-auto">{row.holdUnavailableReason ?? HOLD_OFF_REASON}</span>}
                        </td>
                      </tr>
                      {/* Supplier access only: the gateway leaves group_source out for everyone else. */}
                      {row.source && (
                        <tr className="border-b border-border last:border-b-0">
                          <td colSpan={8} className="max-w-0 px-2.5 pb-2 pt-0 text-label text-muted-foreground">
                            <span className="block truncate" title={row.source}>Source: {row.source}</span>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
