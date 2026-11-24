import type { TravelianFlight } from "@/lib/travelian-api";
import { API_BASE_URL } from "@/lib/api-config";
import { BAGGAGE_UNKNOWN, baggageText, underBaggageLabel } from "@/lib/baggage";
import { normalizeAirlineName } from "@/lib/airline-normalization";
import { groupJourneys, legArrivalDate } from "@/lib/group-journeys";
import {
  type GroupTicket,
  groupTicketOriginCode,
  groupTicketDestinationCode,
} from "@/lib/group-ticketing";

/** Shown as the endpoint label: the configured API host (VITE_TRAVELIAN_API_BASE_URL), not a fixed name. */
const API_HOST = new URL(API_BASE_URL).host;

export interface ProviderSystem {
  id: string;
  name: string;
  category: "flight" | "hotel" | "transfer" | "payment";
  environment: "production" | "staging";
  status: "healthy" | "degraded" | "not_configured";
  enabled: boolean;
  secretId: string;
  endpoint: string;
  priority: number;
  lastChecked: string;
  isGroupTicketing?: boolean;
}

export const INITIAL_PROVIDERS: ProviderSystem[] = [
  {
    id: "skypass",
    name: "Skypass",
    category: "flight",
    environment: "production",
    status: "healthy",
    enabled: true,
    secretId: "travelian/providers/skypass",
    endpoint: `${API_HOST}/skypass/tickets`,
    priority: 1,
    lastChecked: "Live API verified",
    isGroupTicketing: true,
  },
  {
    id: "alhaider",
    name: "Al Haider",
    category: "flight",
    environment: "production",
    status: "healthy",
    enabled: true,
    secretId: "travelian/providers/alhaider",
    endpoint: `${API_HOST}/alhaider/tickets`,
    priority: 2,
    lastChecked: "Live API verified",
    isGroupTicketing: true,
  },
  {
    id: "dhilluandsahi",
    name: "Dhillon & Sahi",
    category: "flight",
    environment: "production",
    status: "healthy",
    enabled: true,
    secretId: "travelian/providers/dhilluandsahi",
    endpoint: `${API_HOST}/dhilluandsahi/tickets`,
    priority: 3,
    lastChecked: "Live API verified",
    isGroupTicketing: true,
  },
  {
    id: "travelntours",
    name: "Travel n Tours",
    category: "flight",
    environment: "production",
    status: "healthy",
    enabled: true,
    secretId: "travelian/providers/travelntours",
    endpoint: `${API_HOST}/travelntours/tickets`,
    priority: 4,
    lastChecked: "Live API verified",
    isGroupTicketing: true,
  },
  {
    id: "sooperfare",
    name: "SooperFare",
    category: "flight",
    environment: "production",
    status: "healthy",
    enabled: true,
    secretId: "travelian/providers/sooperfare",
    endpoint: `${API_HOST}/flights/search`,
    priority: 5,
    lastChecked: "Live GDS verified",
    isGroupTicketing: false,
  },
  {
    id: "travelport",
    name: "Travelport",
    category: "flight",
    environment: "production",
    status: "not_configured",
    enabled: true,
    secretId: "travelian/providers/travelport",
    endpoint: `${API_HOST}/flights/search`,
    priority: 6,
    lastChecked: "Replace placeholder OAuth credentials",
    isGroupTicketing: false,
  },
  {
    id: "airsial",
    name: "AirSial",
    category: "flight",
    environment: "staging",
    status: "not_configured",
    enabled: false,
    secretId: "travelian/providers/airsial",
    endpoint: `${API_HOST}/flights/search`,
    priority: 7,
    lastChecked: "Pending credentials",
    isGroupTicketing: false,
  },
  {
    id: "flyadeal",
    name: "Flyadeal",
    category: "flight",
    environment: "staging",
    status: "not_configured",
    enabled: false,
    secretId: "travelian/providers/flyadeal",
    endpoint: `${API_HOST}/flights/search`,
    priority: 8,
    lastChecked: "Pending credentials",
    isGroupTicketing: false,
  },
  {
    id: "pia",
    name: "PIA",
    category: "flight",
    environment: "staging",
    status: "not_configured",
    enabled: false,
    secretId: "travelian/providers/pia",
    endpoint: `${API_HOST}/flights/search`,
    priority: 9,
    lastChecked: "Pending credentials",
    isGroupTicketing: false,
  },
  {
    id: "travelport-hotels",
    name: "Travelport Hotels",
    category: "hotel",
    environment: "production",
    status: "not_configured",
    enabled: false,
    secretId: "travelian/providers/travelport",
    endpoint: `${API_HOST}/hotels/search`,
    priority: 1,
    lastChecked: "Waiting for Travelport OAuth credentials",
    isGroupTicketing: false,
  },
  {
    id: "travelport-transfers",
    name: "Travelport Transfers",
    category: "transfer",
    environment: "production",
    status: "not_configured",
    enabled: false,
    secretId: "travelian/providers/travelport",
    endpoint: `${API_HOST}/transfers/search`,
    priority: 1,
    lastChecked: "Waiting for Travelport OAuth credentials",
    isGroupTicketing: false,
  },
];

