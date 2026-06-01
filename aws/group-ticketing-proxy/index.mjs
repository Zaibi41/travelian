import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const secrets = new SecretsManagerClient({});
const SECRET_ID = process.env.ALHAIDER_SECRET_ID || "travelian/providers/alhaider";

let cachedSecret;

const corsHeaders = {
  "access-control-allow-origin": process.env.CORS_ORIGIN || "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type,authorization,x-request-id,x-travelian-api-key",
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { ...corsHeaders, "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

async function getConfig() {
  if (cachedSecret) return cachedSecret;
  const result = await secrets.send(new GetSecretValueCommand({ SecretId: SECRET_ID }));
  const parsed = parseSecret(result.SecretString || "{}");
  cachedSecret = {
    baseUrl: String(parsed.baseUrl || parsed.base_url || "").replace(/\/$/, ""),
    token: String(parsed.token || parsed.access_token || ""),
  };
  return cachedSecret;
}

function parseSecret(secretString) {
  try {
    return JSON.parse(secretString);
  } catch {
    const parsed = {};
    for (const key of ["baseUrl", "base_url", "token", "access_token"]) {
      const match = secretString.match(new RegExp(`${key}\\\\s*:\\\\s*['"]([^'"]+)['"]`, "i"));
      if (match) parsed[key] = match[1];
    }
    return parsed;
  }
}

function assertConfig(config) {
  const missing = [];
  if (!config.baseUrl) missing.push("baseUrl");
  if (!config.token) missing.push("token");
  if (missing.length) throw new Error(`Alhaider provider secret is missing: ${missing.join(", ")}`);
}

async function alhaiderFetch(path, init = {}) {
  const config = await getConfig();
  assertConfig(config);
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error("Alhaider returned a non-JSON response");
    }
  }
  if (!response.ok) throw new Error(payload?.message || payload?.error || "Alhaider request failed");
  return payload;
}

async function authedAlhaiderFetch(path) {
  const config = await getConfig();
  assertConfig(config);
  try {
    return await alhaiderFetch(path, { headers: { Authorization: `Bearer ${config.token}` } });
  } catch (error) {
    if (!(error instanceof Error) || !/unauthenticated|unauthorized|token/i.test(error.message)) throw error;
    throw new Error("Stored Alhaider token was rejected by the provider. Revoke an old supplier session and replace the token in Secrets Manager.");
  }
}

function unwrapArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    for (const key of ["groups", "data", "available_groups", "result", "results"]) {
      if (Array.isArray(payload[key])) return payload[key];
    }
  }
  return [];
}

function value(record, keys) {
  for (const key of keys) {
    const next = record?.[key];
    if (next !== undefined && next !== null && next !== "") return next;
  }
  return undefined;
}

