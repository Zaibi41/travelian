import type { Flight } from "@/data/models";
import { normalizeAirlineName } from "./airline-normalization";

import { API_BASE_URL } from "./api-config";
import { baggageText } from "./baggage";

export interface FlightSearchInput {
  tripType: "oneway" | "roundtrip" | "multicity";
  from: string;
  to: string;
  departureDate: string;
  returnDate?: string;
  segments?: {
    from: string;
    to: string;
    date: string;
  }[];
  cabin: string;
  fareBrand?: string | null;
  currency: string;
  passengers: {
    adults: number;
    children: number;
    infants: number;
  };
}

interface FlightOffer {
  provider: string;
  offerId: string;
  airline: string;
  airlineImage?: string | null;
  flightNumber: string;
  origin: string;
  destination: string;
  originAirport?: string | null;
  destinationAirport?: string | null;
  departureTime: string;
  arrivalTime: string;
  cabin: string;
  fareBrand?: string | null;

  duration?: string | null;
  stops?: number | null;
  baggage?: string | null;
  meal?: string | null;
  refundable?: boolean | null;
  seats?: number | string | null;
  segments?: Flight["segments"];
  layovers?: Flight["layovers"];
  returnDepartureTime?: string | null;
  returnArrivalTime?: string | null;
  price: {
    currency: string;
    base?: number | null;
    taxes?: number | null;
    total: number;
  };
  fareOptions?: FareOption[];
  rawRef?: { faresPayload?: { ref_id: string; legs: { ref_id: string }[] }; flightRefIds?: string[] };
}

interface FlightSearchResponse {
  searchId: string;
  durationMs: number;
  providerStatus: Record<string, string>;
  results: FlightOffer[];
}

export interface FareOption {
  tier: string;
  price: {
    currency: string;
    base?: number | null;
    taxes?: number | null;
    total: number;
  };
  /** Baggage, short form ("7+20 kg"; #36). */
  bags: string;
  /** Baggage in full words, for tooltips and fare details ("7 kg hand carry + 20 kg checked"). */
  bagsDetail?: string;
  change: string;
  refund: string;
  meal?: string;
  amenities?: string[];
  popular?: boolean;
  /** A round trip's baggage per flight ("Outbound", "Return"), for the Baggage tab (#123). */
  legBags?: { label: string; bags: string; bagsDetail: string }[];
  /** Gateway fare ids (outbound, then return): checkout sends these, never a price, to the gateway (B19). */
  gatewayFareIds?: string[];
}

export type TravelianFlight = Flight & {
  provider?: string;
  offerId?: string;
  airlineImage?: string;
  airlineCode?: string;
  fareBrand?: string;
  fareOptions?: FareOption[];
  refundable?: boolean;
  rawRef?: FlightOffer["rawRef"];
  /** The gateway search this flight came from (its fares are booked by reference to it). */
  gatewaySearchId?: string;
};

export async function fetchFlightFares(flight: TravelianFlight, signal?: AbortSignal): Promise<FareOption[]> {
  if (flight.provider !== "sooperfare" || !flight.rawRef?.faresPayload) {
    throw new Error("Fare options are unavailable for this flight.");
  }
  const response = await fetch(`${API_BASE_URL}/flights/fares`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      provider: flight.provider,
      offerId: flight.offerId,
      airline: flight.airline,
      flightNumber: flight.flightNumber,
      origin: flight.origin,
      destination: flight.destination,
      cabin: flight.class,
      rawRef: flight.rawRef,
    }),
  });
  const payload = await response.json().catch(() => null) as { result?: { fareOptions?: FareOption[] }; error?: string } | null;
  if (!response.ok) throw new Error(payload?.error || "Unable to load fare options. Please try again.");
  return payload?.result?.fareOptions || [];
}

export interface FareHydrationProgress {
  loaded: number;
  total: number;
}

export type OnFlightHydratedCallback = (
  updatedFlight: TravelianFlight,
  index: number,
  progress: FareHydrationProgress,
) => void;

