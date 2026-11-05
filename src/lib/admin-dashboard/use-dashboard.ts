import { useQuery } from "@tanstack/react-query";
import { fetchAttentionQueue, fetchBookingReport, fetchDashboardFilterOptions, fetchDashboardSummary } from "./api";
import type { DashboardQuery } from "./types";

export const ATTENTION_LIMIT = 6;

// No refresh button (decided 2026-10-31): data reloads on tab focus and every minute.
const LIVE = { staleTime: 60_000, refetchInterval: 60_000, refetchOnWindowFocus: true, retry: 1 } as const;

export function useDashboard(query: DashboardQuery) {
  const summary = useQuery({
    queryKey: ["admin-dashboard", "summary", query],
    queryFn: ({ signal }) => fetchDashboardSummary(query, { signal }),
    ...LIVE,
  });
  const report = useQuery({
    queryKey: ["admin-dashboard", "booking-report", query.period],
    queryFn: ({ signal }) => fetchBookingReport(query, { signal }),
    ...LIVE,
  });
  const attention = useQuery({
    queryKey: ["admin-dashboard", "attention", query.product, query.provider],
    queryFn: ({ signal }) => fetchAttentionQueue(query, ATTENTION_LIMIT, { signal }),
    ...LIVE,
  });
  const filterOptions = useQuery({
    queryKey: ["admin-dashboard", "filter-options"],
    queryFn: ({ signal }) => fetchDashboardFilterOptions({ signal }),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  return { summary, report, attention, filterOptions };
}
