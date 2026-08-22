import { ProviderAdapter } from "./provider-base.mjs";
import { getSecretJson } from "../secrets.mjs";
import { outboundFetch } from "../http.mjs";

let cachedSession;

export class SooperFareAdapter extends ProviderAdapter {
  constructor() {
    super("sooperfare");
    this.secretId = process.env.SOOPERFARE_SECRET_ID || "travelian/providers/sooperfare";
  }

  async searchFlights(request) {
    const config = await this.config();
    const providerNames = Array.isArray(config.providers) && config.providers.length
      ? config.providers
      : [config.provider || "SABRE"];
    const payloads = await Promise.all(
      providerNames.map((provider) => this.post("/v1/airline/search", this.searchPayload(request, provider), config))
    );
    return payloads
      .flatMap((payload) => extractOffers(payload))
      .map((offer, index) => this.normalizeOffer(offer, request, index))
      .filter(Boolean);
  }

  async priceOffer(payload) {
    const config = await this.config();
    const body = payload.quotePayload || payload.rawRef?.quotePayload || {
      ref_id: payload.refId || payload.rawRef?.refId,
      legs: payload.legs || payload.rawRef?.quoteLegs,
    };
    if (!body?.ref_id) throw this.error("SooperFare quote ref_id is required", 400);
    return {
      provider: this.name,
      result: await this.post("/v1/airline/quote", compact(body), config),
    };
  }

  async fareRules(payload) {
    const config = await this.config();
    const body = payload.faresPayload || payload.rawRef?.faresPayload || {
      ref_id: payload.refId || payload.rawRef?.refId,
      legs: payload.legs || payload.rawRef?.quoteLegs,
    };
    if (!body?.ref_id) throw this.error("SooperFare fare request ref_id is required", 400);
    return this.post("/v1/airline/fares", compact(body), config);
  }

  async seatMap(payload) {
    const config = await this.config();
    const refId = payload.refId || payload.rawRef?.refId || payload.offerId?.replace(/^sooperfare-/, "");
    if (!refId) throw this.error("SooperFare ancillary ref_id is required", 400);
    return this.post("/v1/airline/ancillary", { ref_id: refId }, config);
  }

  async createBooking(payload) {
    const config = await this.config();
    const refId = payload.refId || payload.rawRef?.refId || payload.offerId?.replace(/^sooperfare-/, "");
    if (!refId) throw this.error("SooperFare reservation ref_id is required", 400);
    const travelers = Array.isArray(payload.travelers) ? payload.travelers : [];
    if (!travelers.length) throw this.error("At least one traveler is required", 400);
    const contact = payload.contact || {};
    const result = await this.post("/v1/airline/reservation", {
      ref_id: refId,
      is_ancillary: Boolean(payload.isAncillary ?? payload.is_ancillary),
      contact_info: {
        first_name: firstName(contact),
        last_name: lastName(contact),
        email_address: contact.email || contact.emailAddress || "",
        phone_number: contact.phone || contact.phoneNumber || "",
        phone_number_country: (contact.phoneCountry || contact.phone_number_country || "pk").toLowerCase(),
      },
      passengers: travelers.map((traveler) => ({
        ref_id: traveler.refId || traveler.ref_id || undefined,
        title: String(traveler.title || "mr").toLowerCase(),
        first_name: firstName(traveler),
        last_name: lastName(traveler),
        gender: String(traveler.gender || "").toLowerCase() || undefined,
        dob: traveler.dateOfBirth || traveler.dob,
        nationality: traveler.nationality || "PK",
        nic: traveler.nic || null,
        passport_number: traveler.passportNumber || traveler.passport_number,
        passport_country: traveler.passportCountry || traveler.passport_country || traveler.countryOfIssuance || "PK",
        passport_expiry: traveler.passportExpiry || traveler.passport_expiry,
        type: passengerType(traveler.type || traveler.passengerType),
      })).map(compact),
    }, config);

    return {
      provider: this.name,
      status: "created",
      bookingId: result?.booking_ref_id || result?.bookingRefId || result?.ref_id || result?.PNR || result?.pnr || null,
      pnr: result?.PNR || result?.pnr || result?.data?.PNR || result?.data?.pnr || null,
      validTill: result?.validTill || result?.valid_till || result?.data?.validTill || result?.data?.valid_till || null,
      raw: result,
    };
  }