export async function hydrateSooperFareOptions(
  flights: TravelianFlight[],
  signal?: AbortSignal,
  concurrency = 4,
  onFlightHydrated?: OnFlightHydratedCallback,
): Promise<TravelianFlight[]> {
  const hydrated = [...flights];
  const indexes = flights
    .map((flight, index) =>
      flight.provider === "sooperfare" &&
      flight.rawRef?.faresPayload &&
      (!flight.fareOptions || flight.fareOptions.length <= 1)
        ? index
        : -1,
    )
    .filter((index) => index >= 0);

  if (!indexes.length) {
    return hydrated;
  }

  let cursor = 0;
  let loadedCount = 0;

  const worker = async () => {
    while (cursor < indexes.length) {
      if (signal?.aborted) return;
      const currentIndex = cursor++;
      const flightIndex = indexes[currentIndex];
      const flight = flights[flightIndex];
      try {
        const fareOptions = await fetchFlightFares(flight, signal);
        if (fareOptions.length) {
          const lowestFare = fareOptions.reduce((lowest, fare) =>
            fare.price.total < lowest.price.total ? fare : lowest,
          );
          hydrated[flightIndex] = {
            ...flight,
            fareOptions,
            fareBrand: lowestFare.tier,
            price: lowestFare.price.total,
            currency: lowestFare.price.currency || flight.currency,
            baggage: lowestFare.bags || flight.baggage,
          };
        }
      } catch (error) {
        if (signal?.aborted) throw error;
        // Keep the search fare when the supplier cannot expand this one offer.
      } finally {
        loadedCount++;
        onFlightHydrated?.(hydrated[flightIndex], flightIndex, {
          loaded: loadedCount,
          total: indexes.length,
        });
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, indexes.length) }, () => worker()));
  return hydrated;
}

export interface FlightSearchResult {
  searchId: string;
  providerStatus: Record<string, string>;
  flights: TravelianFlight[];
}

export interface HotelSearchInput {
  location: string;
  checkIn: string;
  checkOut: string;
  rooms?: number;
  guests?: {
    adults: number;
    children: number;
  };
  currency: string;
}

export interface HotelOffer {
  provider: string;
  hotelId: string;
  name: string;
  city: string;
  country: string;
  starRating: number;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  rooms: number;
  amenities: string[];
  refundable?: boolean;
  image?: string | null;
}

export function extractAirportCode(value: string) {
  const text = String(value || "");
  const match = text.match(/\(([A-Z]{3})\)/i) || text.trim().match(/^([A-Z]{3})$/i);
  return match?.[1].toUpperCase() || "";
}

// ---------- flights through the Travelian gateway (/v1/public/flights/search; admin: /v1/live-ticketing/flights/search) ----------
// Every flight supplier is called from the gateway's static IP (SooperFare only accepts that IP), and the gateway
// returns selling prices only. The answer is turned into the offer shape this page already shows.

/** Provider label for flights priced by the gateway (never a supplier name on the public site). */
export const GATEWAY_FLIGHT_PROVIDER = "travelian";

interface GatewayMoney { amount_minor: number; currency: string }
interface GatewayFare { id: string; name: string; meal?: string; baggage?: string; baggage_detail?: string; refund?: string; selling_price?: GatewayMoney }
/** One flight of a connection; layover_minutes: time on the ground at `origin` before it (left out for the first). */
interface GatewaySegment {
  flight_number?: string; origin: string; destination: string; departure_local?: string; arrival_local?: string;
  duration_minutes?: number; layover_minutes?: number;
}
interface GatewayFlight {
  id: string; airline_code?: string; airline_name?: string; flight_number?: string; departure_local?: string; arrival_local?: string;
  duration_minutes?: number; stops?: number; stop_cities?: string[]; segments?: GatewaySegment[]; fares: GatewayFare[];
}
interface GatewayJourney { direction: "outbound" | "return"; origin: string; destination: string; flights: GatewayFlight[] }
interface GatewaySearchView { search_id: string; status: "complete" | "unavailable"; notice?: string; journeys: GatewayJourney[] }

function gatewayBaseUrl() {
  return (import.meta.env.VITE_TRAVELIAN_GATEWAY_BASE_URL?.trim() || "").replace(/\/+$/, "");
}

const priced = (flight: GatewayFlight) => flight.fares.filter((fare) => fare.selling_price && fare.selling_price.amount_minor > 0);
const rupees = (money?: GatewayMoney) => (money ? money.amount_minor / 100 : 0);

function minutesText(minutes?: number) {
  return typeof minutes === "number" && minutes > 0 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : undefined;
}

/** A round trip's baggage: one value when both flights have the same allowance, else outbound / return. */
function fareBags(fare: GatewayFare, back?: GatewayFare) {
  const out = baggageText(fare.baggage, fare.baggage_detail);
  if (!back) return { bags: out.short, bagsDetail: out.detail };
  const ret = baggageText(back.baggage, back.baggage_detail);
  if (out.short === ret.short) return { bags: out.short, bagsDetail: out.detail };
  return { bags: `${out.short} / ${ret.short}`, bagsDetail: `Outbound: ${out.detail}. Return: ${ret.detail}.` };
}

