import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const secrets = new SecretsManagerClient({});
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({
  region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1",
}));

const ALHAIDER_SECRET_ID = process.env.ALHAIDER_SECRET_ID || "travelian/providers/alhaider";
const DHILLUANDSAHI_SECRET_ID = process.env.DHILLUANDSAHI_SECRET_ID || "travelian/providers/dhilluandsahi";
const SKYPASS_SECRET_ID = process.env.SKYPASS_SECRET_ID || "travelian/providers/skypass";
const SKYPASS_TOKEN_REFRESH_BUFFER_SECONDS = Number(process.env.SKYPASS_TOKEN_REFRESH_BUFFER_SECONDS || 300);
const DHILLU_AND_SAHI_SECTOR_ID = process.env.DHILLU_AND_SAHI_SECTOR_ID || "9";
const PROVIDER_TIMEOUT_MS = Number(process.env.PROVIDER_TIMEOUT_MS || 9000);

const DEFAULT_SUPPLIERS = [
  { slug: "collection-1", label: "Group Collection 1", provider: "alhaider", enabled: true },
  { slug: "collection-2", label: "Group Collection 2", provider: "dhilluandsahi", enabled: true },
  { slug: "collection-3", label: "Group Collection 3", provider: "skypass", enabled: true },
];

let activeSuppliers = DEFAULT_SUPPLIERS;
let supplierBySlug = new Map(activeSuppliers.map((entry) => [entry.slug, entry]));
let supplierByProvider = new Map(activeSuppliers.map((entry) => [entry.provider, entry]));
let suppliersLoadedAt = 0;
const SUPPLIERS_CACHE_MS = 60_000;

function rebuildSupplierMaps(suppliers) {
  activeSuppliers = suppliers;
  supplierBySlug = new Map(suppliers.map((entry) => [entry.slug, entry]));
  supplierByProvider = new Map(suppliers.map((entry) => [entry.provider, entry]));
}

async function loadSuppliersFromDatabase() {
  const tableName = process.env.CONTENT_TABLE;
  if (!tableName) return null;
  const result = await dynamo.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: { ":pk": "GROUP_TICKET_COLLECTION" },
  }));
  const items = (result.Items || [])
    .filter((item) => !item.deletedAt && item.enabled !== false)
    .sort((a, b) => (Number(a.sortOrder) || 999) - (Number(b.sortOrder) || 999));
  if (!items.length) return null;
  return items.map((item) => ({
    slug: String(item.slug || ""),
    label: String(item.publicLabel || item.label || "Group Collection"),
    provider: String(item.providerId || item.provider || "").toLowerCase(),
    enabled: item.enabled !== false,
  })).filter((item) => item.slug && item.provider);
}

async function ensureSuppliers() {
  if (Date.now() - suppliersLoadedAt < SUPPLIERS_CACHE_MS) return;
  try {
    const loaded = await loadSuppliersFromDatabase();
    if (loaded?.length) rebuildSupplierMaps(loaded);
  } catch (error) {
    console.error("group-ticketing-suppliers-load-error", error);
  }
  suppliersLoadedAt = Date.now();
}

const secretCache = new Map();
let cachedDhilluSession;
let cachedSkypassConfig;
let cachedSkypassToken;
let cachedSkypassTokenExpiresAt = 0;

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

function parseSecret(secretString) {
  try {
    return JSON.parse(secretString);
  } catch {
    const parsed = {};
    for (const key of ["baseUrl", "base_url", "token", "access_token", "apiKey", "api_key", "apiSecret", "api_secret", "key", "email", "password"]) {
      const quoted = secretString.match(new RegExp(`${key}\\s*:\\s*['"]([^'"]+)['"]`, "i"));
      if (quoted) {
        parsed[key] = quoted[1];
        continue;
      }
      const bare = secretString.match(new RegExp(`${key}\\s*:\\s*([^\\s,}]+)`, "i"));
      if (bare) parsed[key] = bare[1];
    }
    return parsed;
  }
}

async function getSecretJson(secretId) {
  if (secretCache.has(secretId)) return secretCache.get(secretId);
  const result = await secrets.send(new GetSecretValueCommand({ SecretId: secretId }));
  const parsed = parseSecret(result.SecretString || "{}");
  secretCache.set(secretId, parsed);
  return parsed;
}

function unwrapArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    for (const key of ["groups", "data", "available_groups", "result", "results", "tickets"]) {
      if (Array.isArray(payload[key])) return payload[key];
    }
    if (payload.tickets && typeof payload.tickets === "object" && Array.isArray(payload.tickets.data)) {
      return payload.tickets.data;
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

function withSupplier(group, supplier) {
  const originalId = String(group.id || "");
  return {
    ...group,
    id: `${supplier.provider}:${originalId}`,
    provider: supplier.provider,
    categorySlug: supplier.slug,
    categoryLabel: supplier.label,
  };
}

function toPublicGroupId(compositeId) {
  return Buffer.from(String(compositeId), "utf8").toString("base64url");
}

function fromPublicGroupId(publicId) {
  try {
    return Buffer.from(publicId, "base64url").toString("utf8");
  } catch {
    return decodeURIComponent(publicId);
  }
}

function sanitizeGroupForPublic(group) {
  return {
    id: toPublicGroupId(group.id),
    categorySlug: group.categorySlug,
    categoryLabel: group.categoryLabel,
    sector: group.sector,
    tripType: group.tripType,
    itinerary: Array.isArray(group.itinerary)
      ? group.itinerary.map((leg) => ({
          sequence: leg.sequence,
          flightDate: leg.flightDate,
          origin: leg.origin,
          destination: leg.destination,
          baggage: leg.baggage,
          departureTime: leg.departureTime,
          arrivalTime: leg.arrivalTime,
        }))
      : undefined,
    departureDate: group.departureDate,
    returnDate: group.returnDate,
    baggage: group.baggage,
    seatsAvailable: group.seatsAvailable,
    fare: group.fare,
    currency: group.currency,
    status: group.status,
    terms: group.terms ? "Available — confirm with Travelian before booking." : undefined,
    cancellationRules: group.cancellationRules ? "Subject to Travelian terms." : undefined,
  };
}

function sanitizeCategoryForPublic(category) {
  return {
    slug: category.slug,
    label: category.label,
    count: category.count,
  };
}

function normalizeAlhaiderGroup(input, supplier) {
  const record = input && typeof input === "object" ? input : {};
  const airlineRecord = record.airline && typeof record.airline === "object" ? record.airline : {};
  const itinerary = (Array.isArray(record.details) ? record.details : []).map(normalizeLeg);
  const firstDetail = itinerary[0] || {};
  const lastDetail = itinerary[itinerary.length - 1] || {};
  const airline = value(record, ["airline_name", "airlineName", "carrier_name", "carrier"]) || value(airlineRecord, ["airline_name", "name", "short_name"]);
  const sector = value(record, ["sector", "route", "routing"]) || routeFromLegs(itinerary);
  const roundTrip = isRoundTrip(itinerary, sector);
  const originalId = String(value(record, ["id", "group_id", "groupId", "booking_id"]) || "");
  if (!originalId) return null;

  return withSupplier({
    ...record,
    id: originalId,
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
  }, supplier);
}

function dateTime(date, time) {
  if (!date) return null;
  return `${date}T${String(time || "00:00").slice(0, 8)}`;
}

function firstCode(valueInput) {
  const parts = String(valueInput || "").toUpperCase().split("-").map((part) => part.trim());
  return parts.find((part) => /^[A-Z]{3}$/.test(part)) || null;
}

function lastCode(valueInput) {
  const parts = String(valueInput || "").toUpperCase().split("-").map((part) => part.trim()).filter((part) => /^[A-Z]{3}$/.test(part));
  return parts[parts.length - 1] || null;
}

function codeFromAirportName(valueInput) {
  const text = String(valueInput || "").toLowerCase();
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

function normalizeDhilluSegments(ticket) {
  const subparts = Array.isArray(ticket?.subpart) ? ticket.subpart : [];
  if (subparts.length) {
    return subparts.map((segment) => ({
      flightNumber: String(segment.departure_flight_number || "").trim(),
      origin: firstCode(segment.departure_sector_name) || codeFromAirportName(segment.departure_airport_name),
      destination: lastCode(segment.departure_sector_name) || codeFromAirportName(segment.arivval_airport_name || segment.arrival_airport_name),
      flightDate: segment.departure_date || null,
      departureTime: segment.departure_time,
      arrivalTime: segment.arivval_time || segment.arrival_time,
      baggage: segment.departure_baggage || ticket.baggage || null,
    })).filter((segment) => segment.origin && segment.destination);
  }

  const [origin, destination] = String(ticket?.sector || "").toUpperCase().split("-").map((part) => part.trim());
  return [{
    flightNumber: String(ticket?.flight_number || ticket?.flight_no || "").trim(),
    origin,
    destination,
    flightDate: ticket?.date || ticket?.departure_date || null,
    departureTime: ticket?.departure_time,
    arrivalTime: ticket?.arrival_time,
    baggage: ticket?.baggage || null,
  }].filter((segment) => segment.origin && segment.destination);
}

function normalizeDhilluTicket({ group, ticket }, supplier) {
  const segments = normalizeDhilluSegments(ticket);
  const itinerary = segments.map((segment, index) => ({
    id: String(index + 1),
    sequence: index + 1,
    flightNumber: segment.flightNumber || undefined,
    flightDate: segment.flightDate || undefined,
    origin: segment.origin,
    destination: segment.destination,
    baggage: segment.baggage || undefined,
    departureTime: segment.departureTime,
    arrivalTime: segment.arrivalTime,
  }));
  const sector = routeFromLegs(itinerary) || ticket.sector;
  const roundTrip = isRoundTrip(itinerary, sector);
  const originalId = String(ticket.pnr || ticket.id || "");
  if (!originalId) return null;

  return withSupplier({
    id: originalId,
    airlineName: group?.airline?.name || ticket.air_line || supplier.label,
    airlineLogo: group?.airline?.logo || ticket.air_line_logo,
    sector,
    tripType: roundTrip ? "round-trip" : "one-way",
    itinerary,
    departureDate: itinerary[0]?.flightDate,
    returnDate: roundTrip ? itinerary[itinerary.length - 1]?.flightDate : undefined,
    flightNumber: itinerary.map((leg) => leg.flightNumber).filter(Boolean).join(" / ") || ticket.pnr,
    baggage: ticket.baggage,
    seatsAvailable: ticket.remaining,
    fare: ticket.price || ticket.amount,
    currency: "PKR",
    status: Number(ticket.remaining || 0) > 0 ? "available" : "sold out",
    terms: ticket.terms,
    supplierRemarks: ticket.remarks,
  }, supplier);
}

function skypassSectors(record) {
  if (Array.isArray(record?.sectors)) return record.sectors;
  if (record?.sectors && typeof record.sectors === "object") return [record.sectors];
  return [];
}

function normalizeSkypassTicket(record, supplier) {
  const sectors = skypassSectors(record);
  const itinerary = sectors.map((sector, index) => ({
    id: String(index + 1),
    sequence: index + 1,
    flightNumber: `${sector.flight_code || ""}${sector.flight_num ? `-${sector.flight_num}` : ""}`.replace(/^-|-$/g, "") || undefined,
    flightDate: sector.departure_date,
    origin: sector.departure,
    destination: sector.destination,
    baggage: sector.baggage,
    departureTime: sector.departure_time,
    arrivalTime: sector.arrival_time,
  }));
  const sector = routeFromLegs(itinerary) || record.sector;
  const roundTrip = isRoundTrip(itinerary, sector);
  const originalId = String(record.id || "");
  if (!originalId) return null;

  return withSupplier({
    id: originalId,
    airlineName: record.name || record.airline_name || supplier.label,
    airlineLogo: record.logo || record.airline_logo,
    sector,
    tripType: roundTrip ? "round-trip" : "one-way",
    itinerary,
    departureDate: itinerary[0]?.flightDate || record.min_departure_date,
    returnDate: roundTrip ? itinerary[itinerary.length - 1]?.flightDate : undefined,
    flightNumber: itinerary.map((leg) => leg.flightNumber).filter(Boolean).join(" / ") || undefined,
    baggage: [...new Set(sectors.map((sector) => sector.baggage).filter(Boolean))].join(", ") || undefined,
    seatsAvailable: record.available_seats ?? record.seats ?? record.remaining_seats,
    fare: record.adult_price || record.price,
    currency: "PKR",
    status: Number(record.adult_price || 0) > 0 ? "available" : "sold out",
    terms: record.terms,
    supplierRemarks: record.remarks,
  }, supplier);
}

function supplierCategories(groups) {
  const counts = new Map(activeSuppliers.map((entry) => [entry.slug, 0]));
  for (const group of groups) {
    if (group.categorySlug && counts.has(group.categorySlug)) {
      counts.set(group.categorySlug, counts.get(group.categorySlug) + 1);
    }
  }
  return activeSuppliers.map((entry) => ({
    slug: entry.slug,
    label: entry.label,
    count: counts.get(entry.slug) || 0,
  }));
}

function parseCompositeId(compositeId) {
  const decoded = decodeURIComponent(compositeId);
  const separator = decoded.indexOf(":");
  if (separator === -1) return { provider: "alhaider", id: decoded };
  return { provider: decoded.slice(0, separator), id: decoded.slice(separator + 1) };
}

async function alhaiderConfig() {
  const secret = await getSecretJson(ALHAIDER_SECRET_ID);
  return {
    baseUrl: String(secret.baseUrl || secret.base_url || "").replace(/\/$/, ""),
    token: String(secret.token || secret.access_token || "").replace(/^Bearer\s+/i, ""),
  };
}

async function alhaiderFetch(path, init = {}) {
  const config = await alhaiderConfig();
  if (!config.baseUrl || !config.token) throw new Error("Alhaider provider secret is missing baseUrl or token");
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
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

async function fetchAlhaiderGroups() {
  const config = await alhaiderConfig();
  const payload = await alhaiderFetch("/api/available/groups", {
    headers: { Authorization: `Bearer ${config.token}` },
  });
  const supplier = supplierByProvider.get("alhaider");
  return unwrapArray(payload).map((group) => normalizeAlhaiderGroup(group, supplier)).filter(Boolean);
}

async function fetchAlhaiderDetail(groupId) {
  const config = await alhaiderConfig();
  const payload = await alhaiderFetch(`/api/group/detail/${encodeURIComponent(groupId)}`, {
    headers: { Authorization: `Bearer ${config.token}` },
  });
  const data = payload?.group && typeof payload.group === "object"
    ? payload.group
    : payload?.data && typeof payload.data === "object"
      ? payload.data
      : payload;
  return normalizeAlhaiderGroup(data, supplierByProvider.get("alhaider"));
}

async function dhilluSession() {
  if (cachedDhilluSession?.token) return cachedDhilluSession;
  const secret = await getSecretJson(DHILLUANDSAHI_SECRET_ID);
  const baseUrl = String(secret.baseUrl || secret.base_url || "https://api.dhilluandsahi.com").replace(/\/$/, "");
  const configuredToken = String(secret.token || secret.access_token || "").replace(/^Bearer\s+/i, "");
  if (configuredToken) {
    cachedDhilluSession = { baseUrl, token: configuredToken };
    return cachedDhilluSession;
  }

  const email = secret.email || secret.username;
  const password = secret.password;
  if (!email || !password) throw new Error("Dhillu & Sahi secret must include token or email/password");

  const response = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.success?.token) throw new Error(payload?.message || "Dhillu & Sahi login failed");
  cachedDhilluSession = {
    baseUrl,
    token: String(payload.success.token).replace(/^Bearer\s+/i, ""),
  };
  return cachedDhilluSession;
}

async function dhilluPost(path, body, token) {
  const session = await dhilluSession();
  const response = await fetch(`${session.baseUrl}${path}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${token || session.token}`,
    },
    body: JSON.stringify(body || {}),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.error || `Dhillu & Sahi ${path} failed`);
  return payload;
}

async function fetchDhilluandsahiGroups() {
  const session = await dhilluSession();
  const payload = await dhilluPost("/api/pnr-respect-to-mysector-user", { my_sector_id: String(DHILLU_AND_SAHI_SECTOR_ID) }, session.token);
  const supplier = supplierByProvider.get("dhilluandsahi");
  return unwrapArray(payload).flatMap((group) => {
    const tickets = Array.isArray(group?.tickets) ? group.tickets : [];
    return tickets.map((ticket) => normalizeDhilluTicket({ group, ticket }, supplier)).filter(Boolean);
  });
}

async function fetchDhilluandsahiDetail(groupId) {
  const groups = await fetchDhilluandsahiGroups();
  const match = groups.find((group) => group.id === `dhilluandsahi:${groupId}` || group.id.endsWith(`:${groupId}`));
  if (!match) throw new Error("Dhillu & Sahi group ticket was not found");
  return match;
}

async function skypassProviderConfig() {
  if (cachedSkypassConfig) return cachedSkypassConfig;
  const secret = await getSecretJson(SKYPASS_SECRET_ID);
  cachedSkypassConfig = {
    baseUrl: String(secret.baseUrl || secret.base_url || secret.productionBaseUrl || secret.production_base_url || "https://api.skypass.pk").replace(/\/$/, ""),
    apiKey: String(secret.apiKey || secret.api_key || ""),
    apiSecret: String(secret.apiSecret || secret.api_secret || ""),
    token: String(secret.token || secret.access_token || "").replace(/^Bearer\s+/i, ""),
    tokenExpiresAt: Number(secret.tokenExpiresAt || secret.token_expires_at || secret.expiresAt || secret.expires_at || 0),
  };
  return cachedSkypassConfig;
}

function skypassTokenUsable(token, expiresAt) {
  if (!token) return false;
  if (!expiresAt) return true;
  const normalized = expiresAt > 10_000_000_000 ? Math.floor(expiresAt / 1000) : expiresAt;
  return normalized - SKYPASS_TOKEN_REFRESH_BUFFER_SECONDS > Math.floor(Date.now() / 1000);
}

function skypassExtractToken(payload) {
  return payload?.token || payload?.access_token || payload?.data?.token || payload?.data?.access_token || "";
}

async function skypassProviderFetch(path, init = {}, { authenticated = true } = {}) {
  const config = await skypassProviderConfig();
  if (!config.baseUrl) throw new Error("Skypass provider secret is missing baseUrl");
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...(init.headers || {}) },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error("Skypass returned a non-JSON response");
    }
  }
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || (authenticated ? "Skypass request failed" : "Skypass auth failed"));
  }
  return payload;
}

