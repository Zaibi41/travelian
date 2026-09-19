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
    const requestId = getRequestId(request);
    const logConfigBase = { _logRequestId: requestId };

    safeLogInfo({
      provider: this.name,
      step: "search-start",
      requestId,
      tripType: request?.tripType,
      origin: request?.origin,
      destination: request?.destination,
      departureDate: request?.departureDate,
      returnDate: request?.returnDate,
      adults: request?.adults,
      children: request?.children,
      infants: request?.infants,
      cabin: request?.cabin,
      currency: request?.currency,
      providerNames: Array.isArray(request?.providerNames) ? request.providerNames : undefined,
      timestamp: new Date().toISOString(),
    });

    const config = { ...(await this.config()), ...logConfigBase };
    const providerNames = await this.availableProviders(request, config);

    for (const provider of providerNames) {
      const searchPayload = this.searchPayload(request, provider);
      safeLogInfo({
        provider: this.name,
        step: "provider-search-payload",
        requestId,
        endpoint: "/v1/airline/search",
        path: "/v1/airline/search",
        payload: sanitizeForLog(searchPayload),
        timestamp: new Date().toISOString(),
      });
    }

    const attempts = await Promise.allSettled(
      providerNames.map((provider) => this.post("/v1/airline/search", this.searchPayload(request, provider), config))
    );
    const fulfilledProviderCalls = attempts.filter((attempt) => attempt.status === "fulfilled").length;
    const rejectedProviderCalls = attempts.filter((attempt) => attempt.status === "rejected").length;
    const payloads = attempts
      .filter((attempt) => attempt.status === "fulfilled")
      .map((attempt) => attempt.value);
    if (!payloads.length) {
      const firstError = attempts.find((attempt) => attempt.status === "rejected")?.reason;
      safeLogError({
        provider: this.name,
        step: "search-complete",
        requestId,
        payloadCount: 0,
        normalizedOffersCount: 0,
        providerNames,
        fulfilledProviderCalls,
        rejectedProviderCalls,
        error: firstError?.message || "SooperFare search returned no provider results",
        timestamp: new Date().toISOString(),
      });
      throw this.error(firstError?.message || "SooperFare search returned no provider results");
    }
    const flatOffers = payloads.flatMap((payload) => extractOffersFlat(payload));
    
    // Track airline distribution in raw/flat offers
    const rawAirlineBreakdown = flatOffers.reduce((acc, offer) => {
      const flight = offer.__outboundFlight || offer.__legFlights?.[0] || offer;
      const airline = pick(flight, ["marketing_carrier.name", "airline.name", "airline_name", "carrier.name", "provider", "supplier"]) || "Unknown";
      acc[airline] = (acc[airline] || 0) + 1;
      return acc;
    }, {});

    const extractedOffers = request.tripType === "roundtrip"
      ? combineRoundtripOffers(flatOffers, request)
      : request.tripType === "multicity"
        ? combineMulticityOffers(flatOffers, request)
        : flatOffers;
    // Roundtrip/multicity must stay combined; do not fall back to single-leg offers.
    const normalizedWithNull = extractedOffers.map((offer, index) => this.normalizeOffer(offer, request, index));
    const offers = consolidateFlightOffers(normalizedWithNull.filter(Boolean));
    const droppedCount = normalizedWithNull.length - offers.length;

    // Track airline distribution in final results
    const airlineBreakdown = offers.reduce((acc, offer) => {
      const airline = offer.airline || "Unknown";
      acc[airline] = (acc[airline] || 0) + 1;
      return acc;
    }, {});

    safeLogInfo({
      provider: this.name,
      step: "search-complete",
      requestId,
      payloadCount: payloads.length,
      flatOffersCount: flatOffers.length,
      rawAirlineBreakdown,
      extractedOffersCount: extractedOffers.length,
      normalizedOffersCount: offers.length,
      droppedOffersCount: droppedCount,
      airlineBreakdown,
      providerNames,
      fulfilledProviderCalls,
      rejectedProviderCalls,
      timestamp: new Date().toISOString(),
    });

    return offers;
  }

  async rawSearchFlights(request, airlineProvider) {
    const config = await this.config();
    const selectedProvider = airlineProvider || (await this.availableProviders(request, config))[0];
    const response = await outboundFetch(`${config.baseUrl}/v1/airline/search`, {
      method: "POST",
      headers: this.headers(config),
      body: JSON.stringify(this.searchPayload(request, selectedProvider)),
      signal: AbortSignal.timeout(sooperFareTimeoutMs()),
    });
    // Keep the provider body intact, including non-JSON error responses.
    return {
      statusCode: response.status,
      headers: {
        "content-type": response.headers.get("content-type") || "application/json",
        "x-travelian-provider-source": selectedProvider,
      },
      body: await response.text(),
    };
  }

  async rawProviderRequest(method, path, query, body, clientHeaders = {}) {
    let config;
    if (path === "/v1/partner/auth/login") {
      const secret = await getSecretJson(this.secretId);
      config = {
        baseUrl: String(secret?.baseUrl || secret?.base_url || "https://api.sooperfare.com").trim().replace(/\/$/, ""),
        authorization: secret?.authorization || secret?.basicAuth || secret?.basic_auth,
      };
      // Login uses AWS-held credentials, so the collection never needs the supplier password.
      const username = secret?.username || secret?.email;
      if (!username || !secret?.password) throw new Error("Provider login is not configured");
      body = JSON.stringify({ username, password: secret.password });
    } else {
      config = await this.config();
    }
    const response = await outboundFetch(`${config.baseUrl}${path}${query ? `?${query}` : ""}`, {
      method,
      headers: { ...this.headers(config), ...clientHeaders },
      ...(body === undefined ? {} : { body }),
      signal: AbortSignal.timeout(sooperFareTimeoutMs()),
    });
    return {
      statusCode: response.status,
      headers: { "content-type": response.headers.get("content-type") || "application/json" },
      body: await response.text(),
    };
  }

  async availableProviders(request, config) {
    const defaultProviders = [
      "SABRE",
      "PIA",
      "AIRBLUE",
      "AIRSIAL",
      "FLYJINNAH",
      "FLYNAS",
      "AIRARABIA",
      "FLYADEAL",
      "SERENE",
    ];
    const fallbackProviders = Array.isArray(config.providers) && config.providers.length
      ? config.providers
      : (config.provider ? [config.provider] : defaultProviders);

    try {
      const payload = this.availabilityPayload(request);
      const availability = await this.request("GET", "/v1/airline/availability", payload, config);
      const providers = extractAvailabilityProviders(availability);
      const candidates = providers.length ? new Set(providers) : new Set(fallbackProviders);

      const origin = airportCode(request?.origin);
      const dest = airportCode(request?.destination);
      const ksaAirports = ["JED", "RUH", "DMM", "MED", "AHB", "ELQ", "GIZ"];
      const uaeAirports = ["DXB", "SHJ", "AUH", "DWC", "RKT"];

      if (ksaAirports.includes(origin) || ksaAirports.includes(dest)) {
        candidates.add("FLYNAS");
      }
      if (uaeAirports.includes(origin) || uaeAirports.includes(dest) || ksaAirports.includes(origin) || ksaAirports.includes(dest)) {
        candidates.add("FLYJINNAH");
        candidates.add("AIRARABIA");
      }
      return Array.from(candidates);
    } catch (error) {
      safeLogWarn({
        provider: this.name,
        step: "availability-fallback",
        error: error.message,
      });
      return fallbackProviders;
    }
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

  async fareOptions(payload) {
    const response = await this.fareRules(payload);
    const legs = extractArray(response, ["data.providers"]).flatMap((provider) => extractArray(provider, ["legs"]));
    const references = payload.rawRef?.flightRefIds || [];
    const flights = legs.map((leg, index) => {
      const candidates = extractArray(leg, ["flights"]);
      return candidates.find((flight) => pick(flight, ["ref_id"]) === references[index]) || null;
    });
    if (!flights.length || flights.some((flight) => !flight)) {
      throw this.error("Selected SooperFare flight is no longer available. Please search again.", 409);
    }
    const options = flights.length === 1
      ? extractFareOptions(flights[0], extractPrice(flights[0]))
      : flights.length === 2
        ? extractRoundtripFareOptions(flights[0], flights[1], extractPrice(flights[0]))
        : extractMulticityFareOptions(flights, extractPrice(flights[0]));
    return { fareOptions: options.filter((option) => Number(option.price?.total) > 0) };
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
    return {
      ...this.availabilityPayload(request),
      redirect: true,
      provider,
    };
  }

  availabilityPayload(request) {
    // SooperFare trip_type values are always lowercase: one_way | return | multi_city
    const tripType = request.tripType === "roundtrip"
      ? "return"
      : request.tripType === "multicity"
        ? "multi_city"
        : "one_way";

    let legs;
    if (request.tripType === "multicity") {
      const segments = Array.isArray(request.segments) ? request.segments : [];
      legs = segments.map((segment) => ({
        from: String(segment.from || segment.origin || "").trim().toUpperCase(),
        to: String(segment.to || segment.destination || "").trim().toUpperCase(),
        date: segment.date || segment.departureDate,
      })).filter((leg) => leg.from && leg.to && leg.date);
    } else if (request.tripType === "roundtrip") {
      legs = [
        {
          from: request.origin,
          to: request.destination,
          date: request.departureDate,
        },
        {
          from: request.destination,
          to: request.origin,
          date: request.returnDate,
        },
      ];
    } else {
      legs = [{
        from: request.origin,
        to: request.destination,
        date: request.departureDate,
      }];
    }

    return {
      flexible_dates: false,
      trip_type: tripType,
      cabin_class: String(request.cabin || "economy").toLowerCase().replace(/\s+/g, "_"),
      legs,
      travelers: [
        { type: "adult", qty: Number(request.passengers?.adults ?? request.adults ?? 1) },
        { type: "child", qty: Number(request.passengers?.children ?? request.children ?? 0) },
        { type: "infant", qty: Number(request.passengers?.infants ?? request.infants ?? 0) },
      ],
    };
  }

  normalizeOffer(offer, request, index) {
    const isRoundtrip = Boolean(offer.__roundtrip && offer.__outboundFlight && offer.__returnFlight);
    const isMulticity = Boolean(offer.__multicity && Array.isArray(offer.__legFlights) && offer.__legFlights.length >= 2);
    const outboundRefId = pick(offer.__outboundFlight || offer.__legFlights?.[0] || offer, ["ref_id", "refId", "id", "uuid"]);
    const returnRefId = pick(offer.__returnFlight || offer.__legFlights?.[1], ["ref_id", "refId", "id", "uuid"]);
    const refId = offer.__searchRefId || outboundRefId || `${crypto.randomUUID()}`;

    let outboundSegments = [];
    let returnSegments = [];
    let legSegmentGroups = [];
    let segments = [];
    let first;
    let outboundLast;
    let returnFirst;
    let returnLast;

    if (isMulticity) {
      legSegmentGroups = offer.__legFlights.map((flight) => extractSegments(flight).filter(Boolean));
      segments = legSegmentGroups.flat();
      first = segments[0];
      outboundLast = legSegmentGroups[0]?.[legSegmentGroups[0].length - 1];
      const lastGroup = legSegmentGroups[legSegmentGroups.length - 1] || [];
      returnFirst = lastGroup[0];
      returnLast = lastGroup[lastGroup.length - 1];
    } else if (isRoundtrip) {
      outboundSegments = extractSegments(offer.__outboundFlight).filter(Boolean);
      returnSegments = extractSegments(offer.__returnFlight).filter(Boolean);
      segments = [...outboundSegments, ...returnSegments];
      first = outboundSegments[0];
      outboundLast = outboundSegments[outboundSegments.length - 1];
      returnFirst = returnSegments[0];
      returnLast = returnSegments[returnSegments.length - 1];
    } else {
      const legs = extractLegs(offer);
      segments = legs.flatMap((leg) => extractSegments(leg)).filter(Boolean);
      first = segments[0];
      outboundLast = segments[segments.length - 1];
    }

    const last = (isRoundtrip || isMulticity) ? outboundLast : segments[segments.length - 1];
    const price = isMulticity
      ? (offer.__legFares || []).reduce(
        (total, fare, fareIndex) => combinePrices(total, extractPrice(fare || offer.__legFlights?.[fareIndex])),
        { currency: "PKR", base: 0, taxes: 0, total: 0 },
      )
      : isRoundtrip
        ? combinePrices(
          extractPrice(offer.__outboundFare || offer.__outboundFlight),
          extractPrice(offer.__returnFare || offer.__returnFlight),
        )
        : extractPrice(offer);
    if (!first || !last || !price.total) {
      const sourceFlight = isMulticity ? offer.__legFlights?.[0] : isRoundtrip ? offer.__outboundFlight : offer;
      const airline = pick(sourceFlight, ["marketing_carrier.name", "airline.name", "airline_name", "carrier.name"]) || "Unknown";
      safeLogWarn({
        provider: this.name,
        step: "normalize-offer-dropped",
        airline,
        reason: !first ? "missing-first-segment" : !last ? "missing-last-segment" : "missing-price",
        segmentsCount: segments.length,
        hasPrice: Boolean(price.total),
        refId: outboundRefId,
      });
      return null;
    }

    const sourceFlight = isMulticity
      ? offer.__legFlights[0]
      : isRoundtrip
        ? offer.__outboundFlight
        : offer;
    const segmentAirlines = Array.from(new Set(
      segments.map((segment) => segment.airline || AIRLINE_CODE_MAP[segment.carrier]).filter(Boolean)
    ));
    const isMultiCarrier = segmentAirlines.length > 1;
    const fallbackAirline = pick(sourceFlight, ["marketing_carrier.name", "airline.name", "airline_name", "carrier.name", "provider", "supplier"]) || first.airline || "SooperFare";
    const airline = isMultiCarrier ? segmentAirlines.join(" / ") : fallbackAirline;
    const segmentCarrierCodes = Array.from(new Set(segments.map((segment) => segment.carrier).filter(Boolean)));
    const airlineCode = isMultiCarrier && segmentCarrierCodes.length > 1
      ? segmentCarrierCodes.join(" / ")
      : (pick(sourceFlight, ["marketing_carrier.iata", "airline.code", "carrier.code"]) || first.carrier || "");
    const outboundFlight = offer.__outboundFlight ? { ...offer.__outboundFlight, airline, airlineCode } : offer;
    const returnFlight = offer.__returnFlight ? { ...offer.__returnFlight, airline, airlineCode } : offer;
    const fareOptions = isMulticity
      ? extractMulticityFareOptions((offer.__legFlights || []).map((flight) => ({ ...flight, airline, airlineCode })), price)
      : isRoundtrip
        ? extractRoundtripFareOptions(outboundFlight, returnFlight, price)
        : extractFareOptions({ ...offer, airline, airlineCode }, price);
    const baggage = baggageFromSooperFareOffer(sourceFlight) || unique(segments.map((segment) => segment.baggage).filter(Boolean)).join(", ") || null;
    const meal = mealFromSooperFareOffer(offer) || unique(segments.map((segment) => segment.meal).filter(Boolean)).join(", ") || null;
    const layovers = isMulticity
      ? legSegmentGroups.flatMap((group) => layoversFromSegments(group))
      : isRoundtrip
        ? [...layoversFromSegments(outboundSegments), ...layoversFromSegments(returnSegments)]
        : layoversFromSegments(segments);
    const offerRefs = isMulticity
      ? offer.__legFlights.map((flight) => pick(flight, ["ref_id", "refId", "id", "uuid"])).filter(Boolean)
      : null;
    const stops = isMulticity
      ? legSegmentGroups.reduce((sum, group) => sum + Math.max(group.length - 1, 0), 0)
      : Math.max((isRoundtrip ? outboundSegments : segments).length - 1, 0);

    return {
      provider: this.name,
      offerId: offerRefs?.length
        ? `sooperfare-${offerRefs.join("-")}`
        : isRoundtrip && outboundRefId && returnRefId
          ? `sooperfare-${outboundRefId}-${returnRefId}`
          : `sooperfare-${outboundRefId || refId}`,
      airline,
      airlineCode,
      airlines: segmentAirlines,
      airlineImage: pick(sourceFlight, ["marketing_carrier.logo", "airline.logo", "airline.logo_url", "logo", "image_url", "image"]),
      flightNumber: segments.map((segment) => segment.flightNumber).filter(Boolean).join(" / ") || pick(sourceFlight, ["flight_number", "flightNo"]) || `SF-${index + 1}`,
      origin: request.origin,
      destination: request.destination,
      departureTime: first.departureTime,
      arrivalTime: last.arrivalTime,
      returnDepartureTime: isMulticity ? null : (returnFirst?.departureTime || null),
      returnArrivalTime: isMulticity ? null : (returnLast?.arrivalTime || null),
      duration: pick(sourceFlight, ["duration", "total_duration"]) || durationBetween(first.departureTime, last.arrivalTime),
      stops,
      segments,
      layovers,
      cabin: request.cabin,
      fareBrand: cleanGdsFareBrand(pick(offer, ["fare_brand", "brand", "fare.name"]) || request.cabin, airline, airlineCode),
      baggage,
      meal: mealLabel(meal),
      seats: pick(offer, ["seats", "availability", "available_seats", "fares.0.available_seats"]),
      refundable: pick(offer, ["refundable", "is_refundable"]),
      fareOptions,
      requiresReprice: true,
      price,
      rawRef: {
        refId,
        quotePayload: buildQuotePayload(offer, refId),
        faresPayload: buildFaresPayload(offer, refId),
        flightRefIds: isMulticity
          ? offer.__legFlights.map((flight) => pick(flight, ["ref_id"]))
          : isRoundtrip
            ? [pick(offer.__outboundFlight, ["ref_id"]), pick(offer.__returnFlight, ["ref_id"])]
            : [outboundRefId],
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
      signal: AbortSignal.timeout(sooperFareTimeoutMs()),
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
    return this.request("POST", path, body, config);
  }

  async request(method, path, body, config) {
    const requestId = getRequestId({ ...(body || {}), ...(config || {}), requestId: config?._logRequestId });
    const startedAt = Date.now();
    const sanitizedBody = sanitizeForLog(body || {});

    safeLogInfo({
      provider: this.name,
      step: "provider-request",
      requestId,
      method,
      path,
      body: sanitizedBody,
      timestamp: new Date().toISOString(),
    });

    try {
      const response = await outboundFetch(`${config.baseUrl}${path}`, {
        method,
        headers: this.headers(config),
        body: JSON.stringify(body || {}),
        signal: AbortSignal.timeout(sooperFareTimeoutMs()),
      });
      const responseTimeMs = Date.now() - startedAt;
      const raw = await response.text().catch(() => "");
      const payload = parseJson(raw);
      const sanitizedResponse = sanitizeForLog(payload);

      if (!response.ok) {
        safeLogError({
          provider: this.name,
          step: "provider-error",
          requestId,
          method,
          path,
          httpStatus: response.status,
          responseTimeMs,
          error: payload?.message || payload?.error || `SooperFare ${path} failed with ${response.status}`,
          body: sanitizedResponse,
          timestamp: new Date().toISOString(),
        });
        throw this.error(payload?.message || payload?.error || `SooperFare ${path} failed with ${response.status}`, response.status);
      }

      safeLogInfo({
        provider: this.name,
        step: "provider-response",
        requestId,
        method,
        path,
        httpStatus: response.status,
        responseTimeMs,
        body: sanitizedResponse,
        timestamp: new Date().toISOString(),
      });

      return payload;
    } catch (error) {
      if (error?.provider === this.name && error?.statusCode) throw error;
      const responseTimeMs = Date.now() - startedAt;
      safeLogError({
        provider: this.name,
        step: "provider-error",
        requestId,
        method,
        path,
        httpStatus: error?.statusCode || error?.status || undefined,
        responseTimeMs,
        error: error?.message || String(error),
        body: sanitizeForLog(error?.body || error?.response || undefined),
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
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

function extractOffers(payload, request = null) {
  const flatOffers = extractOffersFlat(payload);
  if (request?.tripType === "roundtrip") {
    const combined = combineRoundtripOffers(flatOffers, request);
    if (combined.length) return combined;
  }
  return flatOffers;
}

function extractOffersFlat(payload) {
  if (Array.isArray(payload)) return payload;
  const searchRefId = pick(payload, ["data.ref_id", "ref_id"]);
  const sooperFareFlights = [];
  const providers = extractArray(payload, ["data.providers", "providers"]);
  for (const provider of providers) {
    for (const leg of extractArray(provider, ["legs"])) {
      for (const flight of extractArray(leg, ["flights"])) {
        sooperFareFlights.push({
          ...flight,
          __provider: provider.provider || provider,
          __leg: leg,
          __searchRefId: searchRefId,
        });
      }
    }
  }
  if (sooperFareFlights.length) return sooperFareFlights;
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

function extractAvailabilityProviders(payload) {
  const providers = new Set();
  const direct = extractArray(payload, ["data.providers", "providers", "data", "results", "items"]);
  for (const item of direct) addProviderCandidate(providers, item, true);
  walk(payload, (value) => addProviderCandidate(providers, value));
  return Array.from(providers);
}

function addProviderCandidate(providers, value, allowString = false) {
  if (!value) return;
  if (typeof value === "string") {
    if (!allowString) return;
    const normalized = normalizeProvider(value);
    if (normalized) providers.add(normalized);
    return;
  }
  if (typeof value !== "object" || Array.isArray(value)) return;
  const candidate = pick(value, [
    "identifier",
    "provider",
    "provider_code",
    "providerCode",
    "provider_name",
    "providerName",
    "supplier",
    "supplier_code",
    "supplierCode",
    "source",
    "source_code",
    "sourceCode",
    "code",
  ]);
  const normalized = normalizeProvider(candidate);
  if (normalized) providers.add(normalized);
}

function normalizeProvider(value) {
  const text = String(value || "").trim();
  if (!text || text.length > 40) return null;
  if (/^[A-Z0-9_ -]{2,40}$/i.test(text)) return text.toUpperCase().replace(/\s+/g, "_");
  return null;
}

function extractArray(payload, paths = ["data", "results", "items", "bookings"]) {
  if (Array.isArray(payload)) return payload;
  for (const path of paths) {
    const value = pick(payload, [path]);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function consolidateFlightOffers(offers) {
  const byKey = new Map();
  for (const offer of offers) {
    if (!offer) continue;
    const key = `${offer.airlineCode || offer.airline}-${offer.flightNumber}-${offer.origin}-${offer.destination}-${offer.departureTime}`.toLowerCase();
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...offer, fareOptions: Array.isArray(offer.fareOptions) ? [...offer.fareOptions] : [] });
    } else {
      const existingOptions = existing.fareOptions || [];
      const newOptions = offer.fareOptions || [];
      for (const opt of newOptions) {
        const optKey = `${opt.tier}-${opt.bags}`.toLowerCase();
        if (!existingOptions.some((o) => `${o.tier}-${o.bags}`.toLowerCase() === optKey)) {
          existingOptions.push(opt);
        }
      }
      existing.fareOptions = existingOptions;
      if (offer.price?.total && (!existing.price?.total || offer.price.total < existing.price.total)) {
        existing.price = offer.price;
      }
    }
  }
  return Array.from(byKey.values());
}

function combineRoundtripOffers(flatOffers, request) {
  const origin = airportCode(request?.origin);
  const destination = airportCode(request?.destination);
  if (!origin || !destination) return [];

  const outboundFlights = flatOffers.filter((flight) => flightMatchesRoute(flight, origin, destination));
  const returnFlights = flatOffers.filter((flight) => flightMatchesRoute(flight, destination, origin));
  if (!outboundFlights.length || !returnFlights.length) return [];

  const combined = [];
  for (const outboundFlight of outboundFlights) {
    const pair = pickReturnFlightPair(outboundFlight, returnFlights);
    if (!pair) continue;

    combined.push({
      ...outboundFlight,
      __searchRefId: outboundFlight.__searchRefId,
      __roundtrip: true,
      __outboundLeg: outboundFlight.__leg,
      __returnLeg: pair.returnFlight.__leg,
      __outboundFlight: outboundFlight,
      __returnFlight: pair.returnFlight,
      __outboundFare: pair.outboundFare,
      __returnFare: pair.returnFare,
    });
  }

  return combined;
}

function combineMulticityOffers(flatOffers, request) {
  const routeSegments = Array.isArray(request?.segments) ? request.segments : [];
  if (routeSegments.length < 2) return [];

  const flightsByLeg = routeSegments.map((segment) => {
    const from = airportCode(segment.from || segment.origin);
    const to = airportCode(segment.to || segment.destination);
    return flatOffers.filter((flight) => flightMatchesRoute(flight, from, to));
  });
  if (flightsByLeg.some((list) => !list.length)) return [];

  const combined = [];
  for (const firstFlight of flightsByLeg[0]) {
    const selectedFlights = [firstFlight];
    const selectedFares = [];
    let failed = false;

    for (let legIndex = 1; legIndex < flightsByLeg.length; legIndex += 1) {
      const previousFlight = selectedFlights[selectedFlights.length - 1];
      const pair = pickReturnFlightPair(previousFlight, flightsByLeg[legIndex]);
      if (!pair) {
        failed = true;
        break;
      }
      if (legIndex === 1) selectedFares.push(pair.outboundFare);
      selectedFares.push(pair.returnFare);
      selectedFlights.push(pair.returnFlight);
    }

    if (failed || selectedFlights.length !== flightsByLeg.length) continue;

    combined.push({
      ...firstFlight,
      __searchRefId: firstFlight.__searchRefId,
      __multicity: true,
      __legFlights: selectedFlights,
      __legFares: selectedFares,
      __legMetas: selectedFlights.map((flight) => flight.__leg),
    });
  }

  return combined;
}

function flightMatchesRoute(flight, from, to) {
  const segments = extractSegments(flight).filter(Boolean);
  if (!segments.length) return false;
  const first = segments[0];
  const last = segments[segments.length - 1];
  return airportCode(first.origin) === from && airportCode(last.destination) === to;
}

function extractLegs(offer) {
  const legs = pick(offer, ["legs", "itinerary.legs", "data.legs"]);
  if (Array.isArray(legs) && legs.length) return legs;
  return [offer];
}

function airportCode(value) {
  return String(value || "").trim().toUpperCase();
}

function marketingCarrierCode(flight) {
  const direct = airportCode(pick(flight, [
    "marketing_carrier.iata",
    "marketing_carrier.code",
    "airline.code",
    "carrier",
    "segments.0.operating_carrier.iata",
    "segments.0.carrier",
  ]));
  if (direct) return direct;
  const segments = extractArray(flight, ["segments", "flights"]);
  for (const seg of segments) {
    const c = airportCode(pick(seg, ["carrier", "airline.code", "operating_carrier.iata", "marketing_carrier.iata"]));
    if (c) return c;
  }
  return "";
}

function areCarriersCompatible(carrierA, carrierB) {
  if (!carrierA || !carrierB) return true;
  if (carrierA === carrierB) return true;
  // Fly Jinnah (9P) and Air Arabia (G9) are joint venture / codeshare partners
  const partnerCodes = new Set(["9P", "G9"]);
  if (partnerCodes.has(carrierA) && partnerCodes.has(carrierB)) return true;
  return false;
}

function fareTierName(fare) {
  return String(pick(fare, ["name", "brand", "fare_brand", "type", "name_class"]) || "").trim();
}

function cheapestFare(flight) {
  const fares = extractArray(flight, ["fares", "fare_options", "brands"]);
  if (!fares.length) return null;
  return fares.reduce((best, fare) => {
    const total = extractPrice(fare).total || Infinity;
    return total < (extractPrice(best).total || Infinity) ? fare : best;
  }, fares[0]);
}

function pickReturnFlightPair(outboundFlight, returnFlights) {
  const outboundCarrier = marketingCarrierCode(outboundFlight);
  const compatibleReturns = returnFlights.filter(
    (candidate) => areCarriersCompatible(marketingCarrierCode(candidate), outboundCarrier),
  );
  if (!compatibleReturns.length) return null;

  const outboundFares = extractArray(outboundFlight, ["fares", "fare_options", "brands"]);
  if (!outboundFares.length) return null;

  let best = null;

  for (const returnFlight of compatibleReturns) {
    const returnFares = extractArray(returnFlight, ["fares", "fare_options", "brands"]);
    if (!returnFares.length) continue;

    for (const outboundFare of outboundFares) {
      const comboIds = extractArray(outboundFare, ["combinability_fares"])
        .map((combo) => String(pick(combo, ["ref_id", "fare_ref_id", "id"]) || ""))
        .filter(Boolean);

      const eligibleReturnFares = comboIds.length
        ? returnFares.filter((fare) => comboIds.includes(String(fare.ref_id || "")))
        : returnFares.filter((fare) => fareTierName(fare) === fareTierName(outboundFare));

      const faresToCheck = eligibleReturnFares.length
        ? eligibleReturnFares
        : (comboIds.length ? [] : [cheapestFare(returnFlight)].filter(Boolean));

      for (const returnFare of faresToCheck) {
        const total = (extractPrice(outboundFare).total || 0) + (extractPrice(returnFare).total || 0);
        if (!total) continue;
        if (!best || total < best.total) {
          best = { returnFlight, outboundFare, returnFare, total };
        }
      }
    }
  }

  return best
    ? {
      returnFlight: best.returnFlight,
      outboundFare: best.outboundFare,
      returnFare: best.returnFare,
    }
    : null;
}

function combinePrices(left, right) {
  const outbound = left || {};
  const inbound = right || {};
  const currency = outbound.currency || inbound.currency || "PKR";
  const base = (number(outbound.base) || 0) + (number(inbound.base) || 0);
  const taxes = (number(outbound.taxes) || 0) + (number(inbound.taxes) || 0);
  const total = (number(outbound.total) || 0) + (number(inbound.total) || 0);
  return { currency, base, taxes, total };
}

function extractSegments(leg) {
  const segments = pick(leg, ["segments", "flights", "flight_segments", "slices", "items"]);
  if (Array.isArray(segments) && segments.length) return segments.map(segmentFrom);
  const flight = pick(leg, ["flight"]);
  if (flight && typeof flight === "object") return [segmentFrom(flight)];
  return [segmentFrom(leg)];
}

const AIRLINE_CODE_MAP = {
  "9P": "Fly Jinnah",
  "G9": "Air Arabia",
  "XY": "Flynas",
  "PF": "AirSial",
  "PA": "Airblue",
  "PK": "PIA",
  "ER": "SereneAir",
  "FZ": "Flydubai",
  "EK": "Emirates",
  "QR": "Qatar Airways",
  "SV": "Saudia",
  "F3": "Flyadeal",
  "WY": "Oman Air",
  "J9": "Jazeera Airways",
  "KU": "Kuwait Airways",
  "TK": "Turkish Airlines",
  "OV": "SalamAir",
  "EY": "Etihad Airways",
};

function segmentFrom(segment) {
  const origin = pick(segment, ["from.iata", "from.code", "from", "origin", "departure.airport", "departure.iata", "departure.location", "departure_airport"]);
  const destination = pick(segment, ["to.iata", "to.code", "to", "destination", "arrival.airport", "arrival.iata", "arrival.location", "arrival_airport"]);
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
  const rawCarrier = pick(segment, ["carrier", "airline.code", "operating_carrier.iata", "marketing_carrier.iata", "carrier.code"]);
  const carrierCode = String(rawCarrier || "").trim().toUpperCase();
  const rawAirline = pick(segment, ["airline.name", "airline_name", "operating_carrier.name", "marketing_carrier.name"]);
  const airline = rawAirline || AIRLINE_CODE_MAP[carrierCode] || undefined;
  return {
    flightNumber: normalizeFlightNumber(pick(segment, ["flight_number", "flightNo", "number"]) || [carrierCode, pick(segment, ["flight.number"])].filter(Boolean).join("-")),
    carrier: carrierCode || undefined,
    airline,
    origin: String(origin).toUpperCase(),
    destination: String(destination).toUpperCase(),
    departureAirport: pick(segment, ["from.name", "departure.name", "departure_airport_name"]) || origin,
    arrivalAirport: pick(segment, ["to.name", "arrival.name", "arrival_airport_name"]) || destination,
    departureTime,
    arrivalTime,
    baggage: pick(segment, ["baggage", "baggage_info", "included_baggage", "fares.0.baggage_policies.0.description"]),
    meal: pick(segment, ["meal", "meal_info"]),
  };
}

function extractPrice(offer) {
  const total = number(pick(offer, ["price.total", "price", "fare.total", "total_price", "billable_price", "total", "amount", "fares.0.total_price", "fares.0.billable_price", "fares.0.total", "fares.0.amount", "pricing.total"]));
  const base = number(pick(offer, ["price.base", "fare.base", "base_price", "base", "base_fare", "fares.0.base_price", "fares.0.base", "pricing.base"])) || total;
  const taxes = number(pick(offer, ["price.taxes", "fare.taxes", "taxes", "tax", "fares.0.taxes", "pricing.taxes"]));
  return {
    currency: pick(offer, ["price.currency", "fare.currency", "currency.code", "currency", "fares.0.currency.code", "fares.0.currency", "pricing.currency"]) || "PKR",
    base,
    taxes,
    total,
  };
}

function resolveFlightCarrierInfo(flight) {
  const carrierCode = String(
    flight?.airlineCode
    || pick(flight, ["carrier", "marketing_carrier.iata", "operating_carrier.iata", "airline.code", "airline_code", "iata"])
    || flight?.segments?.[0]?.carrier
    || flight?.segments?.[0]?.marketing_carrier?.iata
    || ""
  ).trim().toUpperCase();

  const airlineName = String(
    flight?.airline
    || pick(flight, ["marketing_carrier.name", "operating_carrier.name", "airline.name", "airline_name"])
    || flight?.segments?.[0]?.airline
    || flight?.segments?.[0]?.marketing_carrier?.name
    || AIRLINE_CODE_MAP[carrierCode]
    || ""
  ).trim().toLowerCase();

  const provider = String(flight?.provider || "").trim().toUpperCase();

  return { carrierCode, airlineName, provider };
}

function cleanGdsFareBrand(brand, airline, code) {
  const text = String(brand || "").trim();
  if (!text) return text;
  const isExcludedGds = ["QR", "SV", "GF", "EK"].includes(String(code || "").toUpperCase())
    || /qatar|saudia|saudi arabian|gulf air|emirates/i.test(String(airline || ""));
  return isExcludedGds ? text.replace(/\s*\([A-Z0-9]{1,2}\)$/i, "").trim() || text : text;
}

function formatSooperFareTier(fare, flight) {
  const tierName = (pick(fare, ["name", "brand", "fare_brand", "brand_name", "type", "fare_type", "family", "fare_family", "tier"]) || "Supplier Fare").trim();
  const bookingClass = pick(fare, ["class_code", "rbd", "booking_class", "cabin_code", "class", "code"]);

  const { carrierCode, airlineName, provider } = resolveFlightCarrierInfo(flight);

  // 1. Qatar Airways (QR), Saudia (SV), Gulf Air (GF), Emirates (EK)
  // Remove booking class code from fare type: e.g. "Economy Classic" instead of "Economy Classic (T)"
  const isExcludedGds = ["QR", "SV", "GF", "EK"].includes(carrierCode)
    || /qatar|saudia|saudi arabian|gulf air|emirates/i.test(airlineName);

  if (isExcludedGds) {
    return tierName.replace(/\s*\([A-Z0-9]{1,2}\)$/i, "").trim() || tierName;
  }

  // 2. AirSial (PF), Airblue (PA), Fly Jinnah (9P)
  // For these airlines, original fare/class information must remain visible and NOT stripped
  const isDomesticPreserve = ["PF", "PA", "9P"].includes(carrierCode)
    || ["AIRSIAL", "AIRBLUE", "FLYJINNAH"].includes(provider)
    || /airsial|air sial|airblue|air blue|fly jinnah|flyjinnah/i.test(airlineName);

  if (isDomesticPreserve) {
    if (bookingClass && String(bookingClass).trim().length <= 2) {
      const code = String(bookingClass).trim().toUpperCase();
      if (tierName.toUpperCase().includes(`(${code})`) || tierName.toUpperCase() === code) {
        return tierName;
      }
      return `${tierName} (${code})`;
    }
    return tierName;
  }

  // 3. Other domestic carriers (PIA, Serene)
  const isOtherDomestic = ["PK", "ER"].includes(carrierCode)
    || ["PIA", "SERENE"].includes(provider)
    || /pakistan international|serene/i.test(airlineName);

  if (isOtherDomestic) {
    if (bookingClass && String(bookingClass).trim().length <= 2) {
      const code = String(bookingClass).trim().toUpperCase();
      if (tierName.toUpperCase().includes(`(${code})`) || tierName.toUpperCase() === code) {
        return tierName;
      }
      return `${tierName} (${code})`;
    }
    return tierName;
  }

  // 4. Default: If bookingClass is available and it's not excluded GDS, preserve tierName + bookingClass
  if (bookingClass && String(bookingClass).trim().length <= 2) {
    const code = String(bookingClass).trim().toUpperCase();
    if (tierName.toUpperCase().includes(`(${code})`) || tierName.toUpperCase() === code) {
      return tierName;
    }
    return `${tierName} (${code})`;
  }

  return tierName;
}

function formatSooperFareRoundtripTier(outboundFare, returnFare, outboundFlight, returnFlight) {
  const tierName = (fareTierName(outboundFare) || fareTierName(returnFare) || "Supplier Fare").trim();
  const bookingClass = pick(outboundFare, ["class_code", "rbd", "booking_class", "cabin_code"])
    || pick(returnFare, ["class_code", "rbd", "booking_class", "cabin_code"]);

  const { carrierCode, airlineName, provider } = resolveFlightCarrierInfo(outboundFlight);

  const isExcludedGds = ["QR", "SV", "GF", "EK"].includes(carrierCode)
    || /qatar|saudia|saudi arabian|gulf air|emirates/i.test(airlineName);

  if (isExcludedGds) {
    return tierName.replace(/\s*\([A-Z0-9]{1,2}\)$/i, "").trim() || tierName;
  }

  const isDomesticPreserve = ["PF", "PA", "9P"].includes(carrierCode)
    || ["AIRSIAL", "AIRBLUE", "FLYJINNAH"].includes(provider)
    || /airsial|air sial|airblue|air blue|fly jinnah|flyjinnah/i.test(airlineName);

  if (isDomesticPreserve) {
    if (bookingClass && String(bookingClass).trim().length <= 2) {
      const code = String(bookingClass).trim().toUpperCase();
      if (tierName.toUpperCase().includes(`(${code})`) || tierName.toUpperCase() === code) {
        return tierName;
      }
      return `${tierName} (${code})`;
    }
    return tierName;
  }

  if (bookingClass && String(bookingClass).trim().length <= 2) {
    const code = String(bookingClass).trim().toUpperCase();
    if (tierName.toUpperCase().includes(`(${code})`) || tierName.toUpperCase() === code) {
      return tierName;
    }
    return `${tierName} (${code})`;
  }

  return tierName;
}

function extractFareOptions(offer, fallbackPrice) {
  const fares = extractArray(offer, ["fares", "fare_options", "brands", "data.fares"]);
  if (!fares.length) {
    return [{
      tier: pick(offer, ["fare_brand", "brand", "fare.name", "type"]) || "Supplier Fare",
      price: fallbackPrice,
      bags: baggageFromSooperFareOffer(offer) || "Baggage info not available",
      meal: mealLabel(mealFromSooperFareFlight(offer)),
      change: "Subject to supplier rules",
      refund: offer.refundable === false ? "Non-refundable" : "Subject to supplier rules",
      cancellation: offer.refundable === false ? "Non-refundable" : "Subject to supplier rules",
      amenities: [],
    }];
  }
  const flightMeal = mealLabel(mealFromSooperFareFlight(offer));
  return fares.map((fare) => {
    const price = extractPrice(fare);
    const tier = formatSooperFareTier(fare, offer);
    const refund = refundFromSooperFareFare(fare, offer) || (offer.refundable === false ? "Non-refundable" : "Subject to supplier rules");
    const change = changeFromSooperFareFare(fare) || "Subject to supplier rules";
    return {
      tier,
      price: price.total ? price : fallbackPrice,
      bags: baggageFromSooperFareFare(fare) || baggageFromSooperFareOffer(offer) || "Baggage info not available",
      meal: flightMeal,
      change,
      refund,
      cancellation: refund,
      farePolicies: Array.isArray(fare.fare_policies) ? fare.fare_policies : undefined,
      amenities: extractArray(fare, ["amenities", "attributes"]).map((item) => typeof item === "string" ? item : pick(item, ["name", "label", "Classification"])).filter(Boolean),
      refId: pick(fare, ["ref_id", "id"]),
    };
  });
}

function extractRoundtripFareOptions(outboundFlight, returnFlight, fallbackPrice) {
  const outboundFares = extractArray(outboundFlight, ["fares", "fare_options", "brands", "data.fares"]);
  const returnFares = extractArray(returnFlight, ["fares", "fare_options", "brands", "data.fares"]);
  if (!outboundFares.length || !returnFares.length) {
    return extractFareOptions(outboundFlight, fallbackPrice);
  }

  const options = [];
  const roundtripMeal = mealLabel(mealFromSooperFareFlights(outboundFlight, returnFlight));
  for (const outboundFare of outboundFares) {
    const comboIds = extractArray(outboundFare, ["combinability_fares"])
      .map((combo) => String(pick(combo, ["ref_id", "fare_ref_id", "id"]) || ""))
      .filter(Boolean);
    const compatibleReturnFares = comboIds.length
      ? returnFares.filter((fare) => comboIds.includes(String(fare.ref_id || "")))
      : returnFares.filter((fare) => fareTierName(fare) === fareTierName(outboundFare));
    const returnFareList = compatibleReturnFares.length
      ? compatibleReturnFares
      : returnFares;

    for (const returnFare of returnFareList) {
      const price = combinePrices(extractPrice(outboundFare), extractPrice(returnFare));
      if (!price.total) continue;
      const tier = formatSooperFareRoundtripTier(outboundFare, returnFare, outboundFlight, returnFlight);
      options.push({
        tier,
        price,
        bags: baggageFromSooperFareFare(outboundFare)
          || baggageFromSooperFareFare(returnFare)
          || baggageFromSooperFareOffer(outboundFlight)
          || "Baggage info not available",
        meal: roundtripMeal,
        change: changeFromSooperFareFare(outboundFare)
          || changeFromSooperFareFare(returnFare)
          || "Subject to supplier rules",
        refund: refundFromSooperFareFare(outboundFare, outboundFlight)
          || refundFromSooperFareFare(returnFare, returnFlight)
          || (outboundFlight?.refundable === false || returnFlight?.refundable === false ? "Non-refundable" : "Subject to supplier rules"),
        cancellation: refundFromSooperFareFare(outboundFare, outboundFlight)
          || refundFromSooperFareFare(returnFare, returnFlight)
          || (outboundFlight?.refundable === false || returnFlight?.refundable === false ? "Non-refundable" : "Subject to supplier rules"),
        farePolicies: [
          ...(Array.isArray(outboundFare.fare_policies) ? outboundFare.fare_policies : []),
          ...(Array.isArray(returnFare.fare_policies) ? returnFare.fare_policies : []),
        ],
        amenities: unique([
          ...extractArray(outboundFare, ["amenities", "attributes"]).map((item) => typeof item === "string" ? item : pick(item, ["name", "label", "Classification"])),
          ...extractArray(returnFare, ["amenities", "attributes"]).map((item) => typeof item === "string" ? item : pick(item, ["name", "label", "Classification"])),
        ].filter(Boolean)),
        refId: pick(outboundFare, ["ref_id", "id"]),
        returnFareRefId: pick(returnFare, ["ref_id", "id"]),
      });
    }
  }

  if (!options.length) return extractFareOptions(outboundFlight, fallbackPrice);

  // Deduplicate by tier+baggage combination to preserve fare variations with different baggage
  const byKey = new Map();
  for (const option of options) {
    const key = `${option.tier}|${option.bags}`;
    const existing = byKey.get(key);
    if (!existing || option.price.total < existing.price.total) byKey.set(key, option);
  }
  return Array.from(byKey.values());
}

function extractMulticityFareOptions(flights, fallbackPrice) {
  if (!Array.isArray(flights) || flights.length < 2) {
    return extractFareOptions(flights?.[0] || {}, fallbackPrice);
  }

  const firstFares = extractArray(flights[0], ["fares", "fare_options", "brands", "data.fares"]);
  if (!firstFares.length) return extractFareOptions(flights[0], fallbackPrice);

  const options = [];
  const meal = mealLabel(mealFromSooperFareFlights(...flights));

  for (const firstFare of firstFares) {
    const matchedFares = [firstFare];
    let failed = false;

    for (let index = 1; index < flights.length; index += 1) {
      const previousFare = matchedFares[matchedFares.length - 1];
      const nextFares = extractArray(flights[index], ["fares", "fare_options", "brands", "data.fares"]);
      if (!nextFares.length) {
        failed = true;
        break;
      }

      const comboIds = extractArray(previousFare, ["combinability_fares"])
        .map((combo) => String(pick(combo, ["ref_id", "fare_ref_id", "id"]) || ""))
        .filter(Boolean);
      const sameTier = nextFares.filter((fare) => fareTierName(fare) === fareTierName(firstFare));
      const eligible = comboIds.length
        ? nextFares.filter((fare) => comboIds.includes(String(fare.ref_id || "")))
        : sameTier;
      const nextFare = (eligible.length ? eligible : nextFares)
        .reduce((best, fare) => {
          const total = extractPrice(fare).total || Infinity;
          return total < (extractPrice(best).total || Infinity) ? fare : best;
        }, eligible[0] || nextFares[0]);

      if (!nextFare) {
        failed = true;
        break;
      }
      matchedFares.push(nextFare);
    }

    if (failed) continue;

    const price = matchedFares.reduce(
      (total, fare) => combinePrices(total, extractPrice(fare)),
      { currency: "PKR", base: 0, taxes: 0, total: 0 },
    );
    if (!price.total) continue;

    const tier = formatSooperFareTier(firstFare, flights[0]);
    options.push({
      tier,
      price,
      bags: baggageFromSooperFareFare(firstFare)
        || baggageFromSooperFareOffer(flights[0])
        || "Baggage info not available",
      meal,
      change: matchedFares.map((f) => changeFromSooperFareFare(f)).find(Boolean) || "Subject to supplier rules",
      refund: matchedFares.map((f) => refundFromSooperFareFare(f)).find(Boolean)
        || (flights.some((f) => f?.refundable === false) ? "Non-refundable" : "Subject to supplier rules"),
      cancellation: matchedFares.map((f) => refundFromSooperFareFare(f)).find(Boolean)
        || (flights.some((f) => f?.refundable === false) ? "Non-refundable" : "Subject to supplier rules"),
      farePolicies: matchedFares.flatMap((f) => Array.isArray(f.fare_policies) ? f.fare_policies : []),
      amenities: unique(matchedFares.flatMap((fare) => extractArray(fare, ["amenities", "attributes"])
        .map((item) => typeof item === "string" ? item : pick(item, ["name", "label", "Classification"]))
        .filter(Boolean))),
      refId: pick(firstFare, ["ref_id", "id"]),
      fareRefIds: matchedFares.map((fare) => pick(fare, ["ref_id", "id"])).filter(Boolean),
    });
  }

  if (!options.length) return extractFareOptions(flights[0], fallbackPrice);

  // Deduplicate by tier+baggage combination to preserve fare variations with different baggage
  const byKey = new Map();
  for (const option of options) {
    const key = `${option.tier}|${option.bags}`;
    const existing = byKey.get(key);
    if (!existing || option.price.total < existing.price.total) byKey.set(key, option);
  }
  return Array.from(byKey.values());
}

function formatSooperFareBaggagePolicies(policies) {
  if (!Array.isArray(policies) || !policies.length) return null;

  const findPolicy = (type) => policies.find((policy) => String(policy?.type || "").toLowerCase() === type);
  const carry = findPolicy("carry") || findPolicy("cabin") || findPolicy("hand");
  const checked = findPolicy("checked") || findPolicy("checkin") || findPolicy("check_in");

  const carryWeight = Number(carry?.weight_limit || carry?.weight || 0);
  const parts = carryWeight > 0 ? [carryWeight] : [];

  if (checked) {
    let weight = Number(checked.weight_limit || checked.weight || 0);
    if (weight === 0 && checked.description) {
      const match = String(checked.description).match(/(\d+)\s*(?:kg|kilos|k)\b/i);
      if (match) weight = Number(match[1]);
    }
    const pieces = Number(checked.pieces) || (weight > 0 ? 1 : 0);
    if (weight > 0 && pieces > 0) {
      for (let index = 0; index < pieces; index += 1) {
        parts.push(weight);
      }
    } else if (pieces > 0 && !parts.length) {
      return `${pieces} Piece${pieces > 1 ? "s" : ""}`;
    }
  }

  if (parts.length) return parts.map((weight) => `${weight}Kg`).join(" + ");

  const descriptions = policies.map((p) => p?.description).filter(Boolean);
  if (descriptions.length) return descriptions.join(" + ");

  return null;
}

function baggageFromSooperFareFare(fare) {
  if (!fare || typeof fare !== "object") return null;
  const fromPolicies = formatSooperFareBaggagePolicies(fare.baggage_policies);
  if (fromPolicies) return fromPolicies;
  const direct = pick(fare, ["baggage", "bags", "baggage_info", "baggage_allowance", "included_baggage", "allowance"]);
  if (direct && typeof direct === "string" && direct.trim()) return direct.trim();

  // Flynas tier defaults when policy is missing or incomplete
  const tierName = String(pick(fare, ["name", "brand", "fare_brand", "type"]) || "").toLowerCase();
  if (tierName.includes("light")) return "7Kg";
  if (tierName.includes("value")) return "7Kg + 20Kg";
  if (tierName.includes("plus")) return "7Kg + 30Kg";

  return null;
}

function baggageFromSooperFareOffer(offer) {
  const fares = extractArray(offer, ["fares", "fare_options", "brands", "data.fares"]);
  for (const fare of fares) {
    const baggage = baggageFromSooperFareFare(fare);
    if (baggage) return baggage;
  }
  return pick(offer, ["baggage", "baggage_info", "included_baggage"]) || null;
}

function formatSooperFareFarePolicies(policies, type) {
  if (!Array.isArray(policies) || !policies.length) return null;
  const target = String(type || "").trim().toLowerCase();
  const matched = policies.filter((policy) => String(policy?.type || "").trim().toLowerCase() === target);
  if (!matched.length) return null;

  const adultOrAll = matched.filter((p) => !p?.traveler_type || String(p.traveler_type).toLowerCase() === "adult");
  const chosen = adultOrAll.length ? adultOrAll : matched;

  const descriptions = chosen
    .map((p) => String(p?.description || "").trim())
    .filter(Boolean);

  const unique = Array.from(new Set(descriptions));
  return unique.length ? unique.join("\n") : null;
}

function refundFromSooperFareFare(fare, fallbackOffer) {
  if (!fare || typeof fare !== "object") return null;
  const fromPolicies = formatSooperFareFarePolicies(fare.fare_policies, "refund");
  if (fromPolicies) return fromPolicies;
  const direct = pick(fare, ["refund", "cancellation", "cancellation_policy", "refund_policy", "cancellation_fee", "refund_fee"]);
  if (direct && typeof direct === "string" && direct.trim()) return direct.trim();
  if (fare.refundable === false || fare.is_refundable === false || fallbackOffer?.refundable === false) return "Non-refundable";
  if (fare.refundable === true || fare.is_refundable === true || fallbackOffer?.refundable === true) return "Refundable (subject to airline policy)";
  return null;
}

function changeFromSooperFareFare(fare) {
  if (!fare || typeof fare !== "object") return null;
  const fromPolicies = formatSooperFareFarePolicies(fare.fare_policies, "exchange");
  if (fromPolicies) return fromPolicies;
  const direct = pick(fare, ["change", "change_policy", "change_fee", "exchange_policy", "date_change"]);
  if (direct && typeof direct === "string" && direct.trim()) return direct.trim();
  return null;
}


function isSooperFareMealAvailable(item) {
  const type = String(item?.availability_type || "").toLowerCase();
  return type === "available" || type === "included";
}

function isSooperFareMealUnavailable(item) {
  const type = String(item?.availability_type || "").toLowerCase();
  return type === "unavailable" || type === "not_available" || type === "not available" || type === "not_included" || type === "not included";
}

function formatSooperFareMeals(meals) {
  if (!Array.isArray(meals) || !meals.length) return null;

  const availableCount = meals.filter((item) => isSooperFareMealAvailable(item)).length;
  if (availableCount > 0) return "Included";
  if (meals.every((item) => isSooperFareMealUnavailable(item))) return "Not included";
  return null;
}

function mealFromSooperFareFlight(flight) {
  if (!flight || typeof flight !== "object") return null;

  const direct = pick(flight, ["meal", "meal_info"]);
  if (direct) return String(direct).trim();

  const fromAncillaries = formatSooperFareMeals(pick(flight, ["ancillaries.meals"]));
  if (fromAncillaries) return fromAncillaries;

  const meals = pick(flight, ["meals"]);
  if (typeof meals === "string" && meals.trim()) return meals.trim();
  return formatSooperFareMeals(meals);
}

function mealFromSooperFareFlights(...flights) {
  const values = flights.map((flight) => mealFromSooperFareFlight(flight)).filter(Boolean);
  if (values.some((value) => value === "Included")) return "Included";
  if (values.length && values.every((value) => value === "Not included")) return "Not included";
  return values[0] || null;
}

function mealFromSooperFareOffer(offer) {
  if (offer?.__multicity && Array.isArray(offer.__legFlights)) {
    return mealFromSooperFareFlights(...offer.__legFlights);
  }
  if (offer?.__roundtrip) {
    return mealFromSooperFareFlights(offer.__outboundFlight, offer.__returnFlight);
  }
  return mealFromSooperFareFlight(offer);
}

function buildQuotePayload(offer, refId) {
  if (offer.__multicity && Array.isArray(offer.__legFlights)) {
    return compact({
      ref_id: offer.__searchRefId || refId,
      legs: offer.__legFlights.map((flight, index) => compact({
        ref_id: pick(offer.__legMetas?.[index] || flight.__leg, ["ref_id", "id"]),
        flight: compact({
          ref_id: pick(flight, ["ref_id", "id"]),
          fare: (() => {
            const fareRef = pick(offer.__legFares?.[index], ["ref_id", "id"])
              || pick(flight?.fares?.[0], ["ref_id", "id"]);
            return fareRef ? { ref_id: fareRef } : undefined;
          })(),
        }),
      })),
    });
  }
  if (offer.__roundtrip) {
    const outboundFareRef = pick(offer.__outboundFare, ["ref_id", "id"])
      || pick(offer.__outboundFlight?.fares?.[0], ["ref_id", "id"]);
    const returnFareRef = pick(offer.__returnFare, ["ref_id", "id"])
      || pick(offer.__returnFlight?.fares?.[0], ["ref_id", "id"]);
    return compact({
      ref_id: offer.__searchRefId || refId,
      legs: [
        compact({
          ref_id: pick(offer.__outboundLeg, ["ref_id", "id"]),
          flight: compact({
            ref_id: pick(offer.__outboundFlight, ["ref_id", "id"]),
            fare: outboundFareRef ? { ref_id: outboundFareRef } : undefined,
          }),
        }),
        compact({
          ref_id: pick(offer.__returnLeg, ["ref_id", "id"]),
          flight: compact({
            ref_id: pick(offer.__returnFlight, ["ref_id", "id"]),
            fare: returnFareRef ? { ref_id: returnFareRef } : undefined,
          }),
        }),
      ],
    });
  }
  if (offer.__leg?.ref_id || offer.ref_id || offer.fares?.[0]?.ref_id) {
    return compact({
      ref_id: refId,
      legs: [{
        ref_id: offer.__leg?.ref_id,
        flight: {
          ref_id: offer.ref_id,
          fare: { ref_id: offer.fares?.[0]?.ref_id },
        },
      }],
    });
  }
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
  if (offer.__multicity && Array.isArray(offer.__legFlights)) {
    return compact({
      ref_id: offer.__searchRefId || refId,
      legs: offer.__legFlights
        .map((flight, index) => ({
          ref_id: pick(offer.__legMetas?.[index] || flight.__leg, ["ref_id", "id"]),
        }))
        .filter((leg) => leg.ref_id),
    });
  }
  if (offer.__roundtrip) {
    return compact({
      ref_id: offer.__searchRefId || refId,
      legs: [
        { ref_id: pick(offer.__outboundLeg, ["ref_id", "id"]) },
        { ref_id: pick(offer.__returnLeg, ["ref_id", "id"]) },
      ].filter((leg) => leg.ref_id),
    });
  }
  if (offer.__leg?.ref_id) return compact({ ref_id: refId, legs: [{ ref_id: offer.__leg.ref_id }] });
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
  if (text === "1" || /^yes|included|available$/i.test(text)) return "Included";
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

function parseJson(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

function isSessionValid(session) {
  if (!session) return false;
  if (!session.expiresAt) return true;
  const expiresAt = new Date(session.expiresAt).getTime();
  if (!Number.isFinite(expiresAt)) return false;
  return expiresAt - Date.now() > 60 * 1000;
}

const SENSITIVE_LOG_KEYS = new Set([
  "authorization",
  "x-sf-authorization",
  "x-sf-token",
  "token",
  "access_token",
  "refresh_token",
  "password",
  "basicauth",
  "basic_auth",
  "secret",
  "apikey",
  "api_key",
  "bearer",
  "cookie",
  "set-cookie",
  "card",
  "cardnumber",
  "cvv",
  "cnic",
  "passport",
  "passportnumber",
  "passport_number",
  "nic",
]);

function normalizeLogKey(key) {
  return String(key || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function isSensitiveLogKey(key) {
  const normalized = normalizeLogKey(key);
  if (SENSITIVE_LOG_KEYS.has(normalized)) return true;
  if (SENSITIVE_LOG_KEYS.has(String(key || "").trim().toLowerCase())) return true;
  return false;
}

function sanitizeForLog(value, depth = 0) {
  try {
    if (value === null || value === undefined) return value;
    if (depth > 8) return "[Truncated]";
    if (Array.isArray(value)) return value.map((item) => sanitizeForLog(item, depth + 1));
    if (typeof value !== "object") return value;
    const sanitized = {};
    for (const [key, item] of Object.entries(value)) {
      if (key === "_logRequestId") continue;
      if (isSensitiveLogKey(key)) {
        sanitized[key] = "***MASKED***";
        continue;
      }
      sanitized[key] = sanitizeForLog(item, depth + 1);
    }
    return sanitized;
  } catch {
    return "[Unserializable]";
  }
}

function sooperFareTimeoutMs() {
  const specific = Number(process.env.SOOPERFARE_TIMEOUT_MS);
  if (Number.isFinite(specific) && specific > 0) return specific;
  const shared = Number(process.env.PROVIDER_TIMEOUT_MS);
  if (Number.isFinite(shared) && shared > 9000) return shared;
  return 25000;
}

function getRequestId(bodyOrRequest = {}) {
  try {
    const source = bodyOrRequest && typeof bodyOrRequest === "object" ? bodyOrRequest : {};
    const candidate = source.requestId
      || source.traceId
      || source._logRequestId
      || source.meta?.requestId
      || source.meta?.traceId
      || source.body?.requestId
      || source.body?.traceId
      || source.body?.meta?.requestId;
    if (candidate) return String(candidate);
  } catch {
    // ignore and generate
  }
  return `SOOPERFARE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeLogInfo(payload) {
  try {
    console.info(JSON.stringify(sanitizeForLog(payload)));
  } catch {
    // logging must never break flight search
  }
}

function safeLogError(payload) {
  try {
    console.error(JSON.stringify(sanitizeForLog(payload)));
  } catch {
    // logging must never break flight search
  }
}

