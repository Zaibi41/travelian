// Multi-city legs (#160), shared by the home search and Modify Search: each leg's own messages (shown under its field,
// first one focused), the next leg starting where the previous one lands, and dates that can't go back in time.
import { format, startOfDay } from "date-fns";

export interface Leg { from: string; to: string; date: Date | undefined }
export interface LegErrors { from?: string; to?: string; date?: string }

const isCode = (value: string) => /^[A-Z]{3}$/.test(value);

/** A message per field of each leg (empty object when the leg is fine). */
export function legErrors(legs: Leg[], today = new Date()): LegErrors[] {
  const floor = startOfDay(today);
  return legs.map((leg, index) => {
    const errors: LegErrors = {};
    if (!isCode(leg.from)) errors.from = "Choose an origin";
    if (!isCode(leg.to)) errors.to = "Choose a destination";
    else if (leg.from === leg.to) errors.to = "Choose a different destination";
    const previous = index > 0 ? legs[index - 1].date : undefined;
    if (!leg.date) errors.date = "Pick a date";
    else if (startOfDay(leg.date) < floor) errors.date = "Pick a date from today";
    else if (previous && startOfDay(leg.date) < startOfDay(previous)) errors.date = `Pick a date on or after Flight ${index} (${format(previous, "d MMM")})`;
    return errors;
  });
}

/** The first field to fix, as [leg index, field], or undefined when every leg is fine. */
export function firstLegError(errors: LegErrors[]): [number, keyof LegErrors] | undefined {
  for (const [index, leg] of errors.entries()) {
    const field = (["from", "to", "date"] as const).find(key => leg[key]);
    if (field) return [index, field];
  }
  return undefined;
}

/** A new leg: from where the last one lands, on its date (the earliest it can be). */
export function nextLeg(legs: Leg[]): Leg {
  const last = legs[legs.length - 1];
  return { from: last?.to ?? "", to: "", date: last?.date };
}

/** Change one field of a leg. Choosing a destination fills an empty From of the next leg; a new date clears later
 *  dates that would now be before it. */
export function updateLeg(legs: Leg[], index: number, patch: Partial<Leg>): Leg[] {
  const next = legs.map((leg, at) => (at === index ? { ...leg, ...patch } : leg));
  const following = next[index + 1];
  if (patch.to && following && (!following.from || following.from === legs[index].to)) next[index + 1] = { ...following, from: patch.to };
  if (patch.date) {
    for (let at = index + 1; at < next.length; at += 1) {
      const date = next[at].date;
      if (date && startOfDay(date) < startOfDay(patch.date)) next[at] = { ...next[at], date: undefined };
    }
  }
  return next;
}

/** After an edit: the messages shown so far that are still true (fixed fields lose theirs; nothing new appears until
 *  Search is pressed again). */
export function remainingLegErrors(shown: LegErrors[], legs: Leg[], today = new Date()): LegErrors[] {
  if (!shown.length) return shown;
  const fresh = legErrors(legs, today);
  return legs.map((_, index) => {
    const kept: LegErrors = {};
    for (const key of ["from", "to", "date"] as const) if (shown[index]?.[key] && fresh[index][key]) kept[key] = fresh[index][key];
    return kept;
  });
}