async function skypassProviderToken({ forceRefresh = false } = {}) {
  const config = await skypassProviderConfig();
  if (!forceRefresh && skypassTokenUsable(cachedSkypassToken, cachedSkypassTokenExpiresAt)) return cachedSkypassToken;
  if (!forceRefresh && skypassTokenUsable(config.token, config.tokenExpiresAt)) {
    cachedSkypassToken = config.token;
    cachedSkypassTokenExpiresAt = config.tokenExpiresAt;
    return cachedSkypassToken;
  }
  if (!config.apiKey || !config.apiSecret) {
    if (config.token) return config.token;
    throw new Error("Skypass provider secret is missing apiKey/apiSecret or token");
  }
  const body = new FormData();
  body.append("api_key", config.apiKey);
  body.append("api_secret", config.apiSecret);
  const payload = await skypassProviderFetch("/auth", { method: "POST", body }, { authenticated: false });
  const token = skypassExtractToken(payload);
  if (!token) throw new Error("Skypass login did not return a bearer token");
  cachedSkypassToken = token;
  cachedSkypassTokenExpiresAt = Number(payload?.expires_at || payload?.expiresAt || payload?.data?.expires_at || 0);
  return token;
}

async function skypassAuthedFetch(path) {
  const token = await skypassProviderToken();
  try {
    return await skypassProviderFetch(path, { headers: { Authorization: `Bearer ${token}` } });
  } catch (error) {
    if (!(error instanceof Error) || !/unauthorized|401|token/i.test(error.message)) throw error;
    cachedSkypassToken = "";
    cachedSkypassTokenExpiresAt = 0;
    const freshToken = await skypassProviderToken({ forceRefresh: true });
    return skypassProviderFetch(path, { headers: { Authorization: `Bearer ${freshToken}` } });
  }
}

