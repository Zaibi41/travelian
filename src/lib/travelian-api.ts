import type { Flight } from "@/data/models";
import { normalizeAirlineName } from "./airline-normalization";

const API_BASE_URL = (import.meta.env.VITE_TRAVELIAN_API_BASE_URL || "https://api.travelian.pk").replace(/\/$/, "");

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
  bags: string;
  change: string;
  refund: string;
  amenities?: string[];
  popular?: boolean;
}

export type TravelianFlight = Flight & {
  provider?: string;
  offerId?: string;
  airlineImage?: string;
  fareBrand?: string;
  fareOptions?: FareOption[];
  rawRef?: FlightOffer["rawRef"];
};

export async function fetchFlightFares(flight: TravelianFlight): Promise<FareOption[]> {
  if (flight.provider !== "sooperfare" || !flight.rawRef?.faresPayload) {
    throw new Error("Fare options are unavailable for this flight.");
  }
  const response = await fetch(`${API_BASE_URL}/flights/fares`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

export interface TransferSearchInput {
  pickup: string;
  dropoff: string;
  pickupDate: string;
  pickupTime?: string;
  passengers?: number;
  currency: string;
}

export interface TransferOffer {
  provider: string;
  transferId: string;
  vehicleName: string;
  pickup: string;
  dropoff: string;
  pickupDate: string;
  pickupTime: string;
  passengers: number;
  bags: number;
  durationMinutes: number;
  cancellationPolicy: string;
  price: {
    currency: string;
    total: number;
  };
}

export function extractAirportCode(value: string) {
  const text = String(value || "");
  const match = text.match(/\(([A-Z]{3})\)/i) || text.trim().match(/^([A-Z]{3})$/i);
  return match?.[1].toUpperCase() || "";
}

export async function searchFlights(input: FlightSearchInput, signal?: AbortSignal): Promise<FlightSearchResult> {
  const origin = extractAirportCode(input.from);
  const destination = extractAirportCode(input.to);

  if (!origin || !destination) {
    throw new Error("Please use 3-letter airport codes, for example SKT to LHR.");
  }

  const response = await fetch(`${API_BASE_URL}/flights/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      tripType: input.tripType,
      origin,
      destination,
      departureDate: input.departureDate,
      returnDate: input.returnDate,
      segments: input.segments,
      cabin: input.cabin,
      passengers: input.passengers,
      currency: input.currency || "PKR",
    }),
  });

  const payload = await response.json().catch(() => null) as FlightSearchResponse | { error?: string; details?: string[] } | null;
  if (!response.ok) {
    const message = payload && "error" in payload && payload.error ? payload.error : "Flight search failed";
    const details = payload && "details" in payload && Array.isArray(payload.details) ? `: ${payload.details.join(", ")}` : "";
    throw new Error(`${message}${details}`);
  }

  const data = payload as FlightSearchResponse;
  return {
    searchId: data.searchId,
    providerStatus: data.providerStatus || {},
    flights: (data.results || []).map(mapOfferToFlight),
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

export async function searchTransfers(input: TransferSearchInput, signal?: AbortSignal): Promise<{ transfers: TransferOffer[]; providerStatus: Record<string, string> }> {
  const response = await fetch(`${API_BASE_URL}/transfers/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      pickup: input.pickup,
      dropoff: input.dropoff,
      pickupDate: input.pickupDate,
      pickupTime: input.pickupTime || "10:00",
      passengers: input.passengers || 1,
      currency: input.currency || "PKR",
      providers: ["travelport"],
    }),
  });

  const payload = await response.json().catch(() => null) as { results?: TransferOffer[]; providerStatus?: Record<string, string>; error?: string; details?: string[] } | null;
  if (!response.ok) {
    const details = payload?.details?.length ? `: ${payload.details.join(", ")}` : "";
    throw new Error(`${payload?.error || "Transfer search failed"}${details}`);
  }

  return {
    transfers: payload?.results || [],
    providerStatus: payload?.providerStatus || {},
  };
}

function mapOfferToFlight(offer: FlightOffer): TravelianFlight {
  const preserveAirportTime = safeText(offer.provider).toLowerCase() === "sooperfare";
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
