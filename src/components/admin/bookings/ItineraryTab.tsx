import { useAirports } from "@/hooks/use-airports";
import { TABLE } from "@/components/admin/ui/classes";
import { formatDay } from "@/lib/admin-search/date-display";
import type { BookingDetail } from "@/lib/admin-bookings/types";
import { cn } from "@/lib/utils";

// Booking detail > Itinerary (mockup booking-detail-itinerary): the flights as the gateway saved
// them when the booking was held. Columns as in the mockup; "Fare" instead of "Cabin" because the
// gateway records the fare name, not the cabin.
type Segment = NonNullable<BookingDetail["itinerary"]>[number];

const COLUMNS = ["Segment", "From", "To", "Departs", "Arrives", "Airline / flight", "Fare", "Baggage"];

/** "2026-11-19T00:25" -> "19 Nov 2026, 00:25" (local time at that airport, as the supplier gives it). */
function localTime(value?: string | null) {
  if (!value || value.length < 16) return "—";
  return `${formatDay(value.slice(0, 10))}, ${value.slice(11, 16)}`;
}

function stopsText(segment: Segment) {
  if (segment.stops === 0) return "Non-stop";
  if (!segment.stops) return null;
  const via = segment.stop_cities.length ? ` via ${segment.stop_cities.join(", ")}` : "";
  return `${segment.stops} ${segment.stops === 1 ? "stop" : "stops"}${via}`;
}

function duration(minutes?: number | null) {
  if (!minutes) return null;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

export function ItineraryTab({ segments }: { segments: Segment[] }) {
  const airports = useAirports();
  const place = (code: string) => {
    const airport = airports?.byCode.get(code);
    return airport ? `${code} - ${airport.city}` : code;
  };
  return (
    <section aria-label="Itinerary" className={cn(TABLE.wrap, "px-card py-3.5")}>
      <table className={cn(TABLE.table, "min-w-[56rem]")}>
        <thead>
          <tr className={TABLE.headRow}>{COLUMNS.map(column => <th key={column} scope="col" className={TABLE.th}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {segments.map((segment, index) => {
            const airline = [segment.airline_name ?? segment.airline_code, segment.flight_number].filter(Boolean).join(" · ") || "—";
            return (
              <tr key={index} className={TABLE.row}>
                <td className={cn(TABLE.td, "align-top")}>
                  <span className="block font-semibold text-foreground">{segment.direction === "return" ? "Return" : "Outbound"}</span>
                  <span className="block text-label text-muted-foreground">{[stopsText(segment), duration(segment.duration_minutes)].filter(Boolean).join(" · ")}</span>
                </td>
                <td className={cn(TABLE.td, "align-top whitespace-nowrap")}>{place(segment.origin)}</td>
                <td className={cn(TABLE.td, "align-top whitespace-nowrap")}>{place(segment.destination)}</td>
                <td className={cn(TABLE.td, "align-top whitespace-nowrap tabular-nums")}>{localTime(segment.departure_local)}</td>
                <td className={cn(TABLE.td, "align-top whitespace-nowrap tabular-nums")}>{localTime(segment.arrival_local)}</td>
                <td className={cn(TABLE.td, "align-top max-w-[16rem]")}><span className="block truncate" title={airline}>{airline}</span></td>
                <td className={cn(TABLE.td, "align-top")}>{segment.fare_name ?? "—"}</td>
                <td className={cn(TABLE.td, "align-top max-w-[12rem]")}>
                  <span className="block truncate" title={segment.baggage ?? undefined}>{segment.baggage || "Baggage info not available"}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
