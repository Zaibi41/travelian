// Date filter shared by the Finance screens: "All" by default (AGENTS.md), kept in the URL as ?date=.
// The page sends whole days (YYYY-MM-DD, Pakistan time); the gateway does the filtering.

export const DATE_FILTERS = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
] as const;

export type DateFilter = (typeof DATE_FILTERS)[number]["value"];

export function dateFilterFromParam(value: string | null): DateFilter {
  return DATE_FILTERS.some(option => option.value === value) ? value as DateFilter : "all";
}

const PKT = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" });
/** A day in Pakistan time as YYYY-MM-DD. */
export const pktDay = (date: Date) => PKT.format(date);
const daysBefore = (date: Date, days: number) => new Date(date.getTime() - days * 86_400_000);

/** The gateway's date_from / date_to for a filter (undefined = no limit). */
export function dateRange(filter: DateFilter, now: Date = new Date()): { date_from?: string; date_to?: string } {
  const today = pktDay(now);
  switch (filter) {
    case "today": return { date_from: today, date_to: today };
    case "7d": return { date_from: pktDay(daysBefore(now, 6)), date_to: today };
    case "30d": return { date_from: pktDay(daysBefore(now, 29)), date_to: today };
    case "month": return { date_from: `${today.slice(0, 8)}01`, date_to: today };
    default: return {};
  }
}
