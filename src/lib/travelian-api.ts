import type { Flight } from "@/data/models";

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
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  cabin: string;
  duration?: string | null;
  stops?: number | null;
  baggage?: string | null;
  meal?: string | null;
  returnDepartureTime?: string | null;
  returnArrivalTime?: string | null;
  price: {
    currency: string;
    total: number;
  };
  fareOptions?: FareOption[];
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
    total: number;
  };
  bags: string;
  change: string;
  refund: string;
  popular?: boolean;
}

export type TravelianFlight = Flight & {
  provider?: string;
  offerId?: string;
  fareOptions?: FareOption[];
};

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
  const match = value.match(/\(([A-Z]{3})\)/i) || value.trim().match(/^([A-Z]{3})$/i);
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
  return {
    flightId: offer.offerId,
    provider: offer.provider,
    offerId: offer.offerId,
    airline: offer.airline,
    flightNumber: offer.flightNumber,
    origin: offer.origin,
    destination: offer.destination,
    departureTime: formatFlightDateTime(offer.departureTime),
    arrivalTime: formatFlightDateTime(offer.arrivalTime),
    price: offer.price?.total || 0,
    currency: offer.price?.currency || "PKR",
    seats: 9,
    status: "scheduled",
    class: normalizeCabin(offer.cabin),
    fareOptions: offer.fareOptions || [],
    duration: offer.duration || undefined,
    stops: offer.stops ?? undefined,
    baggage: offer.baggage || undefined,
    meal: offer.meal || undefined,
    returnDepartureTime: offer.returnDepartureTime ? formatFlightDateTime(offer.returnDepartureTime) : undefined,
    returnArrivalTime: offer.returnArrivalTime ? formatFlightDateTime(offer.returnArrivalTime) : undefined,
  };
}

function normalizeCabin(cabin: string): Flight["class"] {
  const value = cabin.toLowerCase();
  if (value.includes("business")) return "business";
  if (value.includes("first")) return "first";
  return "economy";
}

function formatFlightDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace("T", " ").slice(0, 16);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}
