import { StatusKpiCard } from "@/components/admin/StatusKpiCard";
import { formatCount } from "@/lib/admin-dashboard/format";
import { needsActionLinks } from "@/lib/admin-dashboard/links";
import { severityForCount } from "@/lib/admin-dashboard/severity";
import type { DashboardQuery, NeedsAction } from "@/lib/admin-dashboard/types";
import { DashboardSection } from "./DashboardSection";
import { CardGridSkeleton } from "./DashboardStates";

// Unknown issuance (gateway#85): a real zero shows the green fine stripe; any other number is critical (a ticket may exist).
export function NeedsActionSection({ data, loading, query }: { data?: NeedsAction; loading: boolean; query: DashboardQuery }) {
  const links = needsActionLinks(query);
  return (
    <DashboardSection id="dashboard-needs-action" title="Bookings needing action">
      {loading || !data ? (
        <CardGridSkeleton count={4} className="grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-4" />
      ) : (
        <div className="grid grid-cols-1 gap-card-gap sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-4">
          <StatusKpiCard label="Pending issuance" value={formatCount(data.pending_issuance)} severity={severityForCount(data.pending_issuance, "action")} to={links.pendingIssuance} />
          <StatusKpiCard label="Payment pending" value={formatCount(data.payment_pending)} severity={severityForCount(data.payment_pending, "action")} to={links.paymentPending} />
          <StatusKpiCard
            label="Expiring holds"
            value={formatCount(data.expiring_holds)}
            severity={severityForCount(data.expiring_holds, "action")}
            hint={`Within ${data.expiring_window_hours} ${data.expiring_window_hours === 1 ? "hour" : "hours"}`}
            to={links.expiringHolds}
          />
          <StatusKpiCard label="Unknown issuance" value={formatCount(data.unknown_issuance)} severity={severityForCount(data.unknown_issuance, "critical")}
            hint="Check with the supplier" to={links.unknownIssuance} />
        </div>
      )}
    </DashboardSection>
  );
}