  async retrieveBooking(payload) {
    const config = await this.config();
    const result = await this.post("/v1/booking/list", payload?.filters || {}, config);
    if (!payload?.bookingId) return result;
    const bookings = extractArray(result);
    return bookings.find((booking) => String(booking.booking_ref_id || booking.ref_id || booking.id) === String(payload.bookingId)) || result;
  }

  async issueTicket(payload) {
    const config = await this.config();
    const bookingRefId = payload.bookingRefId || payload.booking_ref_id || payload.bookingId;
    if (!bookingRefId) throw this.error("SooperFare booking_ref_id is required", 400);
    return this.post("/v1/booking/confirm", {
      booking_ref_id: bookingRefId,
      txn_ref_id: payload.txnRefId || payload.txn_ref_id || payload.paymentReference || "TRAVELIAN",
      amount: Number(payload.amount || payload.price || payload.total || 0),
      currency: payload.currency || "PKR",
      remarks: payload.remarks || "Travelian booking confirmation",
    }, config);
  }

  async cancelBooking(payload) {
    const config = await this.config();
    const bookingRefId = payload.bookingRefId || payload.booking_ref_id || payload.bookingId;
    if (!bookingRefId) throw this.error("SooperFare booking_ref_id is required", 400);
    return this.post(payload.void ? "/v1/booking/void" : "/v1/booking/cancel", {
      booking_ref_id: bookingRefId,
      txn_ref_id: payload.txnRefId || payload.txn_ref_id || payload.paymentReference || "TRAVELIAN",
      amount: Number(payload.amount || payload.price || payload.total || 0),
      currency: payload.currency || "PKR",
      remarks: payload.remarks || "Travelian booking cancellation",
    }, config);
  }

  searchPayload(request, provider) {
    const tripType = request.tripType === "roundtrip" ? "round_trip" : request.tripType === "multicity" ? "multi_city" : "one_way";
    const legs = request.tripType === "multicity" && Array.isArray(request.segments)
      ? request.segments.map((segment) => ({
          from: segment.origin,
          to: segment.destination,
          date: segment.departureDate,
          return: null,
        }))
      : [{
          from: request.origin,
          to: request.destination,
          date: request.departureDate,
          return: request.tripType === "roundtrip" ? request.returnDate : null,
        }];

    return {
      flexible_dates: false,
      trip_type: tripType,
      cabin_class: String(request.cabin || "economy").toLowerCase().replace(/\s+/g, "_"),
      legs,
      travelers: [
        { type: "adult", qty: Number(request.adults || 1) },
        { type: "child", qty: Number(request.children || 0) },
        { type: "infant", qty: Number(request.infants || 0) },
      ],
      redirect: true,
      provider,
    };
  }

  normalizeOffer(offer, request, index) {
    const refId = pick(offer, ["ref_id", "refId", "id", "uuid"]) || `${crypto.randomUUID()}`;
    const legs = extractLegs(offer);
    const segments = legs.flatMap((leg) => extractSegments(leg)).filter(Boolean);
    const first = segments[0];
    const last = segments[segments.length - 1];
    const price = extractPrice(offer);
    if (!first || !last || !price.total) return null;
    const airline = pick(offer, ["airline.name", "airline_name", "carrier.name", "provider", "supplier"]) || first.airline || "SooperFare";
    const airlineCode = pick(offer, ["airline.code", "carrier.code"]) || first.carrier || "";
    const fareOptions = extractFareOptions(offer, price);
    const baggage = pick(offer, ["baggage", "baggage_info", "included_baggage"]) || unique(segments.map((segment) => segment.baggage).filter(Boolean)).join(", ") || null;
    const meal = pick(offer, ["meal", "meal_info", "meals"]) || unique(segments.map((segment) => segment.meal).filter(Boolean)).join(", ") || null;

    return {
      provider: this.name,
      offerId: `sooperfare-${refId}`,
      airline,
      airlineCode,
      airlineImage: pick(offer, ["airline.logo", "airline.logo_url", "logo", "image_url", "image"]),
      flightNumber: segments.map((segment) => segment.flightNumber).filter(Boolean).join(" / ") || pick(offer, ["flight_number", "flightNo"]) || `SF-${index + 1}`,
      origin: request.origin,
      destination: request.destination,
      departureTime: first.departureTime,
      arrivalTime: last.arrivalTime,
      returnDepartureTime: null,
      returnArrivalTime: null,
      duration: pick(offer, ["duration", "total_duration"]) || durationBetween(first.departureTime, last.arrivalTime),
      stops: Math.max(segments.length - 1, 0),
      segments,
      layovers: layoversFromSegments(segments),
      cabin: request.cabin,
      fareBrand: pick(offer, ["fare_brand", "brand", "fare.name"]) || request.cabin,
      baggage,
      meal: mealLabel(meal),
      seats: pick(offer, ["seats", "availability", "available_seats"]),
      refundable: pick(offer, ["refundable", "is_refundable"]),
      fareOptions,
      requiresReprice: true,
      price,
      rawRef: {
        refId,
        quotePayload: buildQuotePayload(offer, refId),
        faresPayload: buildFaresPayload(offer, refId),
      },
    };
  }

