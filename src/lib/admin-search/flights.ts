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
export type SortOrder = "price" | "price_desc" | "duration" | "duration_desc" | "departure" | "arrival";

/** The sort options, as the public results page offers them (plus arrival). Display order only. */
export const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "price", label: "Price, low to high" },
  { value: "price_desc", label: "Price, high to low" },
  { value: "duration", label: "Shortest duration" },
  { value: "duration_desc", label: "Longest duration" },
  { value: "departure", label: "Departure, early to late" },
  { value: "arrival", label: "Arrival, early to late" },
];

export interface ResultFilters {
  airline: string;
  stops: StopsFilter;
  time: TimeFilter;
  refund: RefundFilter;
  /** "any", a baggage text from the results, or NO_BAGGAGE_INFO. */
  baggage: string;
  /** "any" or a PriceBand value ("lo-hi" in minor units). */
  price: string;
  /** "any" or a provider name the gateway sent (only to roles that may see it). */
  provider: string;
  sort: SortOrder;
}

export const DEFAULT_FILTERS: ResultFilters = { airline: "any", stops: "any", time: "any", refund: "any", baggage: "any", price: "any", provider: "any", sort: "price" };

export const NO_BAGGAGE_INFO = "__none__";

/** Baggage values present in the results (no invented options). */
export function baggageOptions(flights: FlightView[]) {
  const values = new Set<string>();
  let missing = false;
  for (const fare of flights.flatMap(flight => flight.fares)) {
    if (fare.baggage) values.add(fare.baggage);
    else missing = true;
  }
  return [
    ...[...values].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(value => ({ value, label: value })),
    ...(missing ? [{ value: NO_BAGGAGE_INFO, label: "Baggage info not available" }] : []),
  ];
}

export interface PriceBand { value: string; label: string; min: number; max: number }

const rupees = (minor: number) => `Rs ${(minor / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;

/** Up to three price bands spanning the real selling prices, in whole Rs 1,000 steps. */
export function priceBands(flights: FlightView[]): PriceBand[] {
  const prices = flights.flatMap(flight => flight.fares).map(fare => fare.selling_price?.amount_minor).filter((n): n is number => n != null);
  if (new Set(prices).size < 2) return [];
  const step = 100_000;  // Rs 1,000
  const low = Math.floor(Math.min(...prices) / step) * step;
  const high = Math.ceil((Math.max(...prices) + 1) / step) * step;
  const width = Math.max(step, Math.ceil((high - low) / 3 / step) * step);
  const bands: PriceBand[] = [];
  for (let min = low; min < high; min += width) {
    const max = Math.min(min + width, high);
    if (prices.some(price => price >= min && price < max)) bands.push({ value: `${min}-${max}`, label: `${rupees(min)} – ${rupees(max)}`, min, max });
  }
  return bands;
}

const inBand = (band: string, fare: FareView) => {
  if (band === "any") return true;
  const [min, max] = band.split("-").map(Number);
  const price = fare.selling_price?.amount_minor;
  return price != null && price >= min && price < max;
};

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

const finite = (value: number) => (Number.isFinite(value) ? value : -1);
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
      fares: flight.fares
        .filter(fare => filters.refund === "any" || isRefundable(fare) === (filters.refund === "refundable"))
        .filter(fare => filters.baggage === "any" || (filters.baggage === NO_BAGGAGE_INFO ? !fare.baggage : fare.baggage === filters.baggage))
        .filter(fare => inBand(filters.price, fare))
        .filter(fare => filters.provider === "any" || fare.supplier === filters.provider),
    }))
    .filter(flight => flight.fares.length > 0);
  const byDeparture = (a: FlightView, b: FlightView) => (a.departure_local ?? "").localeCompare(b.departure_local ?? "");
  const byArrival = (a: FlightView, b: FlightView) => (a.arrival_local ?? "~").localeCompare(b.arrival_local ?? "~");
  const duration = (flight: FlightView) => flight.duration_minutes ?? Infinity;
  return kept.sort((a, b) => {
    if (filters.sort === "departure") return byDeparture(a, b);
    if (filters.sort === "arrival") return byArrival(a, b) || byDeparture(a, b);
    if (filters.sort === "duration") return duration(a) - duration(b) || byDeparture(a, b);
    if (filters.sort === "duration_desc") return (b.duration_minutes ?? -1) - (a.duration_minutes ?? -1) || byDeparture(a, b);
    // High to low by each flight's lowest fare (as on the public site); flights without a price stay last.
    if (filters.sort === "price_desc") return finite(lowestPrice(b)) - finite(lowestPrice(a)) || byDeparture(a, b);
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

export type HoldRequest = Schemas["HoldRequest"];
export type HoldPassenger = Schemas["HoldPassenger"];
export type HoldView = Schemas["HoldView"];

export type RequestView = Schemas["RequestView"];

/** Request to book (restricted airlines): saved for Travelian's team; the gateway never calls a supplier for it. */
export const requestFlight = (request: HoldRequest, options?: GatewayOptions) =>
  gatewayPost("/v1/live-ticketing/flights/requests", request, {
    unavailableMessage: "The request couldn't be sent right now. Try again.", ...options,
  });

export const holdFlight = (request: HoldRequest, options?: GatewayOptions) =>
  gatewayPost("/v1/live-ticketing/flights/bookings", request, {
    unavailableMessage: "The hold couldn't be placed right now. Check the booking list before trying again.", ...options,
  });
