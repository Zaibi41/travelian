// Search flow dates: shown day first ("24 Nov 2026") and times in 24-hour form, whatever the
// browser's language. The value kept and sent to the gateway stays ISO (yyyy-MM-dd).

import { format, isValid, parse, parseISO } from "date-fns";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-11-24" -> "24 Nov 2026"; "" when missing or not a date. */
export function formatDay(iso?: string | null): string {
  if (!iso) return "";
  const date = parseISO(iso);
  return isValid(date) ? format(date, "d MMM yyyy") : "";
}

/** "2026-11-24T23:05" -> "23:05" (24-hour). */
export function formatTime(local?: string | null): string {
  if (!local) return "";
  const date = parseISO(local);
  return isValid(date) ? format(date, "HH:mm") : "";
}

const PATTERNS = ["d/M/yyyy", "d-M-yyyy", "d.M.yyyy", "d M yyyy", "d MMM yyyy", "d MMMM yyyy", "d MMM, yyyy"];

/** Typed day-first text (24/11/2026, 24-11-2026, 24 Nov 2026, 24 November 2026) or ISO -> ISO; null if not a real date. */
export function parseDayFirst(text: string): string | null {
  const value = text.trim().replace(/\s+/g, " ");
  if (!value) return null;
  if (ISO.test(value)) {
    const date = parseISO(value);
    return isValid(date) && format(date, "yyyy-MM-dd") === value ? value : null;
  }
  for (const pattern of PATTERNS) {
    const date = parse(value, pattern, new Date(2000, 0, 1));
    if (isValid(date) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100) return format(date, "yyyy-MM-dd");
  }
  return null;
}

/** Today's local date, ISO (yyyy-MM-dd): the earliest departure a search date field offers. */
export function todayIso(now: Date = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
