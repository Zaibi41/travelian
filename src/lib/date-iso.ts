import { format, isValid, parseISO } from "date-fns";

// Form dates are kept and sent as ISO yyyy-MM-dd and shown day first ("24 Nov 2026") everywhere.

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export const isoToDate = (iso?: string | null) => (iso && ISO.test(iso) && isValid(parseISO(iso)) ? parseISO(iso) : undefined);
export const dateToIso = (date: Date) => format(date, "yyyy-MM-dd");

/** "2026-11-24" -> "24 Nov 2026"; "" when empty. */
export const formatPickedDate = (iso?: string | null) => {
  const date = isoToDate(iso);
  return date ? format(date, "d MMM yyyy") : "";
};

/** Today as ISO, in the browser's own day. */
export const todayIso = () => dateToIso(new Date());

/** The ISO day `days` after (or before) `iso`. */
export const addDaysIso = (iso: string, days: number) => {
  const [year, month, day] = iso.split("-").map(Number);
  return dateToIso(new Date(year, month - 1, day + days));
};
