import { todayIso } from "@/lib/admin-search/date-display";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { cn } from "@/lib/utils";
import { GatewayError, gatewayAssetUrl } from "@/lib/gateway/client";
import { formatMoney } from "@/lib/admin-bookings/format";
import {
  fetchGroupInventory, inventoryOptions, isCompleteSearch, parseGroupSearch, resultRows, searchGroupFares, writeGroupSearch,
  type GroupSearch,
} from "@/lib/admin-search/group-ticketing";

const ANY = "any";
const errorMessage = (error: unknown) =>
  error instanceof GatewayError ? error.message : "Group fares couldn't be loaded. Try again in a few minutes.";

/** Logo served by the gateway (never the supplier's host); hidden if it fails to load. */
function AirlineLogo({ path }: { path?: string | null }) {
  const [failed, setFailed] = useState(false);
  const src = gatewayAssetUrl(path);
  if (!src || failed) return null;
  return <img src={src} alt="" width={24} height={24} loading="lazy" onError={() => setFailed(true)} className="h-6 w-6 shrink-0 rounded-sm border border-border bg-card object-contain" />;
}

function departure(value?: string | null) {
  if (!value) return "—";
  const date = parseISO(value);
  return Number.isFinite(date.getTime()) ? format(date, "d MMM yyyy") : value;
}

// Search > Group Ticketing (spec 6, mockup search-group-ticketing), on the gateway's real
// group inventory. Hidden until the gateway provides them (docs/backend-todo.md): the
// Available providers, Search expiry and Quotes pending cards; Children and Infants
// (the search takes adults only, so the price is per adult); Source (owned or supplier);
// Hold rule; Book, Hold seats and Quote. Price is the gateway's selling price only.
export function GroupTicketingSearch() {
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
          {/* One line like the public site's group form when wide enough (theme.css, .admin-search-fields):
              From and To (limited to the available sectors) with the round swap, Departure Date and the
              search button. Narrower: From/To on their own row, the rest below. */}
          <div className="admin-search-fields" data-fields="group">
            <div className="admin-search-route min-w-0">
              <RouteRow
                from={<SectorAirportSelect id="group-from" label="From" placeholder="Origin" icon="departure" codes={airports("from")} value={draft.from}
                  onChange={from => setDraft({ ...draft, from })} />}
                to={<SectorAirportSelect id="group-to" label="To" placeholder="Destination" icon="arrival" codes={airports("to")} value={draft.to}
                  onChange={to => setDraft({ ...draft, to })} />}
                onSwap={() => setDraft({ ...draft, from: draft.to, to: draft.from })}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <FieldLabel htmlFor="group-date">Departure Date</FieldLabel>
              <DayFirstDateField id="group-date" variant="search" calendarTitle="Select departure date" min={todayIso()} value={draft.date} onChange={date => setDraft({ ...draft, date })} />
            </div>
            <SearchSubmitButton label="Search group fares" disabled={!canSearch} />
          </div>
        </form>
      </section>

      {isCompleteSearch(search) && (
        <section aria-label="Results" className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
          <h2 className="text-section font-semibold text-foreground">Results</h2>
          {results.error ? (
            <DashboardErrorNotice message={errorMessage(results.error)} />
          ) : results.isPending ? (
            <div className="flex flex-col gap-1.5" aria-busy="true" aria-label="Loading results">
              {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-table-row rounded-sm" />)}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-2 text-body text-muted-foreground">No group fares match this search.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] border-collapse text-table">
                <thead>
                  <tr className="bg-muted text-left">
                    {["Departure", "Airline", "Seats left", "Baggage", "Price per passenger"].map(column => (
                      <th key={column} scope="col" className="h-table-header px-2.5 font-semibold text-foreground">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} className="border-b border-border last:border-b-0">
                      <td className="px-2.5 py-2 align-top">
                        <span className="block whitespace-nowrap tabular-nums text-foreground">
                          {departure(row.departureDate)}{row.departureTime ? ` ${row.departureTime}` : ""}
                        </span>
                        <span className="block text-label text-muted-foreground">{row.sector ?? "—"}</span>
                      </td>
                      <td className="max-w-[16rem] px-2.5 py-2 align-top">
                        <span className="flex min-w-0 items-center gap-2">
                          <AirlineLogo path={row.logoUrl} />
                          <span className="truncate font-semibold text-foreground" title={row.airline ?? undefined}>{row.airline ?? "—"}</span>
                        </span>
                      </td>
                      <td className="px-2.5 py-2 align-top tabular-nums text-foreground">{row.seatsLeft ?? "—"}</td>
                      <td className="max-w-[14rem] px-2.5 py-2 align-top">
                        <span className="block truncate text-foreground" title={row.baggage ?? undefined}>{row.baggage ?? "Baggage info not available"}</span>
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2 align-top tabular-nums text-foreground">
                        {row.price ? <>Adult <span className="font-semibold">{formatMoney(row.price)}</span></> : "Price not available"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
