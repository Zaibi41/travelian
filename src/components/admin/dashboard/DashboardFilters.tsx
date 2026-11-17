import { FilterSelect } from "@/components/admin/ui/FilterSelect";
import { bookingReportPeriods } from "@/lib/booking-report-period";
import type { DashboardFilterOptions, DashboardPeriod, DashboardProduct, DashboardQuery } from "@/lib/admin-dashboard/types";

const ALL = "all";

interface DashboardFiltersProps {
  query: DashboardQuery;
  options?: DashboardFilterOptions;
  onChange: (next: DashboardQuery) => void;
}

/** Date, Product, Provider / source (only when the gateway sends providers). Branch, Channel and Agency stay hidden
 *  until the backend records them (docs/backend-todo.md). */
export function DashboardFilters({ query, options, onChange }: DashboardFiltersProps) {
  const products = [{ value: ALL, label: "All" }, ...(options?.products ?? [])];
  // The gateway sends providers only to viewers who may see supplier names (D23).
  const providers = options?.providers?.length ? [{ value: ALL, label: "All" }, ...options.providers] : null;

  return (
    <div role="group" aria-label="Dashboard filters" className="flex flex-wrap gap-2">
      <FilterSelect
        id="dashboard-filter-date"
        label="Date"
        value={query.period}
        options={bookingReportPeriods.map(option => ({ value: option.value, label: option.label }))}
        onChange={value => onChange({ ...query, period: value as DashboardPeriod })}
      />
      <FilterSelect
        id="dashboard-filter-product"
        label="Product"
        value={query.product ?? ALL}
        options={products}
        onChange={value => onChange({ ...query, product: value === ALL ? undefined : value as DashboardProduct })}
      />
      {providers && (
        <FilterSelect
          id="dashboard-filter-provider"
          label="Provider / source"
          value={query.provider ?? ALL}
          options={providers}
          onChange={value => onChange({ ...query, provider: value === ALL ? undefined : value })}
        />
      )}
    </div>
  );
}
