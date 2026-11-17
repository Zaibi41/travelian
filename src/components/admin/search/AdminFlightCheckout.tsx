import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { AirlineLogo } from "@/components/admin/ui/AirlineLogo";

interface Segment {
  flightNumber?: string | null;
  origin?: string | null;
  destination?: string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
}

function segmentsFrom(params: URLSearchParams): Segment[] {
  try {
    const value = JSON.parse(params.get("segments") || "[]");
    return Array.isArray(value) ? value.slice(0, 12) : [];
  } catch {
    return [];
  }
}

const text = (params: URLSearchParams, key: string) => (params.get(key) || "").slice(0, 120);

/** Admin checkout for the legacy flight search. It never reads or sends a price from
 *  the URL: the gateway must reprice the selected fare, and booking stays blocked until
 *  it can (docs/backend-todo.md, Search). Logos come from Travelian's own files. */
export function AdminFlightCheckout({ params }: { params: URLSearchParams }) {
  const airline = text(params, "airline");
  const flightNo = text(params, "flightNo");
  const travelers = ([
    ["Adult", "Adults", Number(params.get("adults") || 1)],
    ["Child", "Children", Number(params.get("children") || 0)],
    ["Infant", "Infants", Number(params.get("infants") || 0)],
  ] as const)
    .filter(([, , count]) => Number.isInteger(count) && count > 0 && count < 10)
    .map(([one, many, count]) => `${count} ${count === 1 ? one : many}`)
    .join(", ");
  const rows: [string, string][] = [
    ["Airline", [airline, flightNo].filter(Boolean).join(" · ") || "—"],
    ["Route", [text(params, "from"), text(params, "to")].filter(Boolean).join(" → ") || "—"],
    ["Departure", text(params, "date") || "—"],
    ...(params.get("return") ? [["Return", text(params, "return")] as [string, string]] : []),
    ["Cabin", text(params, "cabin") || "—"],
    ...(params.get("fare") ? [["Fare", text(params, "fare")] as [string, string]] : []),
    ["Travelers", travelers || "1 Adult"],
  ];
  const segments = segmentsFrom(params);

  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      <h1 className="font-display text-page-title font-bold text-foreground">Flight booking</h1>
      <div role="status" className="flex items-start gap-2.5 rounded-lg border border-status-action/40 bg-status-action-soft px-card py-3 text-body text-status-action-text">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          <span className="font-semibold">Booking is blocked.</span> The gateway can't reprice this fare yet, so no price is shown
          and no booking can be made. A fare must be repriced before any booking.
        </p>
      </div>
      <section aria-label="Selected flight" className="flex flex-col gap-3 rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
        <div className="flex min-w-0 items-center gap-2.5">
          <AirlineLogo airline={airline} flightNumber={flightNo} className="h-8 w-8 rounded-md" />
          <h2 className="min-w-0 truncate text-section font-semibold text-foreground" title={airline}>{airline || "Selected flight"}</h2>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)]">
          {rows.map(([name, value]) => (
            <div key={name} className="contents">
              <dt className="border-b border-border bg-muted px-2.5 py-2 text-body font-semibold text-foreground">{name}</dt>
              <dd className="min-w-0 truncate border-b border-border px-2.5 py-2 text-body text-foreground" title={value}>{value}</dd>
            </div>
          ))}
        </dl>
        {segments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-table">
              <thead>
                <tr className="bg-muted text-left">
                  {["Flight", "From", "To", "Departs", "Arrives"].map(column => (
                    <th key={column} scope="col" className="h-table-header px-2.5 font-semibold text-foreground">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {segments.map((segment, index) => (
                  <tr key={index} className="border-b border-border last:border-b-0">
                    {[segment.flightNumber, segment.origin, segment.destination, segment.departureTime, segment.arrivalTime].map((value, cell) => (
                      <td key={cell} className="h-table-row whitespace-nowrap px-2.5 text-foreground">{value ? String(value).slice(0, 40) : "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <div className="flex flex-wrap gap-2">
        <Button disabled>Book flight</Button>
        <Button asChild variant="outline"><Link to="/admin/search?tab=flights">Back to search</Link></Button>
      </div>
    </div>
  );
}
