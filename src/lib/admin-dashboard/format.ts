import { format, isToday, isTomorrow, parseISO } from "date-fns";
import type { BookingReport, CurrencyAmount, Money } from "./types";

// Formatting only. Amounts arrive from the gateway as integer paisa.

function rupees(money: Money) {
  return money.amount_minor / 100;
}

/** Full amount, e.g. "Rs 1,284,500". Currency label is "Rs". */
export function formatRs(money: Money) {
  const value = Math.round(rupees(money));
  return `${value < 0 ? "-" : ""}Rs ${Math.abs(value).toLocaleString("en-PK")}`;
}

/** One figure per currency, never converted: "Rs 1,284,500 · SAR 400". A missing amount is "n/a", never 0. */
export function formatAmounts(items: CurrencyAmount[]) {
  return items.map(({ currency, amount_minor: minor }) => {
    const label = currency === "PKR" ? "Rs" : currency;
    if (minor === undefined || minor === null) return items.length > 1 ? `${label} n/a` : "n/a";
    const value = Math.round(minor / 100);
    return `${value < 0 ? "-" : ""}${label} ${Math.abs(value).toLocaleString("en-PK")}`;
  }).join(" · ");
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
