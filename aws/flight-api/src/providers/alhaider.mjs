import { ProviderAdapter } from "./provider-base.mjs";
import { getSecretJson } from "../secrets.mjs";
import { outboundFetch } from "../http.mjs";

export class AlhaiderAdapter extends ProviderAdapter {
  constructor() {
    super("alhaider");
    this.secretId = process.env.ALHAIDER_SECRET_ID || "travelian/providers/alhaider";
  }

  async searchFlights(request) {
    if (request.tripType === "multicity") return [];
    const groups = await this.fetchGroups();
    return groups
      .filter((group) => this.matchesRequest(group, request))
      .map((group) => this.normalizeOffer(group, request))
      .filter(Boolean);
  }

  async fetchGroups() {
    const config = await this.config();
    const response = await outboundFetch(`${config.baseUrl}/api/available/groups`, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${config.token}`,
      },
      signal: AbortSignal.timeout(Number(process.env.PROVIDER_TIMEOUT_MS || 9000)),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw this.error(payload?.message || payload?.error || `Alhaider request failed with ${response.status}`);
    if (Array.isArray(payload)) return payload;
    for (const key of ["groups", "data", "available_groups", "result", "results"]) {
      if (Array.isArray(payload?.[key])) return payload[key];
    }
    return [];
  }

  async config() {
    const secret = await getSecretJson(this.secretId);
    const baseUrl = String(secret?.baseUrl || secret?.base_url || "https://alhaidertravel.pk").trim().replace(/\/$/, "");
    const token = String(secret?.token || secret?.access_token || "").replace(/^Bearer\s+/i, "");
    if (!token) throw this.error("Alhaider token is not configured");
    return { baseUrl, token };
  }

  matchesRequest(group, request) {
    const sectorParts = sectorCodes(group);
    const first = sectorParts[0];
    const last = sectorParts[sectorParts.length - 1];
    const departureDate = String(group.effective_dept_date || group.dept_date || group.departure_date || "");
    if (!first || !last || departureDate !== request.departureDate) return false;

    if (request.tripType === "roundtrip") {
      return first === request.origin && sectorParts.includes(request.destination) && last === request.origin;
    }

    return first === request.origin && last === request.destination;
  }

  normalizeOffer(group, request) {
    const sectorParts = sectorCodes(group);
    const details = Array.isArray(group.details) ? group.details : [];
    const firstDetail = details[0] || {};
    const lastDetail = details[details.length - 1] || {};
    const first = sectorParts[0] || request.origin;
    const last = sectorParts[sectorParts.length - 1] || request.destination;
    const airline = group.airline && typeof group.airline === "object" ? group.airline : {};
    const airlineCode = String(airline.short_name || airline.iata || "").trim().toUpperCase();
    const airlineName = airline.airline_name || airline.name || airlineCode || "Alhaider Group Ticket";
    const total = Number(group.price || group.fare || group.amount || 0);
    if (!Number.isFinite(total) || total <= 0) return null;

    const segments = details.length
      ? details.map((detail, index) => segmentFromDetail(detail, sectorParts, index))
      : [segmentFromGroup(group, first, last)];
    const outboundLast = segments[segments.length - 1] || {};
    const flightNumbers = segments.map((segment) => segment.flightNumber).filter(Boolean);
    const baggage = group.baggage || unique(segments.map((segment) => segment.baggage).filter(Boolean)).join(", ") || null;

    return {
      provider: this.name,
      offerId: `alhaider-${group.id}`,
      airline: airlineName,
      airlineImage: airline.logo_url || group.airline_logo || null,
      flightNumber: flightNumbers.join(" / ") || group.flight_no || `${airlineCode || "Group"}-${group.id}`,
      origin: request.origin,
      destination: request.destination,
      departureTime: segments[0]?.departureTime || dateTime(group.dept_date || group.effective_dept_date, group.dept_time),
      arrivalTime: outboundLast.arrivalTime || dateTime(group.arv_date || group.dept_date || group.effective_dept_date, group.arv_time),
      returnDepartureTime: null,
      returnArrivalTime: null,
      duration: durationBetween(segments[0]?.departureTime, outboundLast.arrivalTime),
      stops: Math.max(segments.length - 1, 0),
      segments,
      layovers: layoversFromSegments(segments),
      cabin: request.cabin,
      fareBrand: group.type || group.type_name || "Group Ticket",
      baggage,
      meal: group.meal === undefined || group.meal === null ? null : mealLabel(group.meal),
      seats: group.available_no_of_pax ?? group.seats ?? null,
      refundable: null,
      fareOptions: [
        {
          tier: group.type || "Group Ticket",
          price: { currency: "PKR", base: total, taxes: null, total },
          bags: baggage || "See supplier details",
          change: "Subject to supplier rules",
          refund: "Subject to supplier rules",
          amenities: [
            group.meal ? `Meal: ${mealLabel(group.meal)}` : null,
            group.available_no_of_pax !== undefined ? `${group.available_no_of_pax} seats available` : null,
          ].filter(Boolean),
        },
      ],
      requiresReprice: true,
      price: {
        currency: "PKR",
        base: total,
        taxes: null,
        total,
      },
      rawRef: {
        id: group.id,
        pnr: group.pnr,
        type: group.type,
        availableSeats: group.available_no_of_pax,
      },
    };
  }

  error(message) {
    const error = new Error(String(message));
    error.provider = this.name;
    error.statusCode = 502;
    return error;
  }
}

function sectorCodes(group) {
  return String(group?.sector || "")
    .toUpperCase()
    .split("-")
    .map((item) => item.trim())
    .filter((item) => /^[A-Z]{3}$/.test(item));
}

function segmentFromDetail(detail, sectorParts, index) {
  const origin = sectorParts[index] || iataLike(detail.origin) || detail.origin;
  const destination = sectorParts[index + 1] || iataLike(detail.destination) || detail.destination;
  return {
    flightNumber: detail.flight_no || detail.flight_number || null,
    origin,
    destination,
    departureAirport: detail.origin || origin,
    arrivalAirport: detail.destination || destination,
    departureTime: dateTime(detail.flight_date, detail.dept_time),
    arrivalTime: dateTime(detail.flight_date, detail.arv_time),
    baggage: detail.baggage || null,
  };
}

function segmentFromGroup(group, origin, destination) {
  return {
    flightNumber: group.flight_no || null,
    origin,
    destination,
    departureAirport: origin,
    arrivalAirport: destination,
    departureTime: dateTime(group.dept_date || group.effective_dept_date, group.dept_time),
    arrivalTime: dateTime(group.arv_date || group.dept_date || group.effective_dept_date, group.arv_time),
    baggage: group.baggage || null,
  };
}

function dateTime(date, time) {
  if (!date) return null;
  return `${date}T${String(time || "00:00").slice(0, 8)}`;
}

function durationBetween(startValue, endValue) {
  if (!startValue || !endValue) return null;
  const start = new Date(startValue);
  let end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function layoversFromSegments(segments) {
  const layovers = [];
  for (let index = 0; index < segments.length - 1; index += 1) {
    const current = segments[index];
    const next = segments[index + 1];
    const duration = durationBetween(current.arrivalTime, next.departureTime);
    if (duration) {
      layovers.push({
        airport: current.destination,
        arrivesAt: current.arrivalTime,
        departsAt: next.departureTime,
        nextFlight: next.flightNumber,
        duration,
      });
    }
  }
  return layovers;
}

function iataLike(value) {
  const match = String(value || "").trim().match(/^([A-Z]{3})$/i);
  return match?.[1]?.toUpperCase() || null;
}

function mealLabel(value) {
  const text = String(value || "").trim();
  if (/^yes$/i.test(text)) return "Included";
  if (/^no$/i.test(text)) return "Not included";
  return text;
}

function unique(values) {
  return Array.from(new Set(values));
}
