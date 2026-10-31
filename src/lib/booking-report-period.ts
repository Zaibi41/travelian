import { startOfDay, startOfMonth, startOfYear, subDays, subMonths, subYears } from "date-fns";
import type { BookingRecord } from "@/lib/booking-store";

export const bookingReportPeriods = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last-week", label: "Last 7 days" },
  { value: "last-two-weeks", label: "Last 14 days" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "last-three-months", label: "Last 3 months" },
  { value: "last-six-months", label: "Last 6 months" },
  { value: "this-year", label: "This year" },
  { value: "last-year", label: "Last year" },
] as const;

export type BookingReportPeriod = (typeof bookingReportPeriods)[number]["value"];

export function filterRecordsByPeriod<T extends { createdAt: string }>(records: T[], period: BookingReportPeriod, now = new Date()): T[] {
  if (period === "all") return records;

  let start: Date;
  let end = now;
  switch (period) {
    case "today": start = startOfDay(now); break;
    case "yesterday":
      start = startOfDay(subDays(now, 1));
      end = startOfDay(now);
      break;
    case "last-week": start = startOfDay(subDays(now, 6)); break;
    case "last-two-weeks": start = startOfDay(subDays(now, 13)); break;
    case "this-month": start = startOfMonth(now); break;
    case "last-month":
      start = startOfMonth(subMonths(now, 1));
      end = startOfMonth(now);
      break;
    case "last-three-months": start = startOfDay(subMonths(now, 3)); break;
    case "last-six-months": start = startOfDay(subMonths(now, 6)); break;
    case "this-year": start = startOfYear(now); break;
    case "last-year":
      start = startOfYear(subYears(now, 1));
      end = startOfYear(now);
      break;
  }

  const startTime = start.getTime();
  const endTime = end.getTime();
  const endExclusive = period === "yesterday" || period === "last-month" || period === "last-year";
  return records.filter(record => {
    const created = new Date(record.createdAt).getTime();
    return Number.isFinite(created) && created >= startTime && (endExclusive ? created < endTime : created <= endTime);
  });
}

export function filterBookingsByPeriod(bookings: BookingRecord[], period: BookingReportPeriod, now = new Date()): BookingRecord[] {
  return filterRecordsByPeriod(bookings, period, now);
}