  async config() {
    const secret = await getSecretJson(this.secretId);
    const baseUrl = String(secret?.baseUrl || secret?.base_url || "https://api.sooperfare.com").trim().replace(/\/$/, "");
    const session = await this.session(secret, baseUrl);
    return {
      baseUrl,
      authorization: secret?.authorization || secret?.basicAuth || secret?.basic_auth || session?.authorization || "Basic c3RhZ2luZ3Nvb3Blcjpzb29wZXJzdGFnaW5n",
      sfAuthorization: secret?.sfAuthorization || secret?.xSfAuthorization || secret?.x_sf_authorization || session?.sfAuthorization || session?.token || "",
      sfToken: secret?.sfToken || secret?.xSfToken || secret?.x_sf_token || session?.sfToken || session?.token || "",
      locale: secret?.locale || "EN",
      provider: secret?.provider || "SABRE",
      providers: Array.isArray(secret?.providers) ? secret.providers : String(secret?.providers || "").split(",").map((item) => item.trim()).filter(Boolean),
    };
  }

  async session(secret, baseUrl) {
    if (isSessionValid(cachedSession)) return cachedSession;
    const username = secret?.username || secret?.email;
    const password = secret?.password;
    if (!username || !password) return null;
    const response = await outboundFetch(`${baseUrl}/v1/partner/auth/login`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(secret?.authorization || secret?.basicAuth || secret?.basic_auth ? { authorization: secret.authorization || secret.basicAuth || secret.basic_auth } : {}),
      },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(Number(process.env.PROVIDER_TIMEOUT_MS || 9000)),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw this.error(payload?.message || payload?.error || `SooperFare login failed with ${response.status}`);
    const token = pick(payload, [
      "token",
      "access_token.token",
      "access_token",
      "data.token",
      "data.access_token.token",
      "data.access_token",
      "result.token",
      "result.access_token.token",
      "result.access_token",
    ]);
    cachedSession = token ? {
      token: String(token),
      expiresAt: pick(payload, [
        "expires_at",
        "access_token.expires_at",
        "data.expires_at",
        "data.access_token.expires_at",
        "result.expires_at",
        "result.access_token.expires_at",
      ]),
    } : payload;
    return cachedSession;
  }

  async post(path, body, config) {
    const response = await outboundFetch(`${config.baseUrl}${path}`, {
      method: "POST",
      headers: this.headers(config),
      body: JSON.stringify(body || {}),
      signal: AbortSignal.timeout(Number(process.env.PROVIDER_TIMEOUT_MS || 9000)),
    });
    const payload = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
    if (!response.ok) throw this.error(payload?.message || payload?.error || `SooperFare ${path} failed with ${response.status}`, response.status);
    return payload;
  }

  headers(config) {
    return {
      accept: "application/json",
      "content-type": "application/json",
      "x-sf-authorization": config.sfAuthorization || "",
      "x-sf-token": config.sfToken || "",
      "x-sf-client-locale": config.locale || "EN",
      ...(config.authorization ? { authorization: config.authorization } : {}),
    };
  }