/** Each flight's own baggage on a round trip (#123): outbound, then return. */
function legBags(fare: GatewayFare, back: GatewayFare) {
  return ([["Outbound", fare], ["Return", back]] as const).map(([label, item]) => {
    const text = baggageText(item.baggage, item.baggage_detail);
    return { label, bags: text.short, bagsDetail: text.detail };
  });
}

function fareOption(fare: GatewayFare, extra?: GatewayFare): FareOption {
  const total = rupees(fare.selling_price) + rupees(extra?.selling_price);
  return {
    tier: fare.name,
    price: { currency: fare.selling_price?.currency || "PKR", total },
    ...fareBags(fare, extra),
    change: "As per airline fare rules",
    refund: fare.refund || "As per airline fare rules",
    meal: fare.meal || undefined,
    ...(extra ? { legBags: legBags(fare, extra) } : {}),
    gatewayFareIds: [fare.id, extra?.id].filter((id): id is string => Boolean(id)),
  };
}

function gatewaySegment(flight: GatewayFlight, origin: string, destination: string) {
  return {
    carrier: flight.airline_code || null, airline: flight.airline_name || null, flightNumber: flight.flight_number || null,
    origin, destination, departureAirport: origin, arrivalAirport: destination,
    departureTime: flight.departure_local || null, arrivalTime: flight.arrival_local || null,
    duration: minutesText(flight.duration_minutes) || null,
  };
}

/** A flight's own flights (a connection has one per stop); one segment for the whole trip when the gateway sent none. */
function gatewaySegments(flight: GatewayFlight, origin: string, destination: string) {
  if (!flight.segments?.length) return [gatewaySegment(flight, origin, destination)];
  return flight.segments.map((segment) => ({
    carrier: flight.airline_code || null, airline: flight.airline_name || null, flightNumber: segment.flight_number || null,
    origin: segment.origin, destination: segment.destination, departureAirport: segment.origin, arrivalAirport: segment.destination,
    departureTime: segment.departure_local || null, arrivalTime: segment.arrival_local || null,
    duration: minutesText(segment.duration_minutes) || null,
  }));
}

/** Where the passenger stays and for how long (#37, #83, #84): one per stop, in order. Only the stop city when the
 *  gateway sent no flight-by-flight detail. */
function gatewayLayovers(flight: GatewayFlight) {
  const segments = flight.segments || [];
  if (segments.length > 1) {
    return segments.slice(1).map((segment, index) => ({
      location: segment.origin, duration: minutesText(segment.layover_minutes) || null,
      arrivalTime: segments[index].arrival_local || null, departureTime: segment.departure_local || null,
      nextFlightNumber: segment.flight_number || null,
    }));
  }
  return (flight.stop_cities || []).filter(Boolean).map((location) => ({ location }));
}

/** Gateway journeys -> offers: one-way, one per flight; round trip, each outbound with the cheapest return of the same airline. */
export function gatewayOffers(view: GatewaySearchView, cabin: string): FlightOffer[] {
  const outbound = view.journeys.find((journey) => journey.direction === "outbound");
  const back = view.journeys.find((journey) => journey.direction === "return");
  if (!outbound) return [];
  const offers: FlightOffer[] = [];
  for (const flight of outbound.flights) {
    const fares = priced(flight);
    if (!fares.length) continue;
    let returnFlight: GatewayFlight | undefined;
    let returnFare: GatewayFare | undefined;
    if (back) {
      for (const candidate of back.flights.filter((item) => item.airline_code && item.airline_code === flight.airline_code)) {
        const cheapest = priced(candidate).sort((a, b) => rupees(a.selling_price) - rupees(b.selling_price))[0];
        if (cheapest && (!returnFare || rupees(cheapest.selling_price) < rupees(returnFare.selling_price))) {
          returnFlight = candidate;
          returnFare = cheapest;
        }
      }
      if (!returnFlight || !returnFare) continue; // a round trip needs a return on the same airline
    }
    const options = fares.map((fare) => fareOption(fare, returnFare)).sort((a, b) => a.price.total - b.price.total);
    const lowest = options[0];
    const segments = gatewaySegments(flight, outbound.origin, outbound.destination);
    if (returnFlight && back) segments.push(...gatewaySegments(returnFlight, back.origin, back.destination));
    offers.push({
      provider: GATEWAY_FLIGHT_PROVIDER,
      offerId: returnFlight ? `gw-${flight.id}-${returnFlight.id}` : `gw-${flight.id}`,
      airline: flight.airline_name || flight.airline_code || "Airline",
      flightNumber: flight.flight_number || "Not specified",
      origin: outbound.origin, destination: outbound.destination,
      departureTime: flight.departure_local || "", arrivalTime: flight.arrival_local || "",
      cabin, fareBrand: lowest.tier, duration: minutesText(flight.duration_minutes), stops: flight.stops ?? 0,
      baggage: lowest.bags, meal: lowest.meal || null,
      segments: segments as FlightOffer["segments"],
      // Outbound stays only: layovers[i] is the stay after segments[i] (the booking page reads them that way).
      layovers: gatewayLayovers(flight),
      returnDepartureTime: returnFlight?.departure_local || null, returnArrivalTime: returnFlight?.arrival_local || null,
      price: lowest.price, fareOptions: options,
    });
  }
  return offers;
}

