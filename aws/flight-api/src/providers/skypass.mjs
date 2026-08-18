import { ProviderAdapter } from "./provider-base.mjs";
import { getSecretJson } from "../secrets.mjs";
import { outboundFetch } from "../http.mjs";

export class SkypassAdapter extends ProviderAdapter {
  constructor() {
    super("skypass");
    this.baseUrl = (process.env.SKYPASS_PROXY_BASE_URL || "https://api.travelian.pk/skypass").replace(/\/$/, "");
    this.clientSecretId = process.env.SKYPASS_CLIENT_SECRET_ID || "travelian/api/skypass-clients";
  }

  async searchFlights(request) {
    if (request.tripType === "multicity") return [];
    const clientKey = await this.clientKey();
    const firstPage = await this.fetchTicketsPage(clientKey, 1);
    const lastPage = Math.min(Number(firstPage?.tickets?.last_page || 1), 10);
    const remainingPages = lastPage > 1
      ? await Promise.all(Array.from({ length: lastPage - 1 }, (_, index) => this.fetchTicketsPage(clientKey, index + 2)))
      : [];
    const records = [firstPage, ...remainingPages]
      .flatMap((payload) => Array.isArray(payload?.tickets?.data) ? payload.tickets.data : []);
    return records
      .filter((record) => this.matchesRequest(record, request))
      .map((record) => this.normalizeOffer(record, request))
      .filter(Boolean);
  }

  async fetchTicketsPage(clientKey, page) {
    const query = new URLSearchParams({ limit: "100", page: String(page) });
    const response = await outboundFetch(`${this.baseUrl}/tickets?${query}`, {
      headers: {
        accept: "application/json",
        "x-travelian-api-key": clientKey,
      },
      signal: AbortSignal.timeout(Number(process.env.PROVIDER_TIMEOUT_MS || 9000)),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw this.error(payload?.details || payload?.error || `Skypass request failed with ${response.status}`);
    return payload;
  }

  async clientKey() {
    const secret = await getSecretJson(this.clientSecretId);
    const key = typeof secret === "string" ? secret : secret?.apiKey || secret?.key;
    if (!key) throw this.error("Skypass Travelian client key is not configured");
    return String(key);
  }

  matchesRequest(record, request) {
    const sectors = Array.isArray(record?.sectors) ? record.sectors : [];
    const first = sectors[0];
    const last = sectors[sectors.length - 1];
    const outboundMatches = sectors.some((sector) => String(sector.destination || "").toUpperCase() === request.destination);
    if (request.tripType === "roundtrip") {
      return Boolean(
        first
        && last
        && String(first.departure || "").toUpperCase() === request.origin
        && String(first.departure_date || record.min_departure_date || "") === request.departureDate
        && outboundMatches
        && String(last.destination || "").toUpperCase() === request.origin
        && String(last.departure_date || "") === request.returnDate
      );
    }
    return Boolean(
      first
      && last
      && String(first.departure || "").toUpperCase() === request.origin
      && String(last.destination || "").toUpperCase() === request.destination
      && String(first.departure_date || record.min_departure_date || "") === request.departureDate
    );
  }

  normalizeOffer(record, request) {
    const sectors = record.sectors;
    const first = sectors[0];
    const last = sectors[sectors.length - 1];
    const outboundLastIndex = request.tripType === "roundtrip"
      ? Math.max(0, sectors.findIndex((sector) => String(sector.destination || "").toUpperCase() === request.destination))
      : sectors.length - 1;
    const outboundLast = sectors[outboundLastIndex] || last;
    const returnFirst = request.tripType === "roundtrip" ? sectors[outboundLastIndex + 1] : null;
    const total = Number(record.adult_price);
    if (!Number.isFinite(total) || total <= 0) return null;

    return {
      provider: this.name,
      offerId: `skypass-${record.id}`,
      airline: record.name || "Skypass",
      flightNumber: sectors.map((sector) => `${sector.flight_code || ""}-${sector.flight_num || ""}`.replace(/^-|-$/g, "")).join(" / "),
      origin: request.origin,
      destination: request.destination,
      departureTime: dateTime(first.departure_date, first.departure_time),
      arrivalTime: dateTime(outboundLast.arrival_date || outboundLast.departure_date, outboundLast.arrival_time),
      returnDepartureTime: returnFirst ? dateTime(returnFirst.departure_date, returnFirst.departure_time) : null,
      returnArrivalTime: returnFirst ? dateTime(last.arrival_date || last.departure_date, last.arrival_time) : null,
      duration: durationBetween(first.departure_date, first.departure_time, outboundLast.arrival_date || outboundLast.departure_date, outboundLast.arrival_time),
      stops: Math.max(outboundLastIndex, 0),
      cabin: request.cabin,
      fareBrand: record.service_type || null,
      baggage: [...new Set(sectors.map((sector) => sector.baggage).filter(Boolean))].join(", ") || null,
      meal: record.meal === undefined || record.meal === null ? null : String(record.meal),
      refundable: null,
      fareOptions: [
        {
          tier: record.service_type || "Available Fare",
          price: { currency: request.currency || "PKR", total },
          bags: [...new Set(sectors.map((sector) => sector.baggage).filter(Boolean))].join(", ") || "See ticket details",
          change: "Subject to supplier rules",
          refund: "Subject to supplier rules",
        },
      ],
      requiresReprice: true,
      price: {
        currency: request.currency || "PKR",
        base: total,
        taxes: null,
        total,
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

function dateTime(date, time) {
  if (!date) return null;
  return `${date}T${String(time || "00:00").slice(0, 8)}`;
}

function durationBetween(departureDate, departureTime, arrivalDate, arrivalTime) {
  const departure = new Date(dateTime(departureDate, departureTime));
  const arrival = new Date(dateTime(arrivalDate, arrivalTime));
  if (Number.isNaN(departure.getTime()) || Number.isNaN(arrival.getTime()) || arrival <= departure) return null;
  const minutes = Math.round((arrival.getTime() - departure.getTime()) / 60000);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
