import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/admin-bookings/format";
import { bookingDetailPath } from "@/lib/admin-bookings/tabs";
import { fetchRecentActivity } from "@/lib/admin-dashboard/api";
import { GatewayError } from "@/lib/gateway/client";

export const ACTIVITY_LIMIT = 8;
const notShown = (error: unknown) => error instanceof GatewayError && (error.kind === "not_found" || error.kind === "forbidden");

function who(role?: string | null, userId?: string | null) {
  if (!userId) return "System";
  const name = role ? role.replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()) : "User";
  return `${name} · ${userId.slice(0, 8)}`;
}

/** Dashboard Recent activity (gateway#87): the latest booking events (what, which booking, who, when), newest first; each row
 *  opens the booking's Audit tab. Ignores the filters. Hidden when the gateway doesn't offer it or the role may not see it. */
export function RecentActivityPanel() {
  const list = useQuery({
    queryKey: ["admin-dashboard", "recent-activity"],
    queryFn: ({ signal }) => fetchRecentActivity(ACTIVITY_LIMIT, { signal }),
    staleTime: 60_000, refetchInterval: 60_000, refetchOnWindowFocus: true,
    retry: (failures, error) => !notShown(error) && failures < 1,
  });
  if (notShown(list.error)) return null;
  return (
    <section aria-labelledby="dashboard-activity" className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
      <h2 id="dashboard-activity" className="text-section font-semibold text-foreground">Recent activity</h2>
      {list.isPending ? (
        <div className="flex flex-col gap-1.5" aria-busy="true" aria-label="Loading recent activity">
          {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-table-row rounded-sm" />)}
        </div>
      ) : list.error || !list.data ? (
        <p role="alert" className="text-body text-muted-foreground">{list.error instanceof GatewayError ? list.error.message : "Recent activity couldn't be loaded. It will load when the service responds."}</p>
      ) : list.data.items.length === 0 ? (
        <p className="py-2 text-body text-muted-foreground">No booking activity yet.</p>
      ) : (
        <ol className="flex flex-col divide-y divide-border" aria-label="Latest booking events">
          {list.data.items.map((item, index) => (
            <li key={`${item.booking_id}-${item.at}-${index}`} className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-1.5 text-body">
              <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                <span className="font-medium text-foreground">{item.label}</span>
                <Link to={bookingDetailPath(item.booking_id, "audit")} title={item.booking_id}
                  className="max-w-[14rem] truncate rounded-sm font-semibold text-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {item.booking_id}
                </Link>
              </span>
              <span className="shrink-0 text-label text-muted-foreground"><span className="tabular-nums">{formatDateTime(item.at)}</span> · {who(item.actor_role, item.actor_user_id)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