export interface FlightSearchOptions {
  /** Admin screens (agency and back office): the signed-in route /v1/live-ticketing/flights/search, with the user's
   *  token, so the gateway leaves out what the role may not receive (supplier names, cost, margin; #130).
   *  The public website: /v1/public/flights/search (selling prices only). */
  signedIn?: boolean;
}

const SIGNED_IN_UNAVAILABLE = "Flight search can't run right now. The flight supplier isn't responding; try again in a few minutes.";

export async function searchFlights(input: FlightSearchInput, signal?: AbortSignal, options: FlightSearchOptions = {}): Promise<FlightSearchResult> {
  const origin = extractAirportCode(input.from);
  const destination = extractAirportCode(input.to);
  if (!origin || !destination) {
    throw new Error("Please use 3-letter airport codes, for example SKT to LHR.");
  }
  if (input.tripType === "multicity") {
    throw new Error("Multi-city search isn't available online yet. Please contact Travelian.");
  }
  const cabin = String(input.cabin || "economy").toLowerCase().replace(/\s+/g, "_");
  const body = {
    origin, destination, departure_date: input.departureDate,
    return_date: input.tripType === "roundtrip" ? input.returnDate || null : null,
    adults: input.passengers.adults, children: input.passengers.children, infants: input.passengers.infants,
    cabin: (["economy", "premium_economy", "business", "first"].includes(cabin) ? cabin : "economy") as "economy" | "premium_economy" | "business" | "first",
    currency: input.currency || "PKR",
  };
  let payload: GatewaySearchView;
  if (options.signedIn) {
    // Loaded only on admin screens, so the public site's bundle doesn't carry the signed-in client.
    const { gatewayPost } = await import("@/lib/gateway/client");
    payload = await gatewayPost("/v1/live-ticketing/flights/search", body, { signal, unavailableMessage: SIGNED_IN_UNAVAILABLE });
  } else {
    const base = gatewayBaseUrl();
    if (!base) throw new Error("Flight search is unavailable right now.");
    const response = await fetch(`${base}/v1/public/flights/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      signal,
      body: JSON.stringify(body),
    });
    const answer = await response.json().catch(() => null) as GatewaySearchView | { detail?: unknown } | null;
    if (!response.ok || !answer || !("journeys" in answer)) {
      const detail = answer && "detail" in answer && typeof answer.detail === "string" ? answer.detail : "Flight search failed. Please try again.";
      throw new Error(detail);
    }
    payload = answer;
  }
  return {
    searchId: payload.search_id,
    providerStatus: {},
    flights: gatewayOffers(payload, input.cabin || "Economy").map(mapOfferToFlight).map((flight) => ({ ...flight, gatewaySearchId: payload.search_id })),
  };
}

export async function searchHotels(input: HotelSearchInput, signal?: AbortSignal): Promise<{ hotels: HotelOffer[]; providerStatus: Record<string, string> }> {
  const response = await fetch(`${API_BASE_URL}/hotels/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      location: input.location,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      rooms: input.rooms || 1,
      guests: input.guests || { adults: 2, children: 0 },
      currency: input.currency || "PKR",
      providers: ["travelport"],
    }),
  });

  const payload = await response.json().catch(() => null) as { results?: HotelOffer[]; providerStatus?: Record<string, string>; error?: string; details?: string[] } | null;
  if (!response.ok) {
    const details = payload?.details?.length ? `: ${payload.details.join(", ")}` : "";
    throw new Error(`${payload?.error || "Hotel search failed"}${details}`);
  }

  return {
    hotels: payload?.results || [],
    providerStatus: payload?.providerStatus || {},
  };
}