const STORAGE_KEY = "travelian:provider-systems";

export function loadProviderSystems(): ProviderSystem[] {
  if (typeof window === "undefined") return INITIAL_PROVIDERS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_PROVIDERS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return INITIAL_PROVIDERS;

    // Merge any newly introduced default providers that might be missing in stored copy
    const byId = new Map(parsed.map((p) => [p.id, p]));
    const merged = INITIAL_PROVIDERS.map((def) => {
      const existing = byId.get(def.id);
      return existing ? { ...def, ...existing } : def;
    });

    // Also include any extra custom providers that were saved
    for (const item of parsed) {
      if (!merged.some((m) => m.id === item.id)) {
        merged.push(item);
      }
    }
    return merged;
  } catch {
    return INITIAL_PROVIDERS;
  }
}

export function saveProviderSystems(providers: ProviderSystem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
    window.dispatchEvent(new CustomEvent("travelian:provider-systems-changed", { detail: providers }));
  } catch {
    // localStorage unavailable
  }
}

function normalizeProviderName(raw?: string): string {
  return String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Checks if a given provider ID, name, or raw supplier identifier is configured as a Group Ticketing provider.
 */
export function isGroupTicketingProvider(providerIdOrName?: string): boolean {
  if (!providerIdOrName) return false;
  let normalized = normalizeProviderName(providerIdOrName);

  // If providerIdOrName is a base64 ID (e.g. YWxoYWlkZXI6MzM2MQ), try to decode prefix
  if (providerIdOrName.includes(":") || /^[A-Za-z0-9+/=]{10,}$/.test(providerIdOrName)) {
    try {
      const decoded = typeof atob === "function" ? atob(providerIdOrName) : "";
      if (decoded.includes(":")) {
        normalized = normalizeProviderName(decoded.split(":")[0]);
      }
    } catch {
      // not base64
    }
  }

  const providers = loadProviderSystems();
  const matched = providers.find((p) => {
    const pId = normalizeProviderName(p.id);
    const pName = normalizeProviderName(p.name);
    return (
      pId === normalized ||
      pName === normalized ||
      (normalized.length > 2 && (pId.includes(normalized) || normalized.includes(pId)))
    );
  });

  if (matched) {
    return Boolean(matched.isGroupTicketing);
  }

  // Fallback defaults for known group ticketing suppliers
  const knownGroup = ["skypass", "alhaider", "dhilluandsahi", "dhillon", "travelntours", "sahi"];
  return knownGroup.some((k) => normalized.includes(k));
}

export function decodeGroupTicketId(id: string): string {
  try {
    const decoded = typeof atob === "function" ? atob(id) : "";
    if (decoded.includes(":")) {
      const [prov, num] = decoded.split(":");
      return `${prov.toLowerCase()}-${num}`;
    }
  } catch {
    // ignore
  }
  return id;
}

/**
 * Converts a GroupTicket from `/group-ticketing/groups` into a TravelianFlight object
 * for seamless display in the live flights search results.
 */
export function groupTicketToFlight(group: GroupTicket): TravelianFlight {
  const originCode = groupTicketOriginCode(group) || "";
  const destinationCode = groupTicketDestinationCode(group) || "";
  const firstLeg = group.itinerary?.[0];
  const lastLeg = group.itinerary && group.itinerary.length > 0
    ? group.itinerary[group.itinerary.length - 1]
    : undefined;

  const decodedOfferId = decodeGroupTicketId(group.id);
  const journeys = groupJourneys(group);
  const outboundJourney = journeys.find((journey) => journey.direction === "outbound");
  // #175: a return fare's return flights are a second journey, not a stop of the outbound one.
  const returnJourney = journeys.find((journey) => journey.direction === "return");
  const returnLegs = new Set(returnJourney?.legs ?? []);
  const outboundLast = outboundJourney?.legs[outboundJourney.legs.length - 1];

  // Resolve provider
  let providerId = group.provider;
  if (!providerId && group.id) {
    try {
      const decoded = typeof atob === "function" ? atob(group.id) : "";
      if (decoded.includes(":")) {
        providerId = decoded.split(":")[0];
      }
    } catch {
      // ignore
    }
  }
  if (!providerId) {
    const slug = String(group.categorySlug || "").toLowerCase();
    const label = String(group.categoryLabel || "").toLowerCase();
    if (slug.includes("1") || label.includes("alhaider") || label === "ah") {
      providerId = "alhaider";
    } else if (slug.includes("2") || label.includes("dhillon") || label.includes("dhillu") || label === "d&s") {
      providerId = "dhilluandsahi";
    } else if (slug.includes("3") || label.includes("skypass") || label === "sp") {
      providerId = "skypass";
    } else if (slug.includes("4") || label.includes("travel")) {
      providerId = "travelntours";
    } else {
      providerId = "skypass";
    }
  }

  const depTime = firstLeg?.departureTime
    ? `${group.departureDate || firstLeg.flightDate || ""} ${firstLeg.departureTime}`.trim()
    : (group.departureDate || "");
  const arrivalLeg = returnJourney && outboundLast ? outboundLast : lastLeg;
  const arrTime = arrivalLeg?.arrivalTime
    ? `${legArrivalDate(arrivalLeg) || group.departureDate || ""} ${arrivalLeg.arrivalTime}`.trim()
    : (group.departureDate || "");
  const returnFirst = returnJourney?.legs[0];
  const returnLast = returnJourney?.legs[returnJourney.legs.length - 1];

  const segments = (group.itinerary || []).map((leg) => ({
    departureTime: `${leg.flightDate || ""} ${leg.departureTime || ""}`.trim(),
    arrivalTime: `${legArrivalDate(leg) || ""} ${leg.arrivalTime || ""}`.trim(),
    origin: leg.origin || originCode,
    destination: leg.destination || destinationCode,
    departureAirport: leg.origin,
    arrivalAirport: leg.destination,
    flightNumber: leg.flightNumber || group.flightNumber || "Group Flight",
    baggage: leg.baggage || group.baggage || undefined,
    ...(returnJourney ? { direction: returnLegs.has(leg) ? "return" as const : "outbound" as const } : {}),
  }));

  const fareNum =
    typeof group.fare === "number"
      ? group.fare
      : parseFloat(String(group.fare || 0).replace(/[^0-9.]/g, "")) || 0;

  return {
    flightId: `group-${decodedOfferId}`,
    provider: providerId,
    offerId: decodedOfferId,
    airline: normalizeAirlineName(group.airlineName || "Airline"),
    airlineImage: group.airlineLogo,
    flightNumber: group.flightNumber || firstLeg?.flightNumber || "Group Flight",
    origin: originCode,
    destination: returnJourney ? String(outboundJourney?.destination || destinationCode).toUpperCase() : destinationCode,
    departureTime: depTime,
    arrivalTime: arrTime,
    ...(returnFirst && returnLast ? {
      returnDepartureTime: `${returnFirst.flightDate || ""} ${returnFirst.departureTime || ""}`.trim(),
      returnArrivalTime: `${legArrivalDate(returnLast) || ""} ${returnLast.arrivalTime || ""}`.trim(),
    } : {}),
    price: fareNum,
    currency: group.currency || "PKR",
    seats: Number(group.seatsAvailable) || 1,
    status: "scheduled",
    class: "economy",
    fareBrand: "Group Ticket",
    baggage: group.baggage || firstLeg?.baggage || undefined,
    meal: "No Meal", // #198
    // #175: the outbound journey's stops (a return fare's way back is not a stop).
    stops: outboundJourney ? outboundJourney.stops : Math.max(0, (group.itinerary?.length || 1) - 1),
    segments,
    // #152: where a connecting group fare changes planes (layovers[i] follows segments[i], outbound only).
    ...(outboundJourney?.connections.length ? {
      layovers: outboundJourney.connections.map((stop, index) => ({
        location: stop.airport, duration: stop.duration || null, nextFlightNumber: outboundJourney.legs[index + 1]?.flightNumber || null,
      })),
    } : {}),
    refundable: false,
    fareOptions: [
      {
        tier: "Group Fare",
        price: {
          currency: group.currency || "PKR",
          total: fareNum,
        },
        bags: group.baggage || BAGGAGE_UNKNOWN,
        bagsDetail: group.baggageDetail,
        change: group.terms || "Subject to Travelian terms",
        refund: group.cancellationRules || "Non-refundable",
        amenities: [
          `Baggage: ${underBaggageLabel(baggageText(group.baggage, group.baggageDetail).short)}`,
          group.seatsAvailable ? `${group.seatsAvailable} seats available` : "Limited seats available",
        ],
      },
    ],
  };
}
