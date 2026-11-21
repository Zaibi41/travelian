// Stops on an admin search flight (#85, #89): where the passenger stays (city and country, from the shared airport
// list src/data/airports.json) and for how long (the gateway's segments: layover_minutes, else the gap between landing
// and the next take-off, both local at that airport). A code the list doesn't know falls back to the city, then the
// IATA code: never blank. Without segments only the stop airports are known (stop_cities), with no stay time.

import type { AirportIndex } from "./airports";
import { formatDuration, type FlightView } from "./flights";

export interface Stay {
  /** IATA code of the stop airport. */
  code: string;
  city: string;
  country: string;
  /** Minutes on the ground, or null when the gateway sent no flight-by-flight times. */
  minutes: number | null;
  /** Local time the passenger lands at the stop, YYYY-MM-DDTHH:MM. */
  arrival: string | null;
  /** Local time the next flight leaves the stop. */
  departure: string | null;
}

const clean = (value: unknown) => {
  const text = String(value ?? "").trim();
  return /^(null|undefined)$/i.test(text) ? "" : text;
};

/** Local "YYYY-MM-DDTHH:MM" read as minutes on that airport's clock; null when it isn't a time. */
function clock(value?: string | null) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(clean(value));
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  return Date.UTC(y, mo - 1, d, h, mi) / 60_000;
}

/** Minutes between landing and the next take-off at the same airport; null if unknown or out of order. */
export function gapMinutes(arrival?: string | null, departure?: string | null) {
  const start = clock(arrival);
  const end = clock(departure);
  return start === null || end === null || end < start ? null : end - start;
}

function place(code: string, airports: AirportIndex | null) {
  const airport = code ? airports?.byCode.get(code) : undefined;
  return { city: clean(airport?.city), country: clean(airport?.country) };
}

/** The stays of a flight, in order. */
export function flightStays(flight: FlightView, airports: AirportIndex | null): Stay[] {
  const segments = flight.segments ?? [];
  if (segments.length > 1) {
    return segments.slice(1).map((segment, index) => {
      const before = segments[index];
      const code = clean(segment.origin || before.destination).toUpperCase();
      const given = segment.layover_minutes;
      const minutes = typeof given === "number" && Number.isFinite(given) && given >= 0 ? given : gapMinutes(before.arrival_local, segment.departure_local);
      return { code, ...place(code, airports), minutes, arrival: before.arrival_local ?? null, departure: segment.departure_local ?? null };
    });
  }
  if (!flight.stops) return [];
  return flight.stop_cities.map(clean).filter(Boolean).map(value => {
    const code = value.toUpperCase();
    return { code, ...place(code, airports), minutes: null, arrival: null, departure: null };
  });
}

/** "Doha, Qatar"; "Singapore" when city and country are the same; the city, country or code when that's all there is. */
export function stayPlace(stay: Pick<Stay, "code" | "city" | "country">) {
  if (stay.city && stay.country) return stay.city.toLowerCase() === stay.country.toLowerCase() ? stay.city : `${stay.city}, ${stay.country}`;
  return stay.city || stay.country || stay.code;
}

/** The line under the flight's route (#89): "Non-stop", "1 stop via Doha (02h 45m)", "2 stops via Multan, Islamabad". */
export function stopsBelowLine(flight: FlightView, stays: Stay[]) {
  if (flight.stops == null && !stays.length) return null;
  const count = flight.stops ?? stays.length;
  if (count === 0) return "Non-stop";
  const label = `${count} stop${count === 1 ? "" : "s"}`;
  if (!stays.length) return label;
  const via = stays.map(stay => {
    const name = stay.city || stay.code;
    const time = formatDuration(stay.minutes);
    return time ? `${name} (${time})` : name;
  });
  return `${label} via ${via.join(", ")}`;
}
