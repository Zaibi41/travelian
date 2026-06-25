import { ProviderAdapter } from "./provider-base.mjs";
import { getSecretJson } from "../secrets.mjs";

let cachedSession;

export class DhilluAndSahiAdapter extends ProviderAdapter {
  constructor() {
    super("dhilluandsahi");
    this.secretId = process.env.DHILLUANDSAHI_SECRET_ID || "travelian/providers/dhilluandsahi";
  }

  async searchFlights(request) {
    if (request.tripType === "multicity") return [];
    const groups = await this.fetchGroups();
    return groups
      .flatMap((group) => this.ticketRecords(group))
      .filter((record) => this.matchesRequest(record, request))
      .map((record) => this.normalizeOffer(record, request))
      .filter(Boolean);
  }

  async priceOffer(payload) {
    const token = await this.token();
    const body = {
      pnr: payload.pnr || payload.rawRef?.pnr || extractPnr(payload.offerId),
      adult: Number(payload.adults || payload.passengers?.adults || 1),
      child: Number(payload.children || payload.passengers?.children || 0) + Number(payload.infants || payload.passengers?.infants || 0),
      price: Number(payload.price || payload.rawRef?.price || 0),
    };
    if (!body.pnr) throw this.error("Dhillu & Sahi PNR is required for availability check", 400);
    const result = await this.post("/api/check-availbility", body, token);
    return {
      provider: this.name,
      available: Boolean(result?.data?.status ?? result?.success),
      raw: result,
    };
  }

  async createBooking(payload) {
    const session = await this.session();
    const travelers = Array.isArray(payload.travelers) ? payload.travelers : [];
    if (!travelers.length) throw this.error("At least one traveler is required", 400);
    const pnr = payload.pnr || payload.rawRef?.pnr || extractPnr(payload.offerId);
    if (!pnr) throw this.error("Dhillu & Sahi PNR is required for booking", 400);

    const result = await this.post("/api/add-booking", {
      pnr,
      agent: Number(payload.agent || payload.agentId || session.agentId),
      updated_at: payload.updatedAt || payload.rawRef?.updated_at || payload.updated_at || "",
      remarks: payload.remarks || "",
      titles: travelers.map((traveler) => traveler.title || "MR"),
      firstname: travelers.map((traveler) => traveler.firstName || traveler.firstname || traveler.name || ""),
      lastname: travelers.map((traveler) => traveler.lastName || traveler.lastname || ""),
      dob: travelers.map((traveler) => traveler.dateOfBirth || traveler.dob || ""),
      passport_no: travelers.map((traveler) => traveler.passportNumber || traveler.passport_no || ""),
      passport_expiry_date: travelers.map((traveler) => traveler.passportExpiry || traveler.passport_expiry_date || ""),
      type: travelers.map((traveler) => passengerType(traveler.type || traveler.passengerType)),
    }, session.token);

    return {
      provider: this.name,
      status: result?.success ? "created" : "failed",
      bookingId: result?.data?.id || result?.id || null,
      message: result?.message || "Booking submitted to Dhillu & Sahi",
      raw: result,
    };
  }

  async retrieveBooking(payload) {
    const token = await this.token();
    const bookingId = payload.bookingId || payload.id;
    if (!bookingId) throw this.error("bookingId is required", 400);
    return this.post("/api/agent-booking-detail", { booking_id: Number(bookingId) }, token);
  }

  async fetchGroups() {
    const session = await this.session();
    const sectorIds = session.mySectorIds.length ? session.mySectorIds : [];
    if (!sectorIds.length) throw this.error("Dhillu & Sahi secret must include mySectorIds because the supplier requires my_sector_id");

    const payloads = await Promise.all(
      sectorIds.map((sectorId) => this.post("/api/pnr-respect-to-mysector-user", { my_sector_id: String(sectorId) }, session.token))
    );

    return payloads.flatMap((payload) => {
      if (Array.isArray(payload)) return payload;
      for (const key of ["data", "groups", "results", "result"]) {
        if (Array.isArray(payload?.[key])) return payload[key];
      }
      return [];
    });
  }

  ticketRecords(group) {
    const tickets = Array.isArray(group?.tickets) ? group.tickets : [];
    return tickets.map((ticket) => ({ group, ticket }));
  }

  matchesRequest(record, request) {
    const segments = normalizeSegments(record.ticket);
    const first = segments[0];
    const last = segments[segments.length - 1];
    if (!first || !last || first.departureDate !== request.departureDate) return false;
    if (request.tripType === "roundtrip") {
      return first.origin === request.origin && segments.some((segment) => segment.destination === request.destination) && last.destination === request.origin;
    }
    return first.origin === request.origin && last.destination === request.destination;
  }

