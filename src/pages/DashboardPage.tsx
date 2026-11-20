import { useSearchParams } from "react-router-dom";
import { Tag } from "@/components/admin/ui/StatusBadge";
import { useRole } from "@/contexts/RoleContext";
import { GatewayError } from "@/lib/gateway/client";
import { parseDashboardQuery, serializeDashboardQuery } from "@/lib/admin-dashboard/query-params";
import { useDashboard } from "@/lib/admin-dashboard/use-dashboard";
import type { DashboardQuery } from "@/lib/admin-dashboard/types";
import { DashboardFilters } from "@/components/admin/dashboard/DashboardFilters";
import { NeedsActionSection } from "@/components/admin/dashboard/NeedsActionSection";
import { BusinessSection } from "@/components/admin/dashboard/BusinessSection";
import { AttentionQueuePanel } from "@/components/admin/dashboard/AttentionQueuePanel";
import { BookingReportChart } from "@/components/admin/dashboard/BookingReportChart";
import { DashboardErrorNotice } from "@/components/admin/dashboard/DashboardStates";

function errorMessage(error: unknown) {
  if (error instanceof GatewayError) return error.message;
  return "Dashboard figures couldn't be loaded. They will load when the service responds.";
}

// Data: travelian-api-gateway only (computed server-side). Hidden until the
// backend provides data: Unknown issuance, Money and balances, Recent activity,
// Owner, and the Branch/Channel/Agency filters. See docs/backend-todo.md.
export default function DashboardPage() {
  const { currentRole } = useRole();
  const [params, setParams] = useSearchParams();
  const query = parseDashboardQuery(params);
  const { summary, report, attention, filterOptions } = useDashboard(query);

  const setQuery = (next: DashboardQuery) => setParams(serializeDashboardQuery(next), { replace: true });
  const isAgency = currentRole === "agency_owner" || currentRole === "agency_staff";
  // Not configured / signed out / forbidden affects every section: show it once.
  const pageError = [summary.error, report.error, attention.error].find(error => error instanceof GatewayError && error.kind !== "unavailable")
    ?? (summary.error && report.error && attention.error ? summary.error : null);

  return (
    <div className="flex flex-col gap-section-gap">
      {/* No scope chip: there is no branch data for "All branches" yet, and the role
          already shows in the user menu (docs/backend-todo.md: Branch). */}
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="font-display text-page-title font-bold text-foreground">{isAgency ? "Agency Dashboard" : "Dashboard"}</h1>
        {/* Gateway flags imported (test) bookings so they're never mistaken for live figures. */}
        {summary.data?.contains_sample_data && (
          <Tag>Includes imported bookings</Tag>
        )}
      </div>

      <DashboardFilters query={query} options={filterOptions.data} onChange={setQuery} />

      {pageError ? (
        <DashboardErrorNotice message={errorMessage(pageError)} />
      ) : (
        <>
          {summary.error ? (
            <DashboardErrorNotice message={errorMessage(summary.error)} />
          ) : (
            <>
              <NeedsActionSection data={summary.data?.needs_action} loading={summary.isPending} query={query} />
              <BusinessSection data={summary.data?.business} loading={summary.isPending} />
            </>
          )}
          {attention.error ? <DashboardErrorNotice message={errorMessage(attention.error)} /> : <AttentionQueuePanel data={attention.data} loading={attention.isPending} />}
          {report.error ? <DashboardErrorNotice message={errorMessage(report.error)} /> : <BookingReportChart data={report.data} loading={report.isPending} />}
        </>
      )}
    </div>
  );
}
