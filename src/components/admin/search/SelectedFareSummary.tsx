import { format } from "date-fns";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatMoney } from "@/lib/admin-bookings/format";
import { airlineLabel, formatDuration, stopsLabel } from "@/lib/admin-search/flights";
import { travelerCount, type HoldDraft } from "@/lib/admin-search/hold";
import { day, time, useCountdown } from "./FlightsSearch";

// "Selected fare" (mockup flights-hold-form). Every amount is the gateway's; supplier cost,
// margin and provider appear only when the gateway sends them to this viewer.
export function SelectedFareSummary({ draft }: { draft: HoldDraft }) {
  const { quote } = draft;
  const countdown = useCountdown(quote.expires_at);
  const providers = [...new Set(draft.picks.map(pick => pick.fare.supplier).filter((name): name is string => Boolean(name)))];
  const adminOnly = providers.length > 0 || quote.supplier_total || quote.margin;
  const count = travelerCount(quote);
  return (
    <section aria-label="Selected fare" className="flex flex-col gap-3 rounded-lg border border-border bg-card px-card py-3.5 shadow-card lg:sticky lg:top-4">
      <h2 className="text-section font-semibold text-foreground">Selected fare</h2>
      {draft.picks.map(({ journey, flight }) => (
        <div key={journey.direction} className="flex min-w-0 flex-col gap-1">
          <p className="min-w-0 truncate text-body text-foreground" title={airlineLabel(flight)}>
            <span className="font-semibold">{airlineLabel(flight)}</span> <span className="text-muted-foreground">{flight.flight_number ?? ""}</span>
          </p>
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
            <div><p className="text-section font-semibold tabular-nums text-foreground">{time(flight.departure_local)}</p><p className="text-label text-muted-foreground">{journey.origin}</p></div>
            <p className="truncate text-center text-label text-muted-foreground">{[formatDuration(flight.duration_minutes), stopsLabel(flight)].filter(Boolean).join(" · ") || "—"}</p>
            <div className="text-right"><p className="text-section font-semibold tabular-nums text-foreground">{time(flight.arrival_local)}</p><p className="text-label text-muted-foreground">{journey.destination}</p></div>
          </div>
        </div>
      ))}
      <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] text-body">
        {([
          ["Date", draft.picks.map(pick => day(pick.flight.departure_local)).filter(Boolean).join(" · ") || "—"],
          ["Fare", draft.picks.map(pick => pick.fare.name).join(" · ")],
          ["Baggage", draft.picks.map(pick => pick.fare.baggage ?? "Baggage info not available").join(" · ")],
          ...(quote.new_price_per_adult ? [["Price per adult", formatMoney(quote.new_price_per_adult)] as [string, string]] : []),
          ["Travelers", String(count)],
        ] as [string, string][]).map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="border-t border-border py-2 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 truncate border-t border-border py-2 text-right font-semibold text-foreground" title={value}>{value}</dd>
          </div>
        ))}
        <dt className="border-t border-border py-2 text-muted-foreground">Total</dt>
        <dd className="border-t border-border py-2 text-right text-page-title font-bold tabular-nums text-foreground">{formatMoney(quote.new_total)}</dd>
      </dl>
      <div className="flex flex-wrap gap-1.5">
        <StatusBadge severity="fine">Fare confirmed at {format(new Date(draft.confirmedAt), "HH:mm")}</StatusBadge>
        {countdown && <StatusBadge severity={countdown.seconds > 0 ? "action" : "critical"}>{countdown.seconds > 0 ? `Valid for ${countdown.label}` : "Checking the fare again"}</StatusBadge>}
      </div>
      <p className="text-label text-muted-foreground">When the timer runs out the fare is checked again automatically. If the price changed, you are asked before continuing.</p>
      {adminOnly && (
        <div className="flex flex-col gap-0.5 rounded-md border border-dashed border-border px-2.5 py-2 text-label text-muted-foreground">
          <p className="font-semibold text-foreground">Admin only</p>
          {providers.length > 0 && <p>Provider: {providers.join(", ")}</p>}
          {(quote.supplier_total || quote.margin) && (
            <p>{[quote.supplier_total && `Supplier cost ${formatMoney(quote.supplier_total)}`, quote.margin && `Margin ${formatMoney(quote.margin)}`].filter(Boolean).join(" · ")}</p>
          )}
          <p>(only with the cost and margin permission)</p>
        </div>
      )}
    </section>
  );
}
