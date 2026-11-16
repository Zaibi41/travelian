import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { TABLE } from "@/components/admin/ui/classes";
import { Skeleton } from "@/components/ui/skeleton";
import { bookingDetailPath } from "@/lib/admin-bookings/tabs";
import { GatewayError } from "@/lib/gateway/client";
import { fetchGroupDeparturesWithoutFinalPnr } from "@/lib/flight-operations/api";
import { cn } from "@/lib/utils";

/** Flight Operations: paid group bookings with no final PNR whose flight leaves within 48 hours, soonest first.
 *  Each row opens the booking (its Tickets tab takes the final PNR). No supplier names. */
export function GroupDeparturesPanel() {
  const list = useQuery({
    queryKey: ["flight-operations", "group-departures-without-final-pnr"],
    queryFn: ({ signal }) => fetchGroupDeparturesWithoutFinalPnr({ signal }),
    refetchInterval: 5 * 60_000, retry: 1,
  });
  const data = list.data;
  return (
    <section aria-label="Group departures without final PNR"
      className={cn("flex min-w-0 flex-col gap-2.5 rounded-xl border border-border border-l-[length:var(--status-stripe)] bg-card px-card py-3.5 shadow-card",
        data && data.total > 0 ? "border-l-status-critical" : "border-l-status-fine")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-section font-semibold text-foreground">Group departures without final PNR</h2>
        {data && (data.total > 0
          ? <StatusBadge severity="critical">{`${data.total} ${data.total === 1 ? "booking" : "bookings"}`}</StatusBadge>
          : <StatusBadge severity="fine">Fine</StatusBadge>)}
      </div>
      <p className="text-label text-muted-foreground">Paid group bookings departing within {data?.window_hours ?? 48} hours, soonest first.</p>
      {list.isPending ? (
        <Skeleton className="h-20 w-full rounded-md" aria-label="Loading group departures" />
      ) : list.error ? (
        <p role="alert" className="text-body text-status-critical-text">
          {list.error instanceof GatewayError ? list.error.message : "This list couldn't be loaded. Try again in a moment."}
        </p>
      ) : !data || data.items.length === 0 ? (
        <p className="text-body text-muted-foreground">No paid group booking departs within {data?.window_hours ?? 48} hours without a final PNR.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className={cn(TABLE.table, "min-w-[40rem]")}>
            <thead>
              <tr className={TABLE.headRow}>
                {["Departure", "Booking ID", "Route", "Flight", "Customer or agency"].map(column => <th key={column} scope="col" className={TABLE.th}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.items.map(item => {
                const flight = [item.airline_name, item.flight_number].filter(Boolean).join(" ");
                return (
                  <tr key={item.booking_id} className={TABLE.row}>
                    <td className={cn(TABLE.td, "whitespace-nowrap tabular-nums")}>{format(new Date(item.departure_at), "d MMM yyyy, HH:mm")}</td>
                    <td className={TABLE.td}>
                      <Link className="whitespace-nowrap font-semibold text-foreground hover:underline" to={bookingDetailPath(item.booking_id, "tickets")}>{item.booking_id}</Link>
                    </td>
                    <td className={cn(TABLE.td, "max-w-[12rem] truncate")} title={item.route ?? undefined}>{item.route ?? "—"}</td>
                    <td className={cn(TABLE.td, "max-w-[12rem] truncate")} title={flight || undefined}>{flight || "—"}</td>
                    <td className={cn(TABLE.td, "max-w-[16rem] truncate")} title={item.customer_or_agency ?? undefined}>{item.customer_or_agency ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
