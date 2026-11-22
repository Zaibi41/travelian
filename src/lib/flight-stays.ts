// Stops on a flight: where the passenger stays (city and country) and for how long (#37, #83, #84, #119, #120, #122).
// City and country names come from the shared airport list (src/data/airports.json); a code the list doesn't know
// falls back to the city, then the IATA code: never blank, never "undefined".
import { airportPlace } from "@/data/airports";

export interface Place { code: string; city?: string; country?: string }
export type PlaceLookup = (code: string) => Place | undefined;

const clean = (value: unknown) => {
  const text = String(value ?? "").trim();
  return /^(null|undefined)$/i.test(text) ? "" : text;
};

/** The city and country of an airport, e.g. AUH -> { city: "Abu Dhabi", country: "United Arab Emirates" }. */
export function placeOf(code: string | null | undefined, lookup: PlaceLookup = airportPlace) {
  const iata = clean(code).toUpperCase();
  const found = iata ? lookup(iata) : undefined;
  return { code: iata, city: clean(found?.city), country: clean(found?.country) };
}

/** "Abu Dhabi, United Arab Emirates"; "Singapore" when city and country are the same; the city or code when that's all there is. */
export function placeName(code: string | null | undefined, lookup: PlaceLookup = airportPlace) {
  const { code: iata, city, country } = placeOf(code, lookup);
  if (city && country) return city.toLowerCase() === country.toLowerCase() ? city : `${city}, ${country}`;
  return city || country || iata;
}

/** 165 -> "2h 45m", 45 -> "0h 45m" (the same form as flight durations on the page). */
export function minutesText(minutes: number | null | undefined) {
  return typeof minutes === "number" && Number.isFinite(minutes) && minutes >= 0
    ? `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`
    : undefined;
}

/** Local "YYYY-MM-DD HH:MM" (or ISO) -> minutes since epoch read as the same clock; undefined when it isn't a time. */
function clockMinutes(value: string | null | undefined) {
  const match = clean(value).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!match) return undefined;
  const [, y, mo, d, h, mi] = match.map(Number);
  return Date.UTC(y, mo - 1, d, h, mi) / 60000;
}

/** Minutes on the ground between arriving and leaving the same airport (both local there); undefined if unknown or out of order. */
export function gapMinutes(arrival: string | null | undefined, departure: string | null | undefined) {
  const start = clockMinutes(arrival);
  const end = clockMinutes(departure);
  if (start === undefined || end === undefined || end < start) return undefined;
  return end - start;
}

/** 0 -> "Non-stop", 1 -> "1 Stop", 2 -> "2 Stops". */
export function stopCountText(stops: number | null | undefined) {
  const count = Math.max(0, Math.floor(Number(stops) || 0));
  return count ? `${count} Stop${count === 1 ? "" : "s"}` : "Non-stop";
}

/** The card's stop line (#119, #120): "1 Stop" and the places, e.g. "Abu Dhabi, United Arab Emirates · Doha, Qatar". */
export function stopSummary(stops: number | null | undefined, codes: (string | null | undefined)[], lookup: PlaceLookup = airportPlace) {
  const count = Math.max(0, Math.floor(Number(stops) || 0));
  const places = count ? codes.map((code) => placeName(code, lookup)).filter(Boolean) : [];
  return { count: stopCountText(count), places: places.join(" · ") };
}

/** One line: "Non-stop" or "1 Stop · Abu Dhabi, United Arab Emirates". */
export function stopLine(stops: number | null | undefined, codes: (string | null | undefined)[], lookup: PlaceLookup = airportPlace) {
  const { count, places } = stopSummary(stops, codes, lookup);
  return places ? `${count} · ${places}` : count;
}

export interface StaySegment {
  origin?: string | null;
  destination?: string | null;
  flightNumber?: string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  departureTimestamp?: string | null;
  arrivalTimestamp?: string | null;
}

export interface StayLayover { location?: string | null; duration?: string | null; arrivalTime?: string | null; departureTime?: string | null; nextFlightNumber?: string | null }

export interface Stay {
  code: string;
  city: string;
  country: string;
  /** "Abu Dhabi, United Arab Emirates" (or the city / code). */
  place: string;
  /** "2h 45m", or undefined when the times aren't known. */
  duration?: string;
  arrivalTime?: string | null;
  departureTime?: string | null;
}

