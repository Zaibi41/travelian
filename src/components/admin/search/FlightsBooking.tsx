import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardErrorNotice } from "@/components/admin/dashboard/DashboardStates";
import { GatewayError } from "@/lib/gateway/client";
import { formatMoney } from "@/lib/admin-bookings/format";
import { PASSENGER_LABEL, airlineLabel, repriceFlights, type FlightSearch, type FlightSearchView, type RepriceView } from "@/lib/admin-search/flights";
import { FlightsSearch, type FareSelection } from "./FlightsSearch";

type Selections = Partial<Record<"outbound" | "return", FareSelection>>;

const errorMessage = (error: unknown) =>
  error instanceof GatewayError ? error.message : "The fare couldn't be revalidated. Try again.";

function useSecondsLeft(expiresAt?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);
  return expiresAt ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000)) : 0;
}

/** Flights search plus fare selection and reprice (the total a user must confirm before a hold). */
export function FlightsBooking({ renderHold }: { renderHold?: (quote: RepriceView, request: FlightSearch, selections: Selections) => React.ReactNode }) {
  const [selected, setSelected] = useState<{ searchId: string; picks: Selections }>({ searchId: "", picks: {} });
  const reprice = useMutation({
    mutationFn: ({ searchId, fareIds }: { searchId: string; fareIds: string[] }) => repriceFlights(searchId, fareIds),
  });

  const picksFor = (search: FlightSearchView) => (selected.searchId === search.search_id ? selected.picks : {});
  const choose = (search: FlightSearchView, pick: FareSelection) => {
    reprice.reset();
    setSelected({ searchId: search.search_id, picks: { ...picksFor(search), [pick.journey.direction]: pick } });
  };

  return (
    <FlightsSearch
      renderFareAction={(pick, search) => {
        const isSelected = picksFor(search)[pick.journey.direction]?.fare.id === pick.fare.id;
        return (
          <Button
            type="button"
            size="sm"
            variant={isSelected ? "default" : "outline"}
            className="h-8 text-body"
            aria-pressed={isSelected}
            disabled={!pick.fare.selling_price}
            onClick={() => choose(search, pick)}
          >
            {isSelected ? "Selected" : "Select"}
          </Button>
        );
      }}
      renderBelow={(search, request) => {
        const picks = picksFor(search);
        const directions = search.journeys.map(journey => journey.direction);
        const ready = directions.length > 0 && directions.every(direction => picks[direction]);
        if (!Object.keys(picks).length) return null;
        return (
          <SelectionPanel
            picks={picks}
            directions={directions}
            ready={ready}
            pending={reprice.isPending}
            error={reprice.error}
            quote={reprice.data}
            onReprice={() => reprice.mutate({ searchId: search.search_id, fareIds: directions.map(direction => picks[direction]!.fare.id) })}
            hold={reprice.data && renderHold ? renderHold(reprice.data, request, picks) : null}
          />
        );
      }}
    />
  );
}

function SelectionPanel({ picks, directions, ready, pending, error, quote, onReprice, hold }: {
  picks: Selections; directions: ("outbound" | "return")[]; ready: boolean; pending: boolean; error: unknown;
  quote?: RepriceView; onReprice: () => void; hold: React.ReactNode;
}) {
  const secondsLeft = useSecondsLeft(quote?.expires_at);
  const expired = Boolean(quote) && secondsLeft === 0;
  return (
    <section aria-label="Selected fare" className="flex flex-col gap-3 rounded-lg border border-border bg-card px-card py-3.5 shadow-card">
      <h2 className="text-section font-semibold text-foreground">Selected fare</h2>
      <ul className="flex flex-col gap-1 text-body text-foreground">
        {directions.map(direction => {
          const pick = picks[direction];
          return (
            <li key={direction} className="min-w-0 truncate">
              <span className="font-semibold">{direction === "outbound" ? "Outbound" : "Return"}:</span>{" "}
              {pick ? `${airlineLabel(pick.flight)} ${pick.flight.flight_number ?? ""} · ${pick.fare.name}` : <span className="text-muted-foreground">choose a fare</span>}
            </li>
          );
        })}
      </ul>
      {!quote && (
        <div>
          <Button type="button" disabled={!ready || pending} onClick={onReprice} className="h-control bg-teal text-body text-teal-foreground hover:bg-teal/90">
            {pending ? "Revalidating…" : "Revalidate fare"}
          </Button>
        </div>
      )}
      {Boolean(error) && <DashboardErrorNotice message={errorMessage(error)} />}
      {quote && (
        <div className="flex flex-col gap-2.5">
          {quote.price_changed && (
            <p role="alert" className="flex items-start gap-2 rounded-md border border-status-action/40 bg-status-action-soft px-3 py-2 text-body text-status-action-text">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> The price changed since the search. Check the new total.
            </p>
          )}
          <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-body">
            {quote.passengers.map(passenger => (
              <div key={passenger.type} className="contents">
                <dt className="text-muted-foreground">{passenger.count} {PASSENGER_LABEL[passenger.type][passenger.count === 1 ? 0 : 1]} × {formatMoney(passenger.selling_each)}</dt>
                <dd className="text-right tabular-nums text-foreground">{formatMoney({ ...passenger.selling_each, amount_minor: passenger.selling_each.amount_minor * passenger.count })}</dd>
              </div>
            ))}
            <dt className="border-t border-border pt-1 font-semibold text-foreground">Total to confirm</dt>
            <dd className="border-t border-border pt-1 text-right text-section font-semibold tabular-nums text-foreground">{formatMoney(quote.selling_total)}</dd>
          </dl>
          <p className="text-label text-muted-foreground">
            {expired ? "This revalidated fare has expired. Revalidate again." : `Revalidated fare valid for ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}.`}
          </p>
          {expired ? (
            <div><Button type="button" variant="outline" className="h-control text-body" onClick={onReprice}>Revalidate again</Button></div>
          ) : hold}
        </div>
      )}
    </section>
  );
}
