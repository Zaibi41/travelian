import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { TABLE } from "@/components/admin/ui/classes";
import { Skeleton } from "@/components/ui/skeleton";
import { bookingDetailPath } from "@/lib/admin-bookings/tabs";
import { GatewayError } from "@/lib/gateway/client";
import { fetchGroupBookingsAwaitingFinalPnr } from "@/lib/flight-operations/api";
import { cn } from "@/lib/utils";

const notShown = (error: unknown) => error instanceof GatewayError && (error.kind === "not_found" || error.kind === "forbidden");

/** Dashboard (#13): every paid group booking still waiting for the supplier's final airline PNR (usually sent about
 *  24 hours before departure), soonest departure first. Each row opens the booking's Tickets tab, where staff record
 *  the final PNR and send it to the passenger. Ignores the date filter. Hidden when the gateway doesn't offer the list
 *  (not deployed yet) or the role may not see it. No supplier names. */
export function GroupFinalPnrTracker() {
  const list = useQuery({
    queryKey: ["dashboard", "group-bookings-awaiting-final-pnr"],
    queryFn: ({ signal }) => fetchGroupBookingsAwaitingFinalPnr({ signal }),
    refetchInterval: 5 * 60_000,
    // Not offered / not allowed won't change on a retry: hide at once. Anything else: one retry.
    retry: (failures, error) => !notShown(error) && failures < 1,
  });
  const hidden = notShown(list.error);
  if (hidden) return null;
  const data = list.data;
  return (
    <section aria-labelledby="dashboard-final-pnr"
      className={cn("flex min-w-0 flex-col gap-2.5 rounded-xl border border-border border-l-[length:var(--status-stripe)] bg-card px-card py-3.5 shadow-card",
        !data ? "" : data.departs_soon > 0 ? "border-l-status-critical" : data.total > 0 ? "border-l-status-action" : "border-l-status-fine")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="dashboard-final-pnr" className="text-section font-semibold text-foreground">Group bookings awaiting final PNR</h2>
        {data && (data.total > 0 ? (
          <span className="flex flex-wrap items-center gap-1.5">
            {data.departs_soon > 0 && <StatusBadge severity="critical">{`${data.departs_soon} due within ${data.window_hours} hours`}</StatusBadge>}
            <StatusBadge severity="action">{`${data.total} ${data.total === 1 ? "booking" : "bookings"}`}</StatusBadge>
          </span>
        ) : <StatusBadge severity="fine">Fine</StatusBadge>)}
      </div>
      <p className="text-label text-muted-foreground">Paid group bookings until the supplier sends the final airline PNR, soonest departure first.</p>
      {list.isPending ? (
        <Skeleton className="h-20 w-full rounded-md" aria-label="Loading group bookings awaiting final PNR" />
      ) : list.error ? (
        <p role="alert" className="text-body text-status-critical-text">
          {list.error instanceof GatewayError ? list.error.message : "This list couldn't be loaded. Try again in a moment."}
        </p>
      ) : !data || data.items.length === 0 ? (
        <p className="text-body text-muted-foreground">No paid group booking is waiting for its final PNR.</p>
      ) : (
        <div className="max-h-[24rem] overflow-auto">
          <table className={cn(TABLE.table, "min-w-[46rem]")}>
            <thead>
              <tr className={TABLE.headRow}>
                {["Departure", "Booking ID", "Route", "Flight", "Customer or agency", "Final PNR"].map(column => <th key={column} scope="col" className={TABLE.th}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.items.map(item => {
                const flight = [item.airline_name, item.flight_number].filter(Boolean).join(" ");
                return (
                  <tr key={item.booking_id} className={TABLE.row}>
                    <td className={cn(TABLE.td, "whitespace-nowrap tabular-nums")}>{item.departure_at ? format(new Date(item.departure_at), "d MMM yyyy, HH:mm") : "Not recorded"}</td>
                    <td className={TABLE.td}>
                      <Link className="whitespace-nowrap font-semibold text-foreground hover:underline" to={bookingDetailPath(item.booking_id, "tickets")}>{item.booking_id}</Link>
                    </td>
                    <td className={cn(TABLE.td, "max-w-[12rem] truncate")} title={item.route ?? undefined}>{item.route ?? "—"}</td>
                    <td className={cn(TABLE.td, "max-w-[12rem] truncate")} title={flight || undefined}>{flight || "—"}</td>
                    <td className={cn(TABLE.td, "max-w-[16rem] truncate")} title={item.customer_or_agency ?? undefined}>{item.customer_or_agency ?? "—"}</td>
                    <td className={cn(TABLE.td, "whitespace-nowrap")}>
                      {item.departs_soon ? <StatusBadge severity="critical">Due now</StatusBadge> : <StatusBadge severity="action">Awaiting</StatusBadge>}
                    </td>
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