  error(message, statusCode = 502) {
    const error = new Error(String(message));
    error.provider = this.name;
    error.statusCode = statusCode;
    return error;
  }
}

function extractOffers(payload) {
  if (Array.isArray(payload)) return payload;
  const direct = extractArray(payload, ["data.offers", "data.results", "data.flights", "data.itineraries", "offers", "results", "flights", "itineraries", "data"]);
  if (direct.length) return direct;
  const found = [];
  walk(payload, (value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const hasFare = pick(value, ["price", "total", "amount", "fare.total", "fares.0.total", "fares.0.amount"]);
      const hasRoute = pick(value, ["legs", "segments", "flights", "origin", "from"]);
      if (hasFare && hasRoute) found.push(value);
    }
  });
  return found;
}

function extractArray(payload, paths = ["data", "results", "items", "bookings"]) {
  if (Array.isArray(payload)) return payload;
  for (const path of paths) {
    const value = pick(payload, [path]);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function extractLegs(offer) {
  const legs = pick(offer, ["legs", "itinerary.legs", "data.legs"]);
  if (Array.isArray(legs) && legs.length) return legs;
  return [offer];
}

function extractSegments(leg) {
  const segments = pick(leg, ["segments", "flights", "flight_segments", "slices", "items"]);
  if (Array.isArray(segments) && segments.length) return segments.map(segmentFrom);
  const flight = pick(leg, ["flight"]);
  if (flight && typeof flight === "object") return [segmentFrom(flight)];
  return [segmentFrom(leg)];
}

function segmentFrom(segment) {
  const origin = pick(segment, ["from", "origin", "departure.airport", "departure.iata", "departure.location", "departure_airport"]);
  const destination = pick(segment, ["to", "destination", "arrival.airport", "arrival.iata", "arrival.location", "arrival_airport"]);
  const departureTime = dateTime(
    pick(segment, ["departure.date", "departure_date", "date"]),
    pick(segment, ["departure.time", "departure_time", "time"]),
    pick(segment, ["departure_at", "departureTime", "departure.datetime"])
  );
  const arrivalTime = dateTime(
    pick(segment, ["arrival.date", "arrival_date"]),
    pick(segment, ["arrival.time", "arrival_time"]),
    pick(segment, ["arrival_at", "arrivalTime", "arrival.datetime"])
  );
  if (!origin || !destination || !departureTime) return null;
  return {
    flightNumber: normalizeFlightNumber(pick(segment, ["flight_number", "flightNo", "number"]) || [pick(segment, ["carrier", "airline.code"]), pick(segment, ["flight.number"])].filter(Boolean).join("-")),
    carrier: pick(segment, ["carrier", "airline.code"]),
    airline: pick(segment, ["airline.name", "airline_name"]),
    origin: String(origin).toUpperCase(),
    destination: String(destination).toUpperCase(),
    departureAirport: pick(segment, ["departure.name", "departure_airport_name"]) || origin,
    arrivalAirport: pick(segment, ["arrival.name", "arrival_airport_name"]) || destination,
    departureTime,
    arrivalTime,
    baggage: pick(segment, ["baggage", "baggage_info", "included_baggage"]),
    meal: pick(segment, ["meal", "meal_info"]),
  };
}

function extractPrice(offer) {
  const total = number(pick(offer, ["price.total", "fare.total", "total", "amount", "fares.0.total", "fares.0.amount", "pricing.total"]));
  const base = number(pick(offer, ["price.base", "fare.base", "base", "base_fare", "fares.0.base", "pricing.base"])) || total;
  const taxes = number(pick(offer, ["price.taxes", "fare.taxes", "taxes", "tax", "fares.0.taxes", "pricing.taxes"]));
  return {
    currency: pick(offer, ["price.currency", "fare.currency", "currency", "fares.0.currency", "pricing.currency"]) || "PKR",
    base,
    taxes,
    total,
  };
}

function extractFareOptions(offer, fallbackPrice) {
  const fares = extractArray(offer, ["fares", "fare_options", "brands", "data.fares"]);
  if (!fares.length) {
    return [{
      tier: pick(offer, ["fare_brand", "brand", "fare.name"]) || "Supplier Fare",
      price: fallbackPrice,
      bags: pick(offer, ["baggage"]) || "See supplier details",
      change: "Subject to supplier rules",
      refund: "Subject to supplier rules",
      amenities: [],
    }];
  }
  return fares.map((fare) => {
    const price = extractPrice(fare);
    return {
      tier: pick(fare, ["name", "brand", "fare_brand", "type"]) || "Supplier Fare",
      price: price.total ? price : fallbackPrice,
      bags: pick(fare, ["baggage", "bags"]) || "See supplier details",
      change: pick(fare, ["change", "change_fee"]) || "Subject to supplier rules",
      refund: pick(fare, ["refund", "refundable"]) || "Subject to supplier rules",
      amenities: extractArray(fare, ["amenities", "attributes"]).map((item) => typeof item === "string" ? item : pick(item, ["name", "label", "Classification"])).filter(Boolean),
      refId: pick(fare, ["ref_id", "id"]),
    };
  });
}

function buildQuotePayload(offer, refId) {
  const legs = extractLegs(offer).map((leg) => ({
    ref_id: pick(leg, ["ref_id", "id"]),
    flight: {
      ref_id: pick(leg, ["flight.ref_id", "flight.id", "flights.0.ref_id", "segments.0.ref_id"]),
      fare: { ref_id: pick(leg, ["fare.ref_id", "fares.0.ref_id", "fare.id"]) },
    },
  })).filter((leg) => leg.ref_id || leg.flight.ref_id || leg.flight.fare.ref_id);
  return compact({ ref_id: refId, legs });
}

function buildFaresPayload(offer, refId) {
  const legs = extractLegs(offer).map((leg) => ({ ref_id: pick(leg, ["ref_id", "id"]) })).filter((leg) => leg.ref_id);
  return compact({ ref_id: refId, legs });
}

function pick(source, paths) {
  for (const path of paths) {
    const value = String(path).split(".").reduce((current, key) => {
      if (current === undefined || current === null) return undefined;
      if (/^\d+$/.test(key) && Array.isArray(current)) return current[Number(key)];
      return current[key];
    }, source);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function walk(value, visitor, depth = 0) {
  if (depth > 6 || value === null || value === undefined) return;
  visitor(value);
  if (Array.isArray(value)) value.forEach((item) => walk(item, visitor, depth + 1));
  else if (typeof value === "object") Object.values(value).forEach((item) => walk(item, visitor, depth + 1));
}

function dateTime(date, time, direct) {
  if (direct) return String(direct).replace(" ", "T");
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

function normalizeFlightNumber(value) {
  return String(value || "").trim().replace(/^([A-Z0-9]{2})(\d)/i, "$1-$2") || null;
}

function number(value) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function mealLabel(value) {
  if (value === undefined || value === null || value === "") return null;
  const text = String(value).trim();
  if (text === "1" || /^yes|included$/i.test(text)) return "Included";
  if (text === "0" || /^no|not included$/i.test(text)) return "Not included";
  return text;
}

function passengerType(value) {
  const text = String(value || "adult").toLowerCase();
  if (text.startsWith("inf")) return "infant";
  if (text.startsWith("ch")) return "child";
  return "adult";
}

function firstName(value) {
  return value.firstName || value.first_name || String(value.name || value.fullName || "").trim().split(/\s+/)[0] || "";
}

function lastName(value) {
  return value.lastName || value.last_name || String(value.name || value.fullName || "").trim().split(/\s+/).slice(1).join(" ") || "";
}

function compact(value) {
  if (Array.isArray(value)) return value.map(compact).filter((item) => item !== undefined);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [key, compact(item)])
      .filter(([, item]) => item !== undefined)
  );
}

function unique(values) {
  return Array.from(new Set(values));
}

function isSessionValid(session) {
  if (!session) return false;
  if (!session.expiresAt) return true;
  const expiresAt = new Date(session.expiresAt).getTime();
  if (!Number.isFinite(expiresAt)) return false;
  return expiresAt - Date.now() > 60 * 1000;
}