  normalizeOffer(record, request) {
    const { group, ticket } = record;
    const segments = normalizeSegments(ticket);
    const first = segments[0];
    const last = segments[segments.length - 1];
    const total = Number(ticket.price || ticket.amount || 0);
    if (!first || !last || !Number.isFinite(total) || total <= 0) return null;
    const airlineName = group?.airline?.name || ticket.air_line || "Dhillu & Sahi";
    const airlineLogo = group?.airline?.logo || ticket.air_line_logo || null;
    const baggage = unique([ticket.baggage, ...segments.map((segment) => segment.baggage)].filter(Boolean)).join(", ") || null;

    return {
      provider: this.name,
      offerId: `dhilluandsahi-${ticket.pnr || ticket.id || crypto.randomUUID()}`,
      airline: airlineName,
      airlineImage: airlineLogo,
      flightNumber: segments.map((segment) => segment.flightNumber).filter(Boolean).join(" / ") || ticket.pnr || "Group Ticket",
      origin: request.origin,
      destination: request.destination,
      departureTime: first.departureTime,
      arrivalTime: last.arrivalTime,
      returnDepartureTime: null,
      returnArrivalTime: null,
      duration: durationBetween(first.departureTime, last.arrivalTime),
      stops: Math.max(segments.length - 1, 0),
      segments,
      layovers: layoversFromSegments(segments),
      cabin: request.cabin,
      fareBrand: ticket.ticket_type || "Group Ticket",
      baggage,
      meal: mealLabel(ticket.meal),
      seats: ticket.remaining ?? null,
      refundable: null,
      fareOptions: [
        {
          tier: ticket.ticket_type || "Group Ticket",
          price: { currency: "PKR", base: total, taxes: null, total },
          bags: baggage || "See supplier details",
          change: "Subject to supplier rules",
          refund: "Subject to supplier rules",
          amenities: [
            ticket.remaining !== undefined ? `${ticket.remaining} seats remaining` : null,
            ticket.meal !== undefined ? `Meal: ${mealLabel(ticket.meal)}` : null,
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
        pnr: ticket.pnr,
        price: total,
        updated_at: ticket.updated_at,
        remaining: ticket.remaining,
      },
    };
  }

  async session() {
    if (cachedSession?.token) return cachedSession;
    const secret = await getSecretJson(this.secretId);
    const baseUrl = String(secret?.baseUrl || secret?.base_url || "https://api.dhilluandsahi.com").trim().replace(/\/$/, "");
    const configuredToken = String(secret?.token || secret?.access_token || "").replace(/^Bearer\s+/i, "");
    if (configuredToken) {
      cachedSession = {
        baseUrl,
        token: configuredToken,
        agentId: secret?.agentId || secret?.agent_id,
        mySectorIds: parseSectorIds(secret),
      };
      return cachedSession;
    }

    const email = secret?.email || secret?.username;
    const password = secret?.password;
    if (!email || !password) throw this.error("Dhillu & Sahi secret must include token or email/password");

    const response = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(Number(process.env.PROVIDER_TIMEOUT_MS || 9000)),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success?.token) throw this.error(payload?.message || `Dhillu & Sahi login failed with ${response.status}`);
    cachedSession = {
      baseUrl,
      token: String(payload.success.token).replace(/^Bearer\s+/i, ""),
      agentId: payload.success.agent_id || secret?.agentId || secret?.agent_id,
      mySectorIds: parseSectorIds(secret),
    };
    return cachedSession;
  }

  async token() {
    return (await this.session()).token;
  }

  async post(path, body, token) {
    const session = await this.session();
    const response = await fetch(`${session.baseUrl}${path}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${token || session.token}`,
      },
      body: JSON.stringify(body || {}),
      signal: AbortSignal.timeout(Number(process.env.PROVIDER_TIMEOUT_MS || 9000)),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw this.error(payload?.message || payload?.error || `Dhillu & Sahi ${path} failed with ${response.status}`);
    return payload;
  }

  error(message, statusCode = 502) {
    const error = new Error(String(message));
    error.provider = this.name;
    error.statusCode = statusCode;
    return error;
  }
}

function normalizeSegments(ticket) {
  const subparts = Array.isArray(ticket?.subpart) ? ticket.subpart : [];
  if (subparts.length) {
    return subparts.map((segment) => {
      const departureDate = segment.departure_date || null;
      const arrivalDate = segment.arrival_date || inferredArrivalDate(departureDate, segment.departure_time, segment.arivval_time || segment.arrival_time);
      return {
        flightNumber: normalizeFlightNumber(segment.departure_flight_number),
        origin: firstCode(segment.departure_sector_name) || codeFromAirportName(segment.departure_airport_name),
        destination: lastCode(segment.departure_sector_name) || codeFromAirportName(segment.arivval_airport_name || segment.arrival_airport_name),
        departureDate,
        arrivalDate,
        departureAirport: segment.departure_airport_name || firstCode(segment.departure_sector_name),
        arrivalAirport: segment.arivval_airport_name || segment.arrival_airport_name || lastCode(segment.departure_sector_name),
        departureTime: dateTime(departureDate, segment.departure_time),
        arrivalTime: dateTime(arrivalDate, segment.arivval_time || segment.arrival_time),
        baggage: segment.departure_baggage || ticket.baggage || null,
      };
    }).filter((segment) => segment.origin && segment.destination);
  }

  const [origin, destination] = String(ticket?.sector || "").toUpperCase().split("-").map((part) => part.trim());
  const departureDate = ticket?.date || ticket?.departure_date || null;
  const arrivalDate = ticket?.arrival_date || inferredArrivalDate(departureDate, ticket?.departure_time, ticket?.arrival_time);
  return [{
    flightNumber: normalizeFlightNumber(ticket?.flight_number || ticket?.flight_no),
    origin,
    destination,
    departureDate,
    arrivalDate,
    departureAirport: origin,
    arrivalAirport: destination,
    departureTime: dateTime(departureDate, ticket?.departure_time),
    arrivalTime: dateTime(arrivalDate, ticket?.arrival_time),
    baggage: ticket?.baggage || null,
  }].filter((segment) => segment.origin && segment.destination);
}

function dateTime(date, time) {
  if (!date) return null;
  return `${date}T${String(time || "00:00").slice(0, 8)}`;
}

function inferredArrivalDate(departureDate, departureTime, arrivalTime) {
  if (!departureDate) return null;
  if (!departureTime || !arrivalTime) return departureDate;
  const dep = String(departureTime).slice(0, 5);
  const arr = String(arrivalTime).slice(0, 5);
  if (arr && dep && arr < dep) {
    const date = new Date(`${departureDate}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      date.setDate(date.getDate() + 1);
      return date.toISOString().slice(0, 10);
    }
  }
  return departureDate;
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

function firstCode(value) {
  const parts = String(value || "").toUpperCase().split("-").map((part) => part.trim());
  return parts.find((part) => /^[A-Z]{3}$/.test(part)) || null;
}

function lastCode(value) {
  const parts = String(value || "").toUpperCase().split("-").map((part) => part.trim()).filter((part) => /^[A-Z]{3}$/.test(part));
  return parts[parts.length - 1] || null;
}

function codeFromAirportName(value) {
  const text = String(value || "").toLowerCase();
  const map = {
    islamabad: "ISB",
    lahore: "LHE",
    karachi: "KHI",
    peshawar: "PEW",
    sialkot: "SKT",
    faisalabad: "LYP",
    dammam: "DMM",
    riyadh: "RUH",
    jeddah: "JED",
    medina: "MED",
    madinah: "MED",
    muscat: "MCT",
    dubai: "DXB",
    sharjah: "SHJ",
    "abu dhabi": "AUH",
  };
  return Object.entries(map).find(([name]) => text.includes(name))?.[1] || null;
}

function normalizeFlightNumber(value) {
  return String(value || "").trim().replace(/^([A-Z0-9]{2})(\d)/i, "$1-$2") || null;
}

function mealLabel(value) {
  if (value === undefined || value === null || value === "") return null;
  const text = String(value).trim();
  if (text === "1" || /^yes$/i.test(text)) return "Included";
  if (text === "0" || /^no$/i.test(text)) return "Not included";
  return text;
}

function passengerType(value) {
  const text = String(value || "adult").toLowerCase();
  if (text.startsWith("inf")) return "infant";
  if (text.startsWith("ch")) return "child";
  return "adult";
}

function extractPnr(offerId) {
  const match = String(offerId || "").match(/^dhilluandsahi-(.+)$/);
  return match?.[1] || null;
}

function unique(values) {
  return Array.from(new Set(values));
}

function parseSectorIds(secret) {
  const value = secret?.mySectorIds || secret?.my_sector_ids || secret?.mySectorId || secret?.my_sector_id;
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (value === undefined || value === null || value === "") return [];
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}
