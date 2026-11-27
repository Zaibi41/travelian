import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Share2 } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { DashboardErrorNotice } from "@/components/admin/dashboard/DashboardStates";
import { GatewayError } from "@/lib/gateway/client";
import { formatMoney } from "@/lib/admin-bookings/format";
import {
  PASSENGER_LABEL, airlineLabel, journeyKey, journeyLabel, parseFlightSearch, repriceFlights,
  type FlightSearch, type FlightSearchView, type JourneyView, type RepriceView,
} from "@/lib/admin-search/flights";
import { HOLD_PATH, fareCheckFailure, type FareCheckState, type HoldDraft, type HoldMode } from "@/lib/admin-search/hold";
import { flightShareMessage, whatsappShareUrl } from "@/lib/admin-search/share";
import { useAirports } from "@/hooks/use-airports";
import { FareCheckDialog } from "./FareCheckDialog";
import { FlightsSearch, type FareSelection } from "./FlightsSearch";

/** The chosen fare per journey (journeyKey: outbound, return, or multi-city's leg-1, leg-2, ...). */
type Selections = Partial<Record<string, FareSelection>>;

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
  const request = parseFlightSearch(params);
  const airports = useAirports();
  const [check, setCheck] = useState<{ state: FareCheckState; mode: HoldMode; search: FlightSearchView; picks: Selections } | null>(null);
  const checking = useRef<AbortController | null>(null);
  useEffect(() => () => checking.current?.abort(), []);

  const picksFor = (search: FlightSearchView) => (selected.searchId === search.search_id ? selected.picks : {});
  const directionsOf = (search: FlightSearchView) => search.journeys.map(journeyKey);

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

  /** Book (or Request to book) on a fare row: select it; once every direction has a fare, check the fare. */
  const bookOrHold = (mode: HoldMode, search: FlightSearchView, pick: FareSelection) => {
    reprice.reset();
    const picks = { ...picksFor(search), [journeyKey(pick.journey)]: pick };
    setSelected({ searchId: search.search_id, picks });
    if (directionsOf(search).every(direction => picks[direction])) void startCheck(mode, search, picks);
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
      renderFareAction={(pick, search) => {
        const label = `${pick.flight.flight_number ?? ""} ${pick.fare.name}`.trim();
        const priced = Boolean(pick.fare.selling_price);
        const share = whatsappShareUrl(flightShareMessage(pick, request, airports));
        return (
          // One Actions cell, right-aligned. Issue 112: Book (no Hold button; the hold flow stays for the Book path and
          // existing links) and Share on WhatsApp. Restricted airlines (D32) stay "Request to book": the gateway
          // refuses a supplier hold for them, so a Book button there could not book.
          <div className="flex flex-wrap justify-end gap-1.5">
            {pick.fare.booking_mode === "request" ? (
              <Button type="button" size="sm" variant="primary" disabled={!priced} title="This airline is booked by Travelian's team: send a request"
                aria-label={`Request to book ${label}`} onClick={() => bookOrHold("request", search, pick)}>
                Request to book
              </Button>
            ) : (
              <Button type="button" size="sm" variant="primary" disabled={!priced} title={priced ? undefined : "Price not available"}
                aria-label={`Book ${label}`} onClick={() => bookOrHold("book", search, pick)}>
                Book
              </Button>
            )}
            <Button asChild size="sm" variant="outline">
              <a href={share} target="_blank" rel="noopener noreferrer" aria-label={`Share ${label} on WhatsApp`} title="Send the flight details and price on WhatsApp">
                <Share2 className="h-3.5 w-3.5" aria-hidden="true" />Share
              </a>
            </Button>
          </div>
        );
      }}
      renderBelow={(search, request) => {
        const picks = picksFor(search);
        const directions = search.journeys.map(journeyKey);
        const ready = directions.length > 0 && directions.every(direction => picks[direction]);
        if (!Object.keys(picks).length) return null;
        return (
          <SelectionPanel
            picks={picks}
            journeys={search.journeys}
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

function SelectionPanel({ picks, journeys, pending, error, quote, onReprice, hold }: {
  picks: Selections; journeys: JourneyView[]; ready: boolean; pending: boolean; error: unknown;
  quote?: RepriceView; onReprice: () => void; hold: React.ReactNode;
}) {
  const secondsLeft = useSecondsLeft(quote?.expires_at);
  const expired = Boolean(quote) && secondsLeft === 0;
  return (
    <section aria-label="Selected fare" className="flex flex-col gap-3 rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
      <h2 className="text-section font-semibold text-foreground">Selected fare</h2>
      <ul className="flex flex-col gap-1 text-body text-foreground">
        {journeys.map(journey => {
          const pick = picks[journeyKey(journey)];
          return (
            <li key={journeyKey(journey)} className="min-w-0 truncate">
              <span className="font-semibold">{journeyLabel(journey)}:</span>{" "}
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
