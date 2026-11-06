import { StatusKpiCard } from "@/components/admin/StatusKpiCard";
import { formatCount, formatRs } from "@/lib/admin-dashboard/format";
import type { BusinessResults } from "@/lib/admin-dashboard/types";
import { DashboardSection } from "./DashboardSection";
import { CardGridSkeleton } from "./DashboardStates";

/** Neutral cards (no status color). Total sales and Gross profit appear only
 *  when the gateway returns them (it omits figures it can't compute exactly). */
export function BusinessSection({ data, loading }: { data?: BusinessResults; loading: boolean }) {
  const cards = data ? 2 + Number(!!data.total_sales) + Number(!!data.gross_profit) : 4;
  const columns = cards === 4 ? "grid-cols-2 lg:grid-cols-4"
    : cards === 3 ? "grid-cols-1 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3"
      : "grid-cols-2";
  return (
    <DashboardSection id="dashboard-business" title="Business results" hint="Follows all filters">
      {loading || !data ? (
        <CardGridSkeleton count={4} className="grid-cols-2 lg:grid-cols-4" />
      ) : (
        <div className={`grid gap-card-gap ${columns}`}>
          <StatusKpiCard size="sm" label="Total bookings" value={formatCount(data.total_bookings)} />
          <StatusKpiCard size="sm" label="Issued tickets" value={formatCount(data.issued_tickets)} />
          {data.total_sales && (
            <StatusKpiCard size="sm" label="Total sales" value={formatRs(data.total_sales)} />
          )}
          {data.gross_profit && (
            <StatusKpiCard size="sm" label="Gross profit" value={formatRs(data.gross_profit)} />
          )}
        </div>
      )}
    </DashboardSection>
  );
}
