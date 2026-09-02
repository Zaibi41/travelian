const AIRPORT_RE = /^[A-Z]{3}$/;
const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY || "PKR";

export function validateSearchRequest(input) {
  const errors = [];
  const rawSegments = Array.isArray(input.segments) ? input.segments : [];
  const segments = rawSegments.map((segment) => ({
    from: String(segment.from || segment.origin || "").trim().toUpperCase(),
    to: String(segment.to || segment.destination || "").trim().toUpperCase(),
    date: segment.date || segment.departureDate,
  }));

  const tripType = input.tripType || "oneway";
  const request = {
    tripType,
    origin: String(input.origin || input.from || segments[0]?.from || "").trim().toUpperCase(),
    destination: String(
      input.destination
      || input.to
      || segments[0]?.to
      || "",
    ).trim().toUpperCase(),
    departureDate: input.departureDate || input.date || segments[0]?.date,
    returnDate: input.returnDate || null,
    segments,
    cabin: input.cabin || input.class || "Economy",
    passengers: {
      adults: Number(input.passengers?.adults ?? input.adults ?? input.person ?? 1),
      children: Number(input.passengers?.children ?? input.children ?? 0),
      infants: Number(input.passengers?.infants ?? input.infants ?? 0)
    },
    currency: String(input.currency || DEFAULT_CURRENCY).trim().toUpperCase(),
    providers: input.providers
  };

  if (!["oneway", "roundtrip", "multicity"].includes(request.tripType)) {
    errors.push("tripType must be oneway, roundtrip, or multicity");
  }
  if (request.tripType === "multicity") {
    if (request.segments.length < 2) errors.push("at least two segments are required for multicity searches");
    request.segments.forEach((segment, index) => {
      if (!AIRPORT_RE.test(segment.from) || !AIRPORT_RE.test(segment.to) || segment.from === segment.to || !isIsoDate(segment.date)) {
        errors.push(`segment ${index + 1} must include different IATA airports and a YYYY-MM-DD date`);
      }
    });
    if (!AIRPORT_RE.test(request.origin) && request.segments[0]?.from) {
      request.origin = request.segments[0].from;
    }
    if (!AIRPORT_RE.test(request.destination) && request.segments[0]?.to) {
      request.destination = request.segments[0].to;
    }
    if (!isIsoDate(request.departureDate) && isIsoDate(request.segments[0]?.date)) {
      request.departureDate = request.segments[0].date;
    }
  } else {
    if (!AIRPORT_RE.test(request.origin)) errors.push("origin must be a 3-letter IATA airport code");
    if (!AIRPORT_RE.test(request.destination)) errors.push("destination must be a 3-letter IATA airport code");
    if (request.origin && request.origin === request.destination) errors.push("origin and destination must be different");
    if (!isIsoDate(request.departureDate)) errors.push("departureDate must be YYYY-MM-DD");
  }
  if (request.tripType === "roundtrip" && !isIsoDate(request.returnDate)) {
    errors.push("returnDate is required for roundtrip searches");
  }
  if (request.passengers.adults < 1) errors.push("at least one adult passenger is required");
  if (request.passengers.children < 0 || request.passengers.infants < 0) {
    errors.push("children and infants cannot be negative");
  }

  if (errors.length) {
    const error = new Error("Validation failed");
    error.statusCode = 400;
    error.details = errors;
    throw error;
  }

  return request;
}

export function validateHotelSearchRequest(input) {
  const errors = [];
  const request = {
    location: String(input.location || input.city || input.destination || "").trim(),
    checkIn: input.checkIn || input.checkInDate,
    checkOut: input.checkOut || input.checkOutDate,
    rooms: Number(input.rooms || 1),
    guests: {
      adults: Number(input.guests?.adults ?? input.adults ?? 1),
      children: Number(input.guests?.children ?? input.children ?? 0)
    },
    currency: String(input.currency || DEFAULT_CURRENCY).trim().toUpperCase(),
    providers: input.providers || ["travelport"]
  };

  if (request.location.length < 2) errors.push("location is required");
  if (!isIsoDate(request.checkIn)) errors.push("checkIn must be YYYY-MM-DD");
  if (!isIsoDate(request.checkOut)) errors.push("checkOut must be YYYY-MM-DD");
  if (isIsoDate(request.checkIn) && isIsoDate(request.checkOut) && request.checkOut <= request.checkIn) {
    errors.push("checkOut must be after checkIn");
  }
  if (request.rooms < 1) errors.push("at least one room is required");
  if (request.guests.adults < 1) errors.push("at least one adult guest is required");
  if (request.guests.children < 0) errors.push("children cannot be negative");

  if (errors.length) {
    const error = new Error("Validation failed");
    error.statusCode = 400;
    error.details = errors;
    throw error;
  }

  return request;
}

export function validateTransferSearchRequest(input) {
  const errors = [];
  const request = {
    pickup: String(input.pickup || input.pickupLocation || "").trim(),
    dropoff: String(input.dropoff || input.dropoffLocation || "").trim(),
    pickupDate: input.pickupDate || input.date,
    pickupTime: input.pickupTime || input.time || "10:00",
    passengers: Number(input.passengers || input.person || 1),
    currency: String(input.currency || DEFAULT_CURRENCY).trim().toUpperCase(),
    providers: input.providers || ["travelport"]
  };

  if (request.pickup.length < 2) errors.push("pickup is required");
  if (request.dropoff.length < 2) errors.push("dropoff is required");
  if (request.pickup && request.dropoff && request.pickup.toLowerCase() === request.dropoff.toLowerCase()) {
    errors.push("pickup and dropoff must be different");
  }
  if (!isIsoDate(request.pickupDate)) errors.push("pickupDate must be YYYY-MM-DD");
  if (request.passengers < 1) errors.push("at least one passenger is required");

  if (errors.length) {
    const error = new Error("Validation failed");
    error.statusCode = 400;
    error.details = errors;
    throw error;
  }

  return request;
}

export function requireFields(input, fields) {
  const missing = fields.filter((field) => input[field] === undefined || input[field] === null || input[field] === "");
  if (missing.length) {
    const error = new Error("Missing required fields");
    error.statusCode = 400;
    error.details = missing;
    throw error;
  }
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