async function fetchSkypassGroups() {
  const supplier = supplierByProvider.get("skypass");
  const firstPage = await skypassAuthedFetch("/tickets?limit=100&page=1");
  const lastPage = Math.min(Number(firstPage?.tickets?.last_page || 1), 5);
  const pages = lastPage > 1
    ? await Promise.all(Array.from({ length: lastPage - 1 }, (_, index) => skypassAuthedFetch(`/tickets?limit=100&page=${index + 2}`)))
    : [];
  return [firstPage, ...pages]
    .flatMap((payload) => (Array.isArray(payload?.tickets?.data) ? payload.tickets.data : []))
    .map((record) => normalizeSkypassTicket(record, supplier))
    .filter(Boolean);
}

async function fetchSkypassDetail(groupId) {
  const payload = await skypassAuthedFetch(`/ticket/${encodeURIComponent(groupId)}`);
  const record = payload?.ticket && typeof payload.ticket === "object" ? payload.ticket : payload;
  const group = normalizeSkypassTicket(record, supplierByProvider.get("skypass"));
  if (!group) throw new Error("Skypass ticket was not found");
  return group;
}

async function fetchAllGroups() {
  await ensureSuppliers();
  const providerFetchers = {
    alhaider: fetchAlhaiderGroups,
    dhilluandsahi: fetchDhilluandsahiGroups,
    skypass: fetchSkypassGroups,
  };
  const providers = [...new Set(
    activeSuppliers
      .filter((entry) => entry.enabled !== false)
      .map((entry) => entry.provider)
      .filter((provider) => providerFetchers[provider]),
  )];
  const providerStatus = Object.fromEntries(providers.map((provider) => [provider, "error"]));
  const settled = await Promise.allSettled(providers.map((provider) => providerFetchers[provider]()));

  const groups = [];
  settled.forEach((result, index) => {
    const provider = providers[index];
    if (result.status === "fulfilled") {
      providerStatus[provider] = "success";
      groups.push(...result.value);
    } else {
      console.error(`group-ticketing-provider-error:${provider}`, result.reason);
      providerStatus[provider] = result.reason instanceof Error ? result.reason.message : "error";
    }
  });

  return { groups, providerStatus };
}

