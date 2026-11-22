import { format } from "date-fns";
import { AirlineLogo } from "@/components/admin/ui/AirlineLogo";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { formatMoney } from "@/lib/admin-bookings/format";
import { airlineLabel, fareBaggage, formatDuration, stopsLabel } from "@/lib/admin-search/flights";
import { underBaggageLabel } from "@/lib/baggage";
import { travelerCount, type HoldDraft } from "@/lib/admin-search/hold";
import { day, time, useCountdown } from "./FlightsSearch";

// The Flights content of the shared fare panel (BookingHoldForm's FarePanel). Every amount is the
// gateway's; supplier cost, margin and provider appear only when the gateway sends them to this viewer.

/** The selected flights and the fare: date, fare name, baggage, price per adult, travelers and total. */
export function FlightFareDetails({ draft }: { draft: HoldDraft }) {
  const { quote } = draft;
  return (
    <>
      {draft.picks.map(({ journey, flight }) => (
        <div key={journey.direction} className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            {/* #88: the airline's logo (Travelian's logo file, else the IATA code badge), as on the search results. */}
            <AirlineLogo airline={airlineLabel(flight)} flightNumber={flight.flight_number ?? undefined} code={flight.airline_code} className="h-9 w-9 rounded-xl" />
            <p className="min-w-0 truncate text-body text-foreground" title={airlineLabel(flight)}>
              <span className="font-semibold">{airlineLabel(flight)}</span> <span className="text-muted-foreground">{flight.flight_number ?? ""}</span>
            </p>
          </div>
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
            <div><p className="text-section font-semibold tabular-nums text-foreground">{time(flight.departure_local)}</p><p className="text-label text-muted-foreground">{journey.origin}</p></div>
            <p className="truncate text-center text-label text-muted-foreground">{[formatDuration(flight.duration_minutes), stopsLabel(flight)].filter(Boolean).join(" · ") || "—"}</p>
            <div className="text-right"><p className="text-section font-semibold tabular-nums text-foreground">{time(flight.arrival_local)}</p><p className="text-label text-muted-foreground">{journey.destination}</p></div>
          </div>
        </div>
      ))}
      <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] text-label">
        {([
          ["Date", draft.picks.map(pick => day(pick.flight.departure_local)).filter(Boolean).join(" · ") || "—"],
          ["Fare", draft.picks.map(pick => pick.fare.name).join(" · ")],
          ["Baggage", draft.picks.map(pick => underBaggageLabel(fareBaggage(pick.fare).short)).join(" · ")],
          ...(quote.new_price_per_adult ? [["Price per adult", formatMoney(quote.new_price_per_adult)] as [string, string]] : []),
          ["Travelers", String(travelerCount(quote))],
        ] as [string, string][]).map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="border-t border-border py-2 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 truncate border-t border-border py-2 text-right font-medium text-foreground" title={value}>{value}</dd>
          </div>
        ))}
        <dt className="border-t border-border py-2 text-muted-foreground">Total</dt>
        <dd className="border-t border-border py-2 text-right text-page-title font-bold tabular-nums text-foreground">{formatMoney(quote.new_total)}</dd>
      </dl>
    </>
  );
}

/** "Fare confirmed at 10:05" and "Valid for 09:12"; the page checks the fare again when the timer ends. */
export function FareConfirmedTimer({ draft }: { draft: HoldDraft }) {
  const countdown = useCountdown(draft.quote.expires_at);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        <StatusBadge severity="fine">Fare confirmed at {format(new Date(draft.confirmedAt), "HH:mm")}</StatusBadge>
        {countdown && <StatusBadge severity={countdown.seconds > 0 ? "action" : "critical"}>{countdown.seconds > 0 ? `Valid for ${countdown.label}` : "Checking the fare again"}</StatusBadge>}
      </div>
      <p className="text-label text-muted-foreground">When the timer runs out the fare is checked again automatically. If the price changed, you are asked before continuing.</p>
    </div>
  );
}

/** Providers named on the picked fares (sent only with the supplier names permission). */
export const fareProviders = (draft: HoldDraft) =>
  [...new Set(draft.picks.map(pick => pick.fare.supplier).filter((name): name is string => Boolean(name)))];
