import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { DashboardErrorNotice } from "@/components/admin/dashboard/DashboardStates";
import { GatewayError } from "@/lib/gateway/client";
import { formatMoney } from "@/lib/admin-bookings/format";
import { cn } from "@/lib/utils";
import { PASSENGER_LABEL, airlineLabel, parseFlightSearch, repriceFlights, type FlightSearch, type FlightSearchView, type RepriceView } from "@/lib/admin-search/flights";
import { HOLD_PATH, fareCheckFailure, type FareCheckState, type HoldDraft, type HoldMode } from "@/lib/admin-search/hold";
import { FareCheckDialog } from "./FareCheckDialog";
import { FlightsSearch, REASONS, WithReason, type FareSelection } from "./FlightsSearch";

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

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const [check, setCheck] = useState<{ state: FareCheckState; mode: HoldMode; search: FlightSearchView; picks: Selections } | null>(null);
  const checking = useRef<AbortController | null>(null);
  useEffect(() => () => checking.current?.abort(), []);

  const picksFor = (search: FlightSearchView) => (selected.searchId === search.search_id ? selected.picks : {});
  const directionsOf = (search: FlightSearchView) => search.journeys.map(journey => journey.direction);

  const openHold = (mode: HoldMode, search: FlightSearchView, picks: Selections, quote: RepriceView, acceptPriceChange: boolean) => {
    const draft: HoldDraft = {
      mode, searchId: search.search_id, request: parseFlightSearch(params), quote, acceptPriceChange,
      picks: directionsOf(search).map(direction => picks[direction]!), confirmedAt: new Date().toISOString(),
    };
    navigate(`${HOLD_PATH}?mode=${mode}`, { state: draft });
  };

  /** Fare check (mockup flights-fare-check): reprice; unchanged opens the booking page, anything else shows a dialog. */
  const startCheck = async (mode: HoldMode, search: FlightSearchView, picks: Selections) => {
    checking.current?.abort();
    const controller = new AbortController();
    checking.current = controller;
    setCheck({ state: { kind: "checking" }, mode, search, picks });
    try {
      const quote = await repriceFlights(search.search_id, directionsOf(search).map(direction => picks[direction]!.fare.id), { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (quote.price_changed) setCheck({ state: { kind: "changed", quote }, mode, search, picks });
      else {
        setCheck(null);
        openHold(mode, search, picks, quote, false);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setCheck({ state: fareCheckFailure(error), mode, search, picks });
    }
  };

  /** Book or Hold on a fare row: select it; once every direction has a fare, check the fare. */
  const bookOrHold = (mode: HoldMode, search: FlightSearchView, pick: FareSelection) => {
    reprice.reset();
    const picks = { ...picksFor(search), [pick.journey.direction]: pick };
    setSelected({ searchId: search.search_id, picks });
    if (directionsOf(search).every(direction => picks[direction])) void startCheck(mode, search, picks);
  };
  /** Revalidate on a fare row: select it; once every direction has a fare, reprice them together. */
  const revalidate = (search: FlightSearchView, pick: FareSelection) => {
    reprice.reset();
    const picks = { ...picksFor(search), [pick.journey.direction]: pick };
    setSelected({ searchId: search.search_id, picks });
    const directions = search.journeys.map(journey => journey.direction);
    if (directions.every(direction => picks[direction])) {
      reprice.mutate({ searchId: search.search_id, fareIds: directions.map(direction => picks[direction]!.fare.id) });
    }
  };

  const closeCheck = () => {
    checking.current?.abort();
    setCheck(null);
  };
  return (
    <>
    <FareCheckDialog
      state={check?.state ?? null}
      onCancel={closeCheck}
      onBack={closeCheck}
      onContinue={() => {
        if (check?.state.kind !== "changed") return;
        const { mode, search, picks, state } = check;
        setCheck(null);
        openHold(mode, search, picks, state.quote, true);
      }}
      onTryAgain={() => check && void startCheck(check.mode, check.search, check.picks)}
      onSearchAgain={() => {
        closeCheck();
        setSelected({ searchId: "", picks: {} });
        void queryClient.invalidateQueries({ queryKey: ["admin-search", "flights"] });
      }}
      onEditSearch={() => {
        closeCheck();
        const from = document.getElementById("flight-from");
        from?.scrollIntoView({ block: "center" });
        from?.focus();
      }}
    />
    <FlightsSearch
      actionNotes={[`Quote: ${REASONS.quote}`, `Fare rules: ${REASONS.fareRules}`]}
      renderFareAction={(pick, search) => {
        const isSelected = picksFor(search)[pick.journey.direction]?.fare.id === pick.fare.id;
        const label = `${pick.flight.flight_number ?? ""} ${pick.fare.name}`.trim();
        const disabledButton = (name: string, reason: string) => (
          <WithReason reason={reason}>
            {describedBy => (
              <Button type="button" size="sm" variant={name === "Book" ? "primary" : "outline"} disabled aria-describedby={describedBy}
                aria-label={`${name} ${label}`}>
                {name}
              </Button>
            )}
          </WithReason>
        );
        const priced = Boolean(pick.fare.selling_price);
        return (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap gap-1.5">
              {(["book", "hold"] as const).map(mode => (
                <Button key={mode} type="button" size="sm" variant={mode === "book" ? "primary" : "outline"} disabled={!priced}
                  title={priced ? undefined : "Price not available"} aria-label={`${mode === "book" ? "Book" : "Hold"} ${label}`}
                  onClick={() => bookOrHold(mode, search, pick)}>
                  {mode === "book" ? "Book" : "Hold"}
                </Button>
              ))}
              {disabledButton("Quote", REASONS.quote)}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <WithReason reason={REASONS.fareRules}>
                {describedBy => (
                  <button type="button" disabled aria-describedby={describedBy} aria-label={`Fare rules ${label}`}
                    className="cursor-not-allowed text-body font-medium text-muted-foreground">Fare rules</button>
                )}
              </WithReason>
              <button
                type="button"
                aria-label={`Revalidate ${label}`}
                aria-pressed={isSelected}
                disabled={!pick.fare.selling_price || (isSelected && reprice.isPending)}
                title={pick.fare.selling_price ? undefined : "Price not available"}
                onClick={() => revalidate(search, pick)}
                className={cn(
                  "text-body font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:text-muted-foreground",
                  isSelected ? "text-foreground underline" : "text-teal hover:underline",
                )}
              >
                {isSelected && reprice.isPending ? "Revalidating…" : isSelected ? "Selected" : "Revalidate"}
              </button>
            </div>
          </div>
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
    </>
  );
}

function SelectionPanel({ picks, directions, ready, pending, error, quote, onReprice, hold }: {
  picks: Selections; directions: ("outbound" | "return")[]; ready: boolean; pending: boolean; error: unknown;
  quote?: RepriceView; onReprice: () => void; hold: React.ReactNode;
}) {
  const secondsLeft = useSecondsLeft(quote?.expires_at);
  const expired = Boolean(quote) && secondsLeft === 0;
  return (
    <section aria-label="Selected fare" className="flex flex-col gap-3 rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
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
      {!quote && pending && <p className="text-body text-muted-foreground" aria-live="polite">Revalidating…</p>}
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
            <div><Button type="button" variant="outline" onClick={onReprice}>Revalidate again</Button></div>
          ) : hold}
        </div>
      )}
    </section>
  );
}
