// Live flight search on travelian-api-gateway (/v1/live-ticketing/flights/search, Southair).
// The gateway decides what each role receives (D23): opaque IDs and the selling price;
// supplier name and cost only with permission. This page shows the selling price only.

import { gatewayPost, type GatewayOptions } from "@/lib/gateway/client";
import type { components } from "@/lib/gateway/schema";

type Schemas = components["schemas"];
export type FlightSearchView = Schemas["FlightSearchView"];
export type JourneyView = Schemas["JourneyView"];
export type FlightView = Schemas["FlightView"];
export type FareView = Schemas["FareView"];
export type FlightMoney = Schemas["FlightMoney"];

const UNAVAILABLE = "Flight search can't run right now. The flight supplier isn't responding; try again in a few minutes.";

export interface FlightSearch {
  trip: "oneway" | "roundtrip";
  from?: string;
  to?: string;
  /** yyyy-mm-dd */
  date?: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
}

const CODE = /^[A-Z]{3}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const count = (value: string | null, min: number, max: number, fallback: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};

export function parseFlightSearch(params: URLSearchParams): FlightSearch {
  const code = (key: string) => {
    const value = params.get(key)?.trim().toUpperCase();
    return value && CODE.test(value) ? value : undefined;
  };
  const date = (key: string) => {
    const value = params.get(key) ?? "";
    return DATE.test(value) ? value : undefined;
  };
  const trip = params.get("trip") === "roundtrip" ? "roundtrip" : "oneway";
  return {
    trip,
    from: code("from"),
    to: code("to"),
    date: date("date"),
    returnDate: trip === "roundtrip" ? date("return") : undefined,
    adults: count(params.get("adults"), 1, 9, 1),
    children: count(params.get("children"), 0, 8, 0),
    infants: count(params.get("infants"), 0, 8, 0),
  };
}

export function writeFlightSearch(params: URLSearchParams, search: FlightSearch): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const key of ["trip", "from", "to", "date", "return", "adults", "children", "infants"]) next.delete(key);
  if (search.trip === "roundtrip") next.set("trip", "roundtrip");
  if (search.from) next.set("from", search.from);
  if (search.to) next.set("to", search.to);
  if (search.date) next.set("date", search.date);
  if (search.trip === "roundtrip" && search.returnDate) next.set("return", search.returnDate);
  if (search.adults !== 1) next.set("adults", String(search.adults));
  if (search.children) next.set("children", String(search.children));
  if (search.infants) next.set("infants", String(search.infants));
  return next;
}

export function isCompleteFlightSearch(search: FlightSearch): search is FlightSearch & { from: string; to: string; date: string } {
  if (!search.from || !search.to || !search.date || search.from === search.to) return false;
  if (search.infants > search.adults) return false;
  if (search.trip === "roundtrip") return Boolean(search.returnDate && search.returnDate >= search.date);
  return true;
}

export const searchFlights = (search: FlightSearch & { from: string; to: string; date: string }, options?: GatewayOptions) =>
  gatewayPost(
    "/v1/live-ticketing/flights/search",
    {
      origin: search.from, destination: search.to, departure_date: search.date,
      return_date: search.trip === "roundtrip" ? search.returnDate ?? null : null,
      adults: search.adults, children: search.children, infants: search.infants,
      cabin: "economy", currency: "PKR",
    },
    { unavailableMessage: UNAVAILABLE, ...options },
  );

// ---------- result filters (display only) ----------

export type StopsFilter = "any" | "nonstop" | "one" | "two_plus";
export type TimeFilter = "any" | "morning" | "afternoon" | "evening" | "night";
export type RefundFilter = "any" | "refundable" | "non_refundable";
export type SortOrder = "price" | "departure" | "duration";

export interface ResultFilters {
  airline: string;
  stops: StopsFilter;
  time: TimeFilter;
  refund: RefundFilter;
  sort: SortOrder;
}

export const DEFAULT_FILTERS: ResultFilters = { airline: "any", stops: "any", time: "any", refund: "any", sort: "price" };

export const isRefundable = (fare: FareView) => {
  const text = (fare.refund ?? "").toLowerCase();
  if (!text) return null;
  if (/non[\s-]?refundable/.test(text)) return false;
  return /refundable/.test(text) ? true : null;
};

function hour(local?: string | null) {
  const match = /T(\d{2}):/.exec(local ?? "");
  return match ? Number(match[1]) : null;
}

function inWindow(time: TimeFilter, local?: string | null) {
  if (time === "any") return true;
  const h = hour(local);
  if (h === null) return false;
  if (time === "morning") return h >= 5 && h < 12;
  if (time === "afternoon") return h >= 12 && h < 17;
  if (time === "evening") return h >= 17 && h < 21;
  return h >= 21 || h < 5;
}

const lowestPrice = (flight: FlightView) =>
  Math.min(...flight.fares.map(fare => fare.selling_price?.amount_minor ?? Number.POSITIVE_INFINITY));

/** Filters flights and their fare rows; a flight with no fare left is dropped. */
export function filterFlights(flights: FlightView[], filters: ResultFilters): FlightView[] {
  const kept = flights
    .filter(flight => filters.airline === "any" || (flight.airline_name ?? flight.airline_code) === filters.airline)
    .filter(flight => {
      if (filters.stops === "any") return true;
      if (flight.stops == null) return false;
      return filters.stops === "nonstop" ? flight.stops === 0 : filters.stops === "one" ? flight.stops === 1 : flight.stops >= 2;
    })
    .filter(flight => inWindow(filters.time, flight.departure_local))
    .map(flight => ({
      ...flight,
      fares: flight.fares.filter(fare => filters.refund === "any" || isRefundable(fare) === (filters.refund === "refundable")),
    }))
    .filter(flight => flight.fares.length > 0);
  const byDeparture = (a: FlightView, b: FlightView) => (a.departure_local ?? "").localeCompare(b.departure_local ?? "");
  return kept.sort((a, b) => {
    if (filters.sort === "departure") return byDeparture(a, b);
    if (filters.sort === "duration") return (a.duration_minutes ?? Infinity) - (b.duration_minutes ?? Infinity) || byDeparture(a, b);
    return lowestPrice(a) - lowestPrice(b) || byDeparture(a, b);
  });
}

export const airlineLabel = (flight: FlightView) => flight.airline_name ?? flight.airline_code ?? "Airline";

export function formatDuration(minutes?: number | null) {
  if (minutes == null) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}

export function stopsLabel(flight: FlightView) {
  if (flight.stops == null) return null;
  if (flight.stops === 0) return "Non-stop";
  const via = flight.stop_cities.length ? ` via ${flight.stop_cities.join(", ")}` : "";
  return `${flight.stops} stop${flight.stops === 1 ? "" : "s"}${via}`;
}

export type RepriceView = Schemas["RepriceView"];

export const repriceFlights = (searchId: string, fareIds: string[], options?: GatewayOptions) =>
  gatewayPost("/v1/live-ticketing/flights/reprice", { search_id: searchId, fare_ids: fareIds }, {
    unavailableMessage: "The fare can't be revalidated right now. Try again in a few minutes.", ...options,
  });

export const PASSENGER_LABEL: Record<string, [string, string]> = { ADT: ["Adult", "Adults"], CHD: ["Child", "Children"], INF: ["Infant", "Infants"] };
