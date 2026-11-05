import { bookingReportPeriods } from "@/lib/booking-report-period";
import type { DashboardPeriod, DashboardProduct, DashboardQuery } from "./types";

const PRODUCTS: DashboardProduct[] = ["flight", "hotel", "umrah"];

/** Reads filters from the URL. Unknown values fall back to defaults (Date = All). */
export function parseDashboardQuery(params: URLSearchParams): DashboardQuery {
  const period = params.get("period");
  const product = params.get("product");
  const provider = params.get("provider")?.trim().toLowerCase();
  return {
    period: bookingReportPeriods.some(option => option.value === period) ? period as DashboardPeriod : "all",
    product: PRODUCTS.includes(product as DashboardProduct) ? product as DashboardProduct : undefined,
    provider: provider || undefined,
  };
}

/** Writes only non-default filters, so a clean URL means "All". */
export function serializeDashboardQuery(query: DashboardQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.period !== "all") params.set("period", query.period);
  if (query.product) params.set("product", query.product);
  if (query.provider) params.set("provider", query.provider);
  return params;
}