async function fetchGroupDetail(compositeId) {
  const { provider, id } = parseCompositeId(compositeId);
  if (provider === "alhaider") return fetchAlhaiderDetail(id);
  if (provider === "dhilluandsahi") return fetchDhilluandsahiDetail(id);
  if (provider === "skypass") return fetchSkypassDetail(id);
  throw new Error(`Unknown group ticketing provider: ${provider}`);
}

export async function handler(event) {
  if (event.requestContext?.http?.method === "OPTIONS") return json(204, {});
  await ensureSuppliers();
  const path = event.rawPath || "/";

  try {
    if (path.endsWith("/health")) {
      return json(200, { ok: true, collections: activeSuppliers.length });
    }

    if (path.endsWith("/group-ticketing/categories")) {
      const { groups } = await fetchAllGroups();
      return json(200, { results: supplierCategories(groups).map(sanitizeCategoryForPublic) });
    }

    if (path.endsWith("/group-ticketing/groups")) {
      const category = event.queryStringParameters?.category || "all";
      const { groups } = await fetchAllGroups();
      const filtered = category === "all"
        ? groups
        : groups.filter((group) => group.categorySlug === category);
      return json(200, { results: filtered.map(sanitizeGroupForPublic) });
    }

    if (path.endsWith("/api/available/groups")) {
      const { groups } = await fetchAllGroups();
      const sanitized = groups.map(sanitizeGroupForPublic);
      return json(200, { groups: sanitized, results: sanitized });
    }

    const detailMatch = path.match(/\/group-ticketing\/groups\/([^/]+)$/);
    const legacyDetailMatch = path.match(/\/api\/group\/detail\/([^/]+)$/);
    if (detailMatch || legacyDetailMatch) {
      const groupId = fromPublicGroupId(decodeURIComponent((detailMatch || legacyDetailMatch)[1]));
      const group = await fetchGroupDetail(groupId);
      return json(200, { group: sanitizeGroupForPublic(group), result: sanitizeGroupForPublic(group) });
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
