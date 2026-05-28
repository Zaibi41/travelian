import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const secrets = new SecretsManagerClient({});
const SECRET_ID = process.env.ALHAIDER_SECRET_ID || "travelian/providers/alhaider";
const TOKEN_TTL_MS = Number(process.env.ALHAIDER_TOKEN_TTL_MS || 45 * 60 * 1000);

let cachedSecret;
let cachedToken;
let cachedTokenAt = 0;

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
  const parsed = JSON.parse(result.SecretString || "{}");
  cachedSecret = {
    baseUrl: String(parsed.baseUrl || parsed.base_url || "").replace(/\/$/, ""),
    email: String(parsed.email || parsed.username || ""),
    password: String(parsed.password || ""),
  };
  return cachedSecret;
}

function assertConfig(config) {
  const missing = [];
  if (!config.baseUrl) missing.push("baseUrl");
  if (!config.email) missing.push("email");
  if (!config.password) missing.push("password");
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
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(payload?.message || payload?.error || "Alhaider request failed");
  return payload;
}

function extractToken(payload) {
  if (!payload || typeof payload !== "object") return "";
  return payload.token || payload.access_token || payload.data?.token || payload.data?.access_token || payload.authorization?.token || "";
}

async function getToken() {
  if (cachedToken && Date.now() - cachedTokenAt < TOKEN_TTL_MS) return cachedToken;
  const config = await getConfig();
  assertConfig(config);
  const body = new FormData();
  body.append("email", config.email);
  body.append("password", config.password);
  const payload = await alhaiderFetch("/api/login", { method: "POST", body });
  const token = extractToken(payload);
  if (!token) throw new Error("Alhaider login did not return a token");
  cachedToken = token;
  cachedTokenAt = Date.now();
  return token;
}

async function authedAlhaiderFetch(path) {
  const token = await getToken();
  return alhaiderFetch(path, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function unwrapArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    for (const key of ["data", "groups", "available_groups", "result", "results"]) {
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

function normalizeGroup(input) {
  const record = input && typeof input === "object" ? input : {};
  const rawCategory = value(record, ["type_name", "type", "category", "group_type", "country", "destination", "sector"]);
  const categoryLabel = titleize(rawCategory);
  const airline = value(record, ["airline_name", "airline", "airlineName", "carrier_name", "carrier"]);
  return {
    ...record,
    id: String(value(record, ["id", "group_id", "groupId", "booking_id"]) || ""),
    categorySlug: slugify(categoryLabel),
    categoryLabel,
    airlineName: airline ? String(airline) : undefined,
    airlineLogo: value(record, ["airline_logo", "logo", "airlineLogo"]),
    sector: value(record, ["sector", "route", "routing"]),
    departureDate: value(record, ["dept_date", "departure_date", "departureDate"]),
    returnDate: value(record, ["return_date", "arrival_date", "returnDate"]),
    flightNumber: value(record, ["flight_no", "flight_number", "flightNumber"]),
    baggage: value(record, ["baggage", "bagage", "bags"]),
    seatsAvailable: value(record, ["seats", "available_seats", "seatsAvailable"]),
    fare: value(record, ["fare", "price", "amount", "selling_price"]),
    currency: value(record, ["currency"]) || "PKR",
    status: value(record, ["status", "availability"]),
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

    const detailMatch = path.match(/\/group-ticketing\/groups\/([^/]+)$/);
    if (detailMatch) {
      const groupId = decodeURIComponent(detailMatch[1]);
      const payload = await authedAlhaiderFetch(`/api/group/detail/${encodeURIComponent(groupId)}`);
      const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
      return json(200, { result: normalizeGroup(data), providerStatus: { alhaider: "success" } });
    }

    return json(404, { error: "Route not found" });
  } catch (error) {
    console.error("group-ticketing-proxy-error", error);
    return json(502, {
      error: "Group ticketing provider is unavailable",
      details: error instanceof Error ? error.message : "Unknown provider error",
    });
  }
}
