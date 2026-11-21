import { StatusKpiCard } from "@/components/admin/StatusKpiCard";
import { formatAmounts, formatCount } from "@/lib/admin-dashboard/format";
import type { BusinessResults, ProductResults } from "@/lib/admin-dashboard/types";
import { DashboardSection } from "./DashboardSection";
import { CardGridSkeleton } from "./DashboardStates";

/** Each tile's figure for Flights and Group, when the gateway sends the split (Product filter All). */
function split(data: BusinessResults, value: (product: ProductResults) => string | null) {
  return (data.by_product ?? []).flatMap(product => {
    const figure = value(product);
    return figure === null ? [] : [{ label: product.label, value: figure }];
  });
}

/** Neutral cards (no status color). Money is per currency, never converted; a figure the gateway
 *  can't compute exactly reads "n/a", never 0. Gross profit appears only when the gateway sends it.
 *  With the Product filter on All, every tile also shows Flights and Group separately. */
export function BusinessSection({ data, loading }: { data?: BusinessResults; loading: boolean }) {
  return (
    <DashboardSection id="dashboard-business" title="Business results" hint="Follows all filters">
      {loading || !data ? (
        <CardGridSkeleton count={6} className="grid-cols-2 lg:grid-cols-3" />
      ) : (
        <div className="grid grid-cols-2 gap-card-gap lg:grid-cols-3">
          <StatusKpiCard size="sm" label="Total bookings" value={formatCount(data.total_bookings)}
            breakdown={split(data, product => formatCount(product.total_bookings))} />
          <StatusKpiCard size="sm" label="Held" value={formatCount(data.held)} breakdown={split(data, product => formatCount(product.held))} />
          <StatusKpiCard size="sm" label="Paid" value={formatCount(data.paid)} breakdown={split(data, product => formatCount(product.paid))} />
          <StatusKpiCard size="sm" label="Issued tickets" value={formatCount(data.issued_tickets)}
            breakdown={split(data, product => formatCount(product.issued_tickets))} />
          {!!data.total_sales?.length && (
            <StatusKpiCard size="sm" label="Total sales" value={formatAmounts(data.total_sales)}
              breakdown={split(data, product => formatAmounts(product.total_sales))} />
          )}
          {!!data.gross_profit?.length && (
            <StatusKpiCard size="sm" label="Gross profit" value={formatAmounts(data.gross_profit)}
              hint={notKnownHint(data.gross_profit)}
              breakdown={split(data, product => product.gross_profit?.length ? formatAmounts(product.gross_profit) : null)} />
          )}
        </div>
      )}
    </DashboardSection>
  );
}

/** travelian#70: paid bookings whose supplier cost isn't known are left out of the profit (never counted as 0). */
function notKnownHint(amounts: { profit_not_known?: number | null }[]) {
  const count = amounts.reduce((sum, amount) => sum + (amount.profit_not_known ?? 0), 0);
  return count ? `${count} booking${count === 1 ? "" : "s"}: profit not known` : undefined;
}
