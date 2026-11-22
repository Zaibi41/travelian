// Round-trip return date rules shared by the home search and Modify Search (#151): the return can't be before the
// departure; moving the departure past the return clears the return; a missing or early return is explained at the
// Return field when Search is pressed (Search is never disabled silently).
import { format, startOfDay } from "date-fns";

/** The return date to keep after the departure changes: cleared when it is now before the departure. */
export function keepReturnDate(depart: Date | undefined, ret: Date | undefined): Date | undefined {
  if (!ret || !depart) return ret;
  return startOfDay(ret) < startOfDay(depart) ? undefined : ret;
}

/** The message for the Return field, or undefined when the return date is fine. */
export function returnDateError(depart: Date | undefined, ret: Date | undefined): string | undefined {
  if (!ret) return "Choose a return date";
  if (depart && startOfDay(ret) < startOfDay(depart)) return `Return must be on or after ${format(depart, "d MMM")}`;
  return undefined;
}

/** Shown at the Return field when a departure change cleared the return date. */
export const RETURN_CLEARED_MESSAGE = "Pick a new return date";
