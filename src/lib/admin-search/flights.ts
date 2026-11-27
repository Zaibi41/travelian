// Live flight search on travelian-api-gateway (/v1/live-ticketing/flights/search, Southair).
// The gateway decides what each role receives (D23): opaque IDs and the selling price;
// supplier name and cost only with permission. This page shows the selling price only.

import { gatewayPost, type GatewayOptions } from "@/lib/gateway/client";
import { baggageFilterOptions, baggageText, underBaggageLabel } from "@/lib/baggage";
import type { components } from "@/lib/gateway/schema";
import { MAX_MULTI_CITY_FLIGHTS } from "@/lib/flight-search-limits";

type Schemas = components["schemas"];
export type FlightSearchView = Schemas["FlightSearchView"];
export type JourneyView = Schemas["JourneyView"];
export type FlightView = Schemas["FlightView"];
export type FareView = Schemas["FareView"];
export type FlightMoney = Schemas["FlightMoney"];

const UNAVAILABLE = "Flight search can't run right now. The flight supplier isn't responding; try again in a few minutes.";

/** A multi-city flight after the first (the first is from / to / date). */
export interface FlightLeg {
  from?: string;
  to?: string;
  /** yyyy-mm-dd */
  date?: string;
}

/** Multi-city: at most this many flights, as on the public site (the gateway accepts up to 5). */
export const MAX_FLIGHTS = MAX_MULTI_CITY_FLIGHTS;

export interface FlightSearch {
  trip: "oneway" | "roundtrip" | "multicity";
  from?: string;
  to?: string;
  /** yyyy-mm-dd */
  date?: string;
  returnDate?: string;
  /** Multi-city: flights 2, 3, ... (URL: one `leg=FROM,TO,yyyy-mm-dd` each). */
  moreLegs: FlightLeg[];
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
  const tripParam = params.get("trip");
  const trip = tripParam === "roundtrip" || tripParam === "multicity" ? tripParam : "oneway";
  const legCode = (value?: string) => (value && CODE.test(value.trim().toUpperCase()) ? value.trim().toUpperCase() : undefined);
  const moreLegs = trip === "multicity"
    ? params.getAll("leg").slice(0, MAX_FLIGHTS - 1).map((value): FlightLeg => {
      const [from, to, day] = value.split(",");
      return { from: legCode(from), to: legCode(to), date: day && DATE.test(day) ? day : undefined };
    })
    : [];
  return {
    trip,
    from: code("from"),
    to: code("to"),
    date: date("date"),
    returnDate: trip === "roundtrip" ? date("return") : undefined,
    moreLegs: trip === "multicity" && !moreLegs.length ? [{}] : moreLegs,
    adults: count(params.get("adults"), 1, 9, 1),
    children: count(params.get("children"), 0, 8, 0),
    infants: count(params.get("infants"), 0, 8, 0),
  };
}

export function writeFlightSearch(params: URLSearchParams, search: FlightSearch): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const key of ["trip", "from", "to", "date", "return", "leg", "adults", "children", "infants"]) next.delete(key);
  if (search.trip !== "oneway") next.set("trip", search.trip);
  if (search.from) next.set("from", search.from);
  if (search.to) next.set("to", search.to);
  if (search.date) next.set("date", search.date);
  if (search.trip === "roundtrip" && search.returnDate) next.set("return", search.returnDate);
  if (search.trip === "multicity") for (const leg of search.moreLegs) next.append("leg", [leg.from ?? "", leg.to ?? "", leg.date ?? ""].join(","));
  if (search.adults !== 1) next.set("adults", String(search.adults));
  if (search.children) next.set("children", String(search.children));
  if (search.infants) next.set("infants", String(search.infants));
  return next;
}

export function isCompleteFlightSearch(search: FlightSearch): search is FlightSearch & { from: string; to: string; date: string } {
  if (!search.from || !search.to || !search.date || search.from === search.to) return false;
  if (search.infants > search.adults) return false;
  if (search.trip === "roundtrip") return Boolean(search.returnDate && search.returnDate >= search.date);
  if (search.trip === "multicity") return search.moreLegs.length > 0 && legProblems(search).every(problem => problem === null);
  return true;
}

