import { SecretsManagerClient, GetSecretValueCommand, PutSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const secrets = new SecretsManagerClient({});
const SECRET_ID = process.env.ALHAIDER_SECRET_ID || "travelian/providers/alhaider";
const TOKEN_TTL_MS = Number(process.env.ALHAIDER_TOKEN_TTL_MS || 45 * 60 * 1000);
const TOKEN_REFRESH_BUFFER_SECONDS = Number(process.env.ALHAIDER_TOKEN_REFRESH_BUFFER_SECONDS || 300);

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
  const parsed = parseSecret(result.SecretString || "{}");
  cachedSecret = {
    baseUrl: String(parsed.baseUrl || parsed.base_url || "").replace(/\/$/, ""),
    email: String(parsed.email || parsed.username || ""),
    password: String(parsed.password || ""),
    token: String(parsed.token || parsed.access_token || ""),
    tokenCreatedAt: Number(parsed.tokenCreatedAt || parsed.token_created_at || 0),
    tokenExpiresAt: Number(parsed.expires_at || parsed.expiresAt || parsed.tokenExpiresAt || parsed.token_expires_at || 0),
  };
  return cachedSecret;
}

function parseSecret(secretString) {
  try {
    return JSON.parse(secretString);
  } catch {
    const parsed = {};
    for (const key of ["baseUrl", "base_url", "email", "username", "password", "token", "access_token", "expires_at", "expiresAt", "tokenExpiresAt", "token_expires_at"]) {
      const match = secretString.match(new RegExp(`${key}\\\\s*:\\\\s*['"]([^'"]+)['"]`, "i"));
      if (match) parsed[key] = match[1];
    }
    return parsed;
  }
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

function extractToken(payload) {
  if (!payload || typeof payload !== "object") return "";
  return payload.token || payload.access_token || payload.data?.token || payload.data?.access_token || payload.authorization?.token || "";
}

function extractTokenExpiresAt(payload) {
  const value = payload?.expires_at || payload?.expiresAt || payload?.data?.expires_at || payload?.data?.expiresAt || payload?.authorization?.expires_at;
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;
  return tokenExpiry(extractToken(payload));
}

function tokenExpiry(token) {
  try {
    const [, payload] = String(token || "").split(".");
    if (!payload) return 0;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const expiresAt = Number(parsed.exp);
    return Number.isFinite(expiresAt) ? expiresAt : 0;
  } catch {
    return 0;
  }
}

function isProviderTokenUsable(token, expiresAt) {
  if (!token) return false;
  const effectiveExpiry = Number(expiresAt) || tokenExpiry(token);
  // Some supplier tokens do not include expiry metadata. Reuse them until the
  // supplier explicitly rejects them instead of consuming another login slot.
  if (!effectiveExpiry) return true;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return effectiveExpiry - TOKEN_REFRESH_BUFFER_SECONDS > nowSeconds;
}

async function getToken({ forceRefresh = false } = {}) {
  if (!forceRefresh && cachedToken && Date.now() - cachedTokenAt < TOKEN_TTL_MS) return cachedToken;
  const config = await getConfig();
  assertConfig(config);
  if (!forceRefresh && isProviderTokenUsable(config.token, config.tokenExpiresAt)) {
    cachedToken = config.token;
    cachedTokenAt = config.tokenCreatedAt || Date.now();
    return cachedToken;
  }
  const body = new FormData();
  body.append("email", config.email);
  body.append("password", config.password);
  const payload = await alhaiderFetch("/api/login", { method: "POST", body });
  const token = extractToken(payload);
  if (!token) throw new Error("Alhaider login did not return a token");
  const tokenExpiresAt = extractTokenExpiresAt(payload);
  cachedToken = token;
  cachedTokenAt = Date.now();
  await persistToken(config, token, cachedTokenAt, tokenExpiresAt);
  return token;
}

async function persistToken(config, token, tokenCreatedAt, tokenExpiresAt) {
  cachedSecret = { ...config, token, tokenCreatedAt, tokenExpiresAt };
  if (tokenExpiresAt) cachedSecret.expires_at = tokenExpiresAt;
  await secrets.send(new PutSecretValueCommand({
    SecretId: SECRET_ID,
    SecretString: JSON.stringify(cachedSecret),
  }));
}

async function authedAlhaiderFetch(path) {
  const token = await getToken();
  try {
    return await alhaiderFetch(path, { headers: { Authorization: `Bearer ${token}` } });
  } catch (error) {
    if (!(error instanceof Error) || !/unauthenticated|unauthorized|token/i.test(error.message)) throw error;
    cachedToken = "";
    cachedTokenAt = 0;
    // Keep the last supplier token in Secrets Manager until replacement login
    // succeeds. This preserves a recoverable token when the supplier account
    // has reached its concurrent-session limit.
    const freshToken = await getToken({ forceRefresh: true });
    return alhaiderFetch(path, { headers: { Authorization: `Bearer ${freshToken}` } });
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

function normalizeGroup(input) {
  const record = input && typeof input === "object" ? input : {};
  const airlineRecord = record.airline && typeof record.airline === "object" ? record.airline : {};
  const firstDetail = Array.isArray(record.details) ? record.details[0] || {} : {};
  const rawCategory = value(record, ["type_name", "type", "category", "group_type", "country", "destination", "sector"]);
  const categoryLabel = titleize(rawCategory);
  const airline = value(record, ["airline_name", "airlineName", "carrier_name", "carrier"]) || value(airlineRecord, ["airline_name", "name", "short_name"]);
  return {
    ...record,
    id: String(value(record, ["id", "group_id", "groupId", "booking_id"]) || ""),
    categorySlug: slugify(categoryLabel),
    categoryLabel,
    airlineName: airline ? String(airline) : undefined,
    airlineCode: value(airlineRecord, ["short_name", "iata", "code"]),
    airlineLogo: value(record, ["airline_logo", "logo", "airlineLogo"]) || value(airlineRecord, ["logo_url", "logo", "logo_path"]),
    sector: value(record, ["sector", "route", "routing"]),
    departureDate: value(record, ["dept_date", "departure_date", "departureDate", "effective_dept_date"]),
    returnDate: value(record, ["return_date", "arrival_date", "returnDate", "arv_date"]),
    flightNumber: value(record, ["flight_no", "flight_number", "flightNumber"]) || value(firstDetail, ["flight_no", "flight_number"]),
    baggage: value(record, ["baggage", "bagage", "bags"]) || value(firstDetail, ["baggage", "bags"]),
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