/** The stay between two flights of one journey (the passenger lands at `before.destination` and leaves on `after`). */
export function stayBetween(before: StaySegment, after: StaySegment, layover?: StayLayover, lookup: PlaceLookup = airportPlace): Stay {
  const code = clean(after.origin || before.destination || layover?.location).toUpperCase();
  const { city, country } = placeOf(code, lookup);
  const minutes = gapMinutes(before.arrivalTimestamp || before.arrivalTime, after.departureTimestamp || after.departureTime);
  return {
    code, city, country, place: placeName(code, lookup),
    duration: minutesText(minutes) ?? (clean(layover?.duration) || undefined),
    arrivalTime: before.arrivalTime || layover?.arrivalTime,
    departureTime: after.departureTime || layover?.departureTime,
  };
}

/** A stay known only by its airport (the supplier sent the stop city, not each flight). */
export function stayAt(layover: StayLayover, lookup: PlaceLookup = airportPlace): Stay {
  const code = clean(layover.location).toUpperCase();
  const { city, country } = placeOf(code, lookup);
  return { code, city, country, place: placeName(code, lookup), duration: clean(layover.duration) || undefined, arrivalTime: layover.arrivalTime, departureTime: layover.departureTime };
}

/** "2h 45m" / "45m" / "2h" -> minutes; undefined when it isn't a duration. */
export function durationMinutes(text: string | null | undefined) {
  const match = clean(text).match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?$/i);
  if (!match || (match[1] === undefined && match[2] === undefined)) return undefined;
  return Number(match[1] || 0) * 60 + Number(match[2] || 0);
}

/** A journey's total time from its flights' own flying times and the stays between them (each airport's local clock
 *  differs, so first departure to last arrival in local times is wrong across time zones). undefined unless all are known. */
export function journeyMinutes(segments: (StaySegment & { duration?: string | null })[]) {
  let total = 0;
  for (let index = 0; index < segments.length; index += 1) {
    const flying = durationMinutes(segments[index].duration);
    if (flying === undefined) return undefined;
    total += flying;
    if (index) {
      const before = segments[index - 1];
      const stay = gapMinutes(before.arrivalTimestamp || before.arrivalTime, segments[index].departureTimestamp || segments[index].departureTime);
      if (stay === undefined) return undefined;
      total += stay;
    }
  }
  return segments.length ? total : undefined;
}

export interface CheckoutJourney {
  /** "Outbound" / "Return" on a round trip, "Flight 1", "Flight 2"… on a multi-city trip, "" on a one-way trip. */
  label: string;
  /** Flying time plus stays, from the flights' own durations (#153); undefined when not every duration is known. */
  duration?: string;
  stops: number;
  /** "Non-stop", "1 Stop", "2 Stops". */
  stopText: string;
}

const iataOf = (value: string | null | undefined) => {
  const text = clean(value).toUpperCase();
  const code = text.match(/\(([A-Z]{3})\)/)?.[1] || text.match(/^[A-Z]{3}$/)?.[0];
  return code || text;
};

/** The checkout summary's journeys (#153): a round trip splits where it reaches the destination, a multi-city trip
 *  where the passenger stays a day or more; the time of each comes from the flights' durations and the stays between
 *  them (journeyMinutes), never from subtracting one airport's local clock from another's. */
export function checkoutJourneys(
  segments: (StaySegment & { duration?: string | null })[],
  options: { destination?: string | null; trip?: string | null } = {},
): CheckoutJourney[] {
  if (!segments.length) return [];
  const groups: (typeof segments)[] = [];
  const roundtrip = options.trip === "roundtrip";
  const destination = iataOf(options.destination);
  let current: typeof segments = [];
  segments.forEach((segment, index) => {
    if (index && !roundtrip) {
      const before = segments[index - 1];
      const stay = gapMinutes(before.arrivalTimestamp || before.arrivalTime, segment.departureTimestamp || segment.departureTime);
      if (options.trip === "multicity" && stay !== undefined && stay >= 24 * 60) { groups.push(current); current = []; }
    }
    current.push(segment);
    if (roundtrip && groups.length === 0 && destination && iataOf(segment.destination) === destination && index < segments.length - 1) {
      groups.push(current); current = [];
    }
  });
  if (current.length) groups.push(current);
  return groups.map((group, index) => {
    const stops = Math.max(0, group.length - 1);
    return {
      label: groups.length < 2 ? "" : roundtrip ? (index ? "Return" : "Outbound") : `Flight ${index + 1}`,
      duration: minutesText(journeyMinutes(group)),
      stops,
      stopText: stopCountText(stops),
    };
  });
}