/** Every flight of the search in order: the first (from / to / date), then multi-city's others. */
export const searchLegs = (search: FlightSearch): FlightLeg[] =>
  [{ from: search.from, to: search.to, date: search.date }, ...(search.trip === "multicity" ? search.moreLegs : [])];

/** Multi-city flights 2, 3, ...: null when the flight is ready to search; "" while a field is still empty (nothing to
 *  show yet); otherwise the message to show under its fields. */
export function legProblems(search: FlightSearch): (string | null)[] {
  const legs = searchLegs(search);
  return search.moreLegs.map((leg, index) => {
    if (leg.from && leg.from === leg.to) return "Origin and destination are the same airport. Choose a different destination.";
    const previous = legs[index].date;
    if (leg.date && previous && leg.date < previous) return `Choose a date on or after flight ${index + 1}'s date.`;
    return leg.from && leg.to && leg.date ? null : "";
  });
}

/** A new multi-city flight leaves where the last one lands. */
export const nextFlightLeg = (search: FlightSearch): FlightLeg => ({ from: searchLegs(search).at(-1)?.to });

/** A journey's own key: its leg number (multi-city), else its direction. Fare picks are kept per journey. */
export const journeyKey = (journey: Pick<JourneyView, "direction" | "leg">) => (journey.leg ? `leg-${journey.leg}` : journey.direction);

/** "Outbound", "Return", or multi-city's "Flight 2". */
export const journeyLabel = (journey: Pick<JourneyView, "direction" | "leg">) =>
  journey.leg ? `Flight ${journey.leg}` : journey.direction === "outbound" ? "Outbound" : "Return";

/** The date searched for a journey. */
export function journeyDate(search: FlightSearch, journey: Pick<JourneyView, "direction" | "leg">) {
  if (journey.leg) return searchLegs(search)[journey.leg - 1]?.date;
  return journey.direction === "outbound" ? search.date : search.returnDate;
}

export const searchFlights = (search: FlightSearch & { from: string; to: string; date: string }, options?: GatewayOptions) =>
  gatewayPost(
    "/v1/live-ticketing/flights/search",
    {
      origin: search.from, destination: search.to, departure_date: search.date,
      return_date: search.trip === "roundtrip" ? search.returnDate ?? null : null,
      ...(search.trip === "multicity"
        ? { legs: searchLegs(search).map(leg => ({ origin: leg.from!, destination: leg.to!, departure_date: leg.date! })) }
        : {}),
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
  /** "any", or a baggage short form from the results ("7 kg", "7+20 kg", "Baggage: check with airline"). */
  baggage: string;
  /** "any" or a PriceBand value ("lo-hi" in minor units). */
  price: string;
  /** "any" or a provider name the gateway sent (only to roles that may see it). */
  provider: string;
  sort: SortOrder;
}

export const DEFAULT_FILTERS: ResultFilters = { airline: "any", stops: "any", time: "any", refund: "any", baggage: "any", price: "any", provider: "any", sort: "price" };

/** A fare's baggage as shown (#36): the gateway's short form and full words. */
export const fareBaggage = (fare: FareView) => baggageText(fare.baggage, fare.baggage_detail);

/** Baggage values present in the results (no invented options), in the short form, lightest first. */
export function baggageOptions(flights: FlightView[]) {
  return baggageFilterOptions(flights.flatMap(flight => flight.fares).map(fareBaggage)).map(option => ({ ...option, label: underBaggageLabel(option.label) }));
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
        .filter(fare => filters.baggage === "any" || fareBaggage(fare).short === filters.baggage)
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

/** The website's fare calendar for the admin date picker (lowest real selling price per adult per date; ask again while
 *  `pending`). Same arguments as the website's call, so the shared hook takes either. */
export const adminFlightCalendar = (origin: string, destination: string, adults: number, cabin: string, signal?: AbortSignal, start?: string) =>
  gatewayPost("/v1/live-ticketing/flights/calendar", { origin, destination, adults, cabin: cabin as "economy" | "premium_economy" | "business" | "first", ...(start ? { start } : {}) }, { signal });