function mapOfferToFlight(offer: FlightOffer): TravelianFlight {
  // Local airport times, kept exactly as sent (SooperFare, and every flight priced by the Travelian gateway).
  const preserveAirportTime = ["sooperfare", GATEWAY_FLIGHT_PROVIDER].includes(safeText(offer.provider).toLowerCase());
  const formatTime = (value: string | null | undefined) => formatFlightDateTime(value, preserveAirportTime);
  const flightNumber = safeText(offer.flightNumber, "Not specified");
  const airline = normalizeAirlineName(safeText(offer.airline, "Airline"));
  const origin = safeText(offer.origin);
  const destination = safeText(offer.destination);
  const cabin = safeText(offer.cabin, "Economy");
  const segments = (offer.segments || []).map((segment) => ({
    ...segment,
    departureTimestamp: preserveAirportTime ? segment.departureTime : undefined,
    arrivalTimestamp: preserveAirportTime ? segment.arrivalTime : undefined,
    departureTime: formatTime(segment.departureTime),
    arrivalTime: formatTime(segment.arrivalTime),
  }));
  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];

  return {
    flightId: safeText(offer.offerId, `${safeText(offer.provider, "provider")}-${flightNumber}`),
    provider: safeText(offer.provider),
    offerId: safeText(offer.offerId),
    airlineImage: safeText(offer.airlineImage),
    airline,
    flightNumber,
    origin,
    destination,
    originAirport: safeText(offer.originAirport || firstSegment?.departureAirport),
    destinationAirport: safeText(offer.destinationAirport || lastSegment?.arrivalAirport),
    departureTime: formatTime(offer.departureTime),
    arrivalTime: formatTime(offer.arrivalTime),
    departureTimestamp: preserveAirportTime ? offer.departureTime : undefined,
    arrivalTimestamp: preserveAirportTime ? offer.arrivalTime : undefined,
    price: offer.price?.total || 0,
    currency: offer.price?.currency || "PKR",
    seats: normalizeSeats(offer.seats),
    status: "scheduled",
    class: normalizeCabin(cabin),
    fareBrand: safeText(offer.fareBrand),
    fareOptions: offer.fareOptions || [],
    rawRef: offer.rawRef,
    duration: offer.duration || undefined,
    stops: offer.stops ?? undefined,
    baggage: offer.baggage || undefined,
    meal: offer.meal || undefined,
    refundable: offer.refundable,
    segments,
    layovers: (offer.layovers || []).map((layover) => ({
      ...layover,
      arrivalTime: formatTime(layover.arrivalTime),
      departureTime: formatTime(layover.departureTime),
    })),
    returnDepartureTime: offer.returnDepartureTime ? formatTime(offer.returnDepartureTime) : undefined,
    returnArrivalTime: offer.returnArrivalTime ? formatTime(offer.returnArrivalTime) : undefined,
    returnDepartureTimestamp: preserveAirportTime ? offer.returnDepartureTime || undefined : undefined,
    returnArrivalTimestamp: preserveAirportTime ? offer.returnArrivalTime || undefined : undefined,
  };
}

function normalizeCabin(cabin: string): Flight["class"] {
  const value = String(cabin || "").toLowerCase();
  if (value.includes("business")) return "business";
  if (value.includes("first")) return "first";
  return "economy";
}

function formatFlightDateTime(value: string | null | undefined, preserveAirportTime = false) {
  if (!value) return "";
  const text = String(value);
  // For SooperFare and any provider that sends local airport times, preserve them exactly
  if (preserveAirportTime) {
    // Match both "2026-09-20T07:20" and "2026-09-20 07:20" formats
    const localTime = text.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2})?/);
    if (localTime) return `${localTime[1]} ${localTime[2]}`;
    // Fallback: if it's already in "YYYY-MM-DD HH:MM" format, return as-is (remove seconds if present)
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(text)) {
      const withoutSeconds = text.slice(0, 16);
      return withoutSeconds;
    }
  }
  // For other providers, convert to browser local time
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return text.replace("T", " ").slice(0, 16);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function safeText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function normalizeSeats(value: unknown) {
  const seats = Number(value);
  return Number.isFinite(seats) && seats > 0 ? seats : undefined;
}