function slugify(input) {
  return String(input || "available-group")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleize(input) {
  return String(input || "Available Group")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeLeg(input) {
  const record = input && typeof input === "object" ? input : {};
  return {
    id: String(value(record, ["id"]) || ""),
    sequence: Number(value(record, ["sr", "sequence", "segment"]) || 0),
    flightNumber: value(record, ["flight_no", "flight_number", "flightNumber"]),
    flightDate: value(record, ["flight_date", "date", "departure_date"]),
    origin: value(record, ["origin", "from", "departure"]),
    destination: value(record, ["destination", "to", "arrival"]),
    baggage: value(record, ["baggage", "bags"]),
    departureTime: value(record, ["dept_time", "departure_time", "departureTime"]),
    arrivalTime: value(record, ["arv_time", "arrival_time", "arrivalTime"]),
  };
}

function routeFromLegs(legs) {
  if (!legs.length) return undefined;
  return [legs[0].origin, ...legs.map((leg) => leg.destination)].filter(Boolean).join("-");
}

function isRoundTrip(legs, sector) {
  if (legs.length < 2) return false;
  const firstOrigin = String(legs[0].origin || "").toUpperCase();
  const finalDestination = String(legs[legs.length - 1].destination || "").toUpperCase();
  if (firstOrigin && finalDestination && firstOrigin === finalDestination) return true;
  const routeParts = String(sector || "").toUpperCase().split("-").filter(Boolean);
  return routeParts.length > 2 && routeParts[0] === routeParts[routeParts.length - 1];
}

function normalizeGroup(input) {
  const record = input && typeof input === "object" ? input : {};
  const airlineRecord = record.airline && typeof record.airline === "object" ? record.airline : {};
  const itinerary = (Array.isArray(record.details) ? record.details : []).map(normalizeLeg);
  const firstDetail = itinerary[0] || {};
  const lastDetail = itinerary[itinerary.length - 1] || {};
  const rawCategory = value(record, ["type_name", "type", "category", "group_type", "country", "destination", "sector"]);
  const categoryLabel = titleize(rawCategory);
  const airline = value(record, ["airline_name", "airlineName", "carrier_name", "carrier"]) || value(airlineRecord, ["airline_name", "name", "short_name"]);
  const sector = value(record, ["sector", "route", "routing"]) || routeFromLegs(itinerary);
  const roundTrip = isRoundTrip(itinerary, sector);
  return {
    ...record,
    id: String(value(record, ["id", "group_id", "groupId", "booking_id"]) || ""),
    categorySlug: slugify(categoryLabel),
    categoryLabel,
    airlineName: airline ? String(airline) : undefined,
    airlineCode: value(airlineRecord, ["short_name", "iata", "code"]),
    airlineLogo: value(record, ["airline_logo", "logo", "airlineLogo"]) || value(airlineRecord, ["logo_url", "logo", "logo_path"]),
    sector,
    tripType: roundTrip ? "round-trip" : "one-way",
    itinerary,
    departureDate: value(record, ["dept_date", "departure_date", "departureDate", "effective_dept_date"]) || firstDetail.flightDate,
    returnDate: roundTrip ? value(record, ["return_date", "returnDate"]) || lastDetail.flightDate : undefined,
    flightNumber: value(record, ["flight_no", "flight_number", "flightNumber"]) || firstDetail.flightNumber,
    baggage: value(record, ["baggage", "bagage", "bags"]) || firstDetail.baggage,
    seatsAvailable: value(record, ["seats", "available_seats", "available_no_of_pax", "seatsAvailable"]),
    fare: value(record, ["fare", "price", "amount", "selling_price"]),
    currency: value(record, ["currency"]) || "PKR",
    status: value(record, ["status", "availability"]) || (Number(value(record, ["available_no_of_pax"]) || 0) > 0 ? "available" : "sold out"),
    terms: value(record, ["terms", "terms_conditions", "termsAndConditions"]),
    cancellationRules: value(record, ["cancellation", "refund_policy", "cancellationRules"]),
    supplierRemarks: value(record, ["remarks", "supplier_remarks", "supplierRemarks"]),
  };
}

function categoriesFrom(groups) {
  const bySlug = new Map();
  for (const group of groups) {
    const slug = group.categorySlug || slugify(group.categoryLabel);
    const existing = bySlug.get(slug);
    if (existing) {
      existing.count += 1;
    } else {
      bySlug.set(slug, { slug, label: group.categoryLabel || titleize(slug), count: 1, image: group.categoryImage });
    }
  }
  return Array.from(bySlug.values()).sort((a, b) => a.label.localeCompare(b.label));
}

async function fetchGroups() {
  const payload = await authedAlhaiderFetch("/api/available/groups?type=null&airline_id=null&sector=&dept_date=null");
  return unwrapArray(payload).map(normalizeGroup).filter((group) => group.id);
}

export async function handler(event) {
  if (event.requestContext?.http?.method === "OPTIONS") return json(204, {});
  const path = event.rawPath || "/";

  try {
    if (path.endsWith("/health")) {
      return json(200, { ok: true, provider: "alhaider" });
    }

    if (path.endsWith("/group-ticketing/categories")) {
      const groups = await fetchGroups();
      return json(200, { results: categoriesFrom(groups), providerStatus: { alhaider: "success" } });
    }

    if (path.endsWith("/group-ticketing/groups")) {
      const category = event.queryStringParameters?.category || "all";
      const groups = await fetchGroups();
      const filtered = category === "all" ? groups : groups.filter((group) => group.categorySlug === category);
      return json(200, { results: filtered, providerStatus: { alhaider: "success" } });
    }

    if (path.endsWith("/api/available/groups")) {
      const groups = await fetchGroups();
      return json(200, { groups, results: groups, providerStatus: { alhaider: "success" } });
    }

    const detailMatch = path.match(/\/group-ticketing\/groups\/([^/]+)$/);
    const legacyDetailMatch = path.match(/\/api\/group\/detail\/([^/]+)$/);
    if (detailMatch || legacyDetailMatch) {
      const groupId = decodeURIComponent((detailMatch || legacyDetailMatch)[1]);
      const payload = await authedAlhaiderFetch(`/api/group/detail/${encodeURIComponent(groupId)}`);
      const data = payload?.group && typeof payload.group === "object" ? payload.group : payload?.data && typeof payload.data === "object" ? payload.data : payload;
      const group = normalizeGroup(data);
      return json(200, { group, result: group, providerStatus: { alhaider: "success" } });
    }

    return json(404, { error: "Route not found" });
  } catch (error) {
    console.error("group-ticketing-proxy-error", error);
    return json(502, {
      error: "Group ticketing provider is unavailable",
      details: error instanceof Error ? error.message : "Provider connection failed",
    });
  }
}
