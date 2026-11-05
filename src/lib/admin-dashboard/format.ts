import { format, isToday, isTomorrow, parseISO } from "date-fns";
import type { BookingReport, Money } from "./types";

// Formatting only. Amounts arrive from the gateway as integer paisa.

function rupees(money: Money) {
  return money.amount_minor / 100;
}

/** Full amount, e.g. "Rs 1,284,500". Currency label is "Rs". */
export function formatRs(money: Money) {
  const value = Math.round(rupees(money));
  return `${value < 0 ? "-" : ""}Rs ${Math.abs(value).toLocaleString("en-PK")}`;
}

/** Card value, e.g. "Rs 12.8M", "Rs 845.2K", "Rs 64,300". */
export function formatRsCompact(money: Money) {
  const value = rupees(money);
  const absolute = Math.abs(value);
  const compact = absolute >= 1_000_000
    ? `${(absolute / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
    : absolute >= 100_000
      ? `${(absolute / 1_000).toFixed(1).replace(/\.0$/, "")}K`
      : Math.round(absolute).toLocaleString("en-PK");
  return `${value < 0 ? "-" : ""}Rs ${compact}`;
}

export function formatCount(count: number) {
  return count.toLocaleString("en-PK");
}

export function formatDue(dueAt?: string | null) {
  if (!dueAt) return "No deadline";
  const date = new Date(dueAt);
  if (!Number.isFinite(date.getTime())) return "No deadline";
  if (isToday(date)) return `Today ${format(date, "HH:mm")}`;
  if (isTomorrow(date)) return `Tomorrow ${format(date, "HH:mm")}`;
  return format(date, "d MMM, HH:mm");
}

/** Axis label for a report bucket (bucket start is a calendar date). */
export function formatBucket(start: string, granularity: BookingReport["granularity"]) {
  const date = parseISO(start);
  if (granularity === "day") return format(date, "EEE d MMM");
  if (granularity === "week") return format(date, "d MMM");
  return format(date, "MMM yyyy");
}
