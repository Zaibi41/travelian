import { timingSafeEqual } from "node:crypto";
import {
  GetSecretValueCommand,
  PutSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

const secrets = new SecretsManagerClient({});
const PROVIDER_SECRET_ID = process.env.SKYPASS_SECRET_ID || "travelian/providers/skypass";
const CLIENT_SECRET_ID = process.env.TRAVELIAN_API_KEY_SECRET_ID || "travelian/api/clients";
const TOKEN_REFRESH_BUFFER_SECONDS = Number(process.env.SKYPASS_TOKEN_REFRESH_BUFFER_SECONDS || 300);

const publicRoutes = new Set(["GET /skypass/health"]);
const routes = new Map([
  ["GET /skypass/health", { handler: health }],
  ["POST /skypass/login", { handler: login }],
  ["GET /skypass/filters", { providerPath: "/airlines-sectors" }],
  ["GET /skypass/tickets", { providerPath: "/tickets", query: ["airline_id", "sector", "top_filters", "limit", "page"] }],
  ["GET /skypass/tickets/{ticketId}", { providerPath: ({ ticketId }) => `/ticket/${encodeURIComponent(ticketId)}` }],
  ["POST /skypass/seats/hold", { providerPath: "/hold-available-seats", fields: ["ticket_id", "quantity", "open_seats_slot"] }],
  ["POST /skypass/seats/release", { providerPath: "/release-seats", fields: ["ticket_id", "open_seats_slot"] }],
  ["POST /skypass/bookings", { providerPath: "/submit-booking", bodyMode: "flatten", normalizePassengers: true }],
  ["GET /skypass/bookings", {
    providerPath: "/bookings",
    query: ["start_date", "end_date", "booking_status", "limit", "page", "filters[airline_pnr]", "filters[booking_id]"],
  }],
  ["GET /skypass/bookings/{bookingId}", { providerPath: ({ bookingId }) => `/booking/${encodeURIComponent(bookingId)}` }],
  ["POST /skypass/bookings/{bookingId}/cancel", { providerPath: "/cancel-booking", fields: ["id"], pathFields: { id: "bookingId" } }],
  ["POST /skypass/bookings/{bookingId}/update", {
    providerPath: ({ bookingId }) => `/update-booking/${encodeURIComponent(bookingId)}`,
    bodyMode: "flatten",
    normalizePassengers: true,
  }],
  ["GET /skypass/ledger", { providerPath: "/ledger", query: ["start_date", "end_date"] }],
  ["POST /skypass/tickets/status", { providerPath: "/get-tickets-status", fields: ["tickets"] }],
]);

const corsHeaders = {
  "access-control-allow-origin": process.env.CORS_ORIGIN || "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type,authorization,x-request-id,x-travelian-api-key",
};

let cachedProviderConfig;
let cachedClientKey;
let cachedToken;
let cachedTokenExpiresAt = 0;

export async function handler(event) {
  if (requestMethod(event) === "OPTIONS") return json(204, {});

  const path = normalizedPath(event);
  const routeKey = routePattern(requestMethod(event), path);
  const route = routes.get(routeKey);
  if (!route) return json(404, { error: "Route not found" });

  try {
    await requireTravelianAuth(event, routeKey);
    const params = pathParams(routeKey, path);
    const result = route.handler
      ? await route.handler(event)
      : await proxyProviderRequest(event, route, params);
    return json(200, result);
  } catch (error) {
    console.error("skypass-proxy-error", {
      routeKey,
      message: error instanceof Error ? error.message : "Unknown error",
      statusCode: error?.statusCode,
    });
    return json(error?.statusCode || 502, {
      error: error?.publicMessage || "Skypass provider is unavailable",
      details: error instanceof Error ? error.message : "Provider connection failed",
    });
  }
}

async function health() {
  try {
    const config = await getProviderConfig();
    return {
      ok: Boolean(config.baseUrl && config.apiKey && config.apiSecret),
      provider: "skypass",
      configured: Boolean(config.baseUrl && config.apiKey && config.apiSecret),
    };
  } catch {
    return { ok: false, provider: "skypass", configured: false };
  }
}

async function login() {
  const token = await getProviderToken();
  return {
    ok: Boolean(token),
    provider: "skypass",
    authenticated: Boolean(token),
    expiresAt: cachedTokenExpiresAt || null,
  };
}

async function proxyProviderRequest(event, route, params) {
  const method = requestMethod(event);
  const providerPath = typeof route.providerPath === "function" ? route.providerPath(params) : route.providerPath;
  const query = route.query ? allowlistedQuery(event.queryStringParameters, route.query) : "";
  const body = method === "POST" ? await requestBody(event) : {};
  const preparedBody = method === "POST" ? providerFormData(body, route, params) : undefined;
  return authedProviderFetch(`${providerPath}${query}`, { method, body: preparedBody });
}

async function authedProviderFetch(path, init) {
  const token = await getProviderToken();
  try {
    return await providerFetch(path, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
    });
  } catch (error) {
    if (error?.statusCode !== 401) throw error;
    clearCachedToken();
    const freshToken = await getProviderToken({ forceRefresh: true });
    return providerFetch(path, {
      ...init,
      headers: { Authorization: `Bearer ${freshToken}`, ...(init.headers || {}) },
    });
  }
}

async function getProviderToken({ forceRefresh = false } = {}) {
  const config = await getProviderConfig();
  assertProviderConfig(config);

  if (!forceRefresh && isTokenUsable(cachedToken, cachedTokenExpiresAt)) return cachedToken;
  if (!forceRefresh && isTokenUsable(config.token, config.tokenExpiresAt)) {
    cachedToken = config.token;
    cachedTokenExpiresAt = config.tokenExpiresAt;
    return cachedToken;
  }

  const body = new FormData();
  body.append("api_key", config.apiKey);
  body.append("api_secret", config.apiSecret);
  const payload = await providerFetch("/auth", { method: "POST", body }, { authenticated: false });
  const token = extractToken(payload);
  if (!token) throw providerError("Skypass login did not return a bearer token");
  const expiresAt = extractTokenExpiresAt(payload, token);
  cachedToken = token;
  cachedTokenExpiresAt = expiresAt;
  await persistProviderToken(config, token, expiresAt);
  return token;
}

async function providerFetch(path, init = {}, { authenticated = true } = {}) {
  const config = await getProviderConfig();
  assertProviderConfig(config);
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...(init.headers || {}) },
  });
  const text = await response.text();
  const payload = parseResponse(text);
  if (!response.ok) {
    const error = providerError(
      payload?.message || payload?.error || `Skypass request failed with status ${response.status}`,
      response.status,
    );
    if (authenticated && response.status === 401) error.statusCode = 401;
    throw error;
  }
  return payload;
}

async function getProviderConfig() {
  if (cachedProviderConfig) return cachedProviderConfig;
  const secret = await getSecret(PROVIDER_SECRET_ID);
  cachedProviderConfig = {
    baseUrl: String(secret.baseUrl || secret.base_url || "https://dev.skypass.pk").replace(/\/$/, ""),
    apiKey: String(secret.apiKey || secret.api_key || ""),
    apiSecret: String(secret.apiSecret || secret.api_secret || ""),
    token: String(secret.token || secret.access_token || ""),
    tokenExpiresAt: normalizeTimestamp(secret.tokenExpiresAt || secret.token_expires_at || secret.expiresAt || secret.expires_at),
  };
  return cachedProviderConfig;
}

async function persistProviderToken(config, token, tokenExpiresAt) {
  cachedProviderConfig = { ...config, token, tokenExpiresAt };
  await secrets.send(new PutSecretValueCommand({
    SecretId: PROVIDER_SECRET_ID,
    SecretString: JSON.stringify(cachedProviderConfig),
  }));
}

async function requireTravelianAuth(event, routeKey) {
  if (publicRoutes.has(routeKey)) return;
  const expected = await getTravelianClientKey();
  const provided = header(event, "x-travelian-api-key") || bearerToken(event);
  if (expected && safeEqual(provided, expected)) return;
  const error = new Error("Unauthorized");
  error.statusCode = 401;
  error.publicMessage = "Unauthorized";
  throw error;
}

async function getTravelianClientKey() {
  if (cachedClientKey) return cachedClientKey;
  const secret = await getSecret(CLIENT_SECRET_ID);
  const key = typeof secret === "string" ? secret : secret.apiKey || secret.key;
  if (!key) {
    const error = new Error("Travelian API client secret must include apiKey");
    error.statusCode = 500;
    throw error;
  }
  cachedClientKey = String(key);
  return cachedClientKey;
}

async function getSecret(secretId) {
  const result = await secrets.send(new GetSecretValueCommand({ SecretId: secretId }));
  try {
    return JSON.parse(result.SecretString || "{}");
  } catch {
    return result.SecretString || "";
  }
}

function providerFormData(body, route, params) {
  const withPathFields = route.pathFields ? { ...body, ...mapPathFields(route.pathFields, params) } : body;
  const normalized = route.normalizePassengers ? normalizePassengers(withPathFields) : withPathFields;
  if (route.fields) requireFields(normalized, route.fields);
  const form = new FormData();
  if (route.bodyMode === "flatten") {
    appendNestedFormData(form, normalized);
  } else {
    for (const [key, value] of Object.entries(normalized)) {
      if (value !== undefined && value !== null) form.append(key, String(value));
    }
  }
  return form;
}

function appendNestedFormData(form, value, prefix = "") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => appendNestedFormData(form, item, `${prefix}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      appendNestedFormData(form, item, prefix ? `${prefix}[${key}]` : key);
    }
    return;
  }
  if (prefix && value !== undefined && value !== null) form.append(prefix, String(value));
}

function normalizePassengers(body) {
  if (!Array.isArray(body?.passengers)) return body;
  const passengers = {};
  body.passengers.forEach((passenger, index) => {
    for (const [key, value] of Object.entries(passenger || {})) {
      if (!passengers[key]) passengers[key] = [];
      passengers[key][index] = value;
    }
  });
  return { ...body, passengers };
}

function allowlistedQuery(queryParams = {}, allowed = []) {
  const query = new URLSearchParams();
  for (const key of allowed) {
    const value = queryParams?.[key];
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

async function requestBody(event) {
  if (!event.body) return {};
  const text = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  try {
    return JSON.parse(text);
  } catch {
    const error = new Error("Request body must be valid JSON");
    error.statusCode = 400;
    error.publicMessage = "Invalid request";
    throw error;
  }
}

function requireFields(body, fields) {
  const missing = fields.filter((field) => body?.[field] === undefined || body?.[field] === null || body?.[field] === "");
  if (!missing.length) return;
  const error = new Error(`Missing required fields: ${missing.join(", ")}`);
  error.statusCode = 400;
  error.publicMessage = "Invalid request";
  throw error;
}

function mapPathFields(mapping, params) {
  return Object.fromEntries(Object.entries(mapping).map(([bodyField, pathField]) => [bodyField, params[pathField]]));
}

function routePattern(method, path) {
  if (method === "GET" && /^\/skypass\/tickets\/[^/]+$/.test(path)) return "GET /skypass/tickets/{ticketId}";
  if (method === "GET" && /^\/skypass\/bookings\/[^/]+$/.test(path)) return "GET /skypass/bookings/{bookingId}";
  if (method === "POST" && /^\/skypass\/bookings\/[^/]+\/cancel$/.test(path)) return "POST /skypass/bookings/{bookingId}/cancel";
  if (method === "POST" && /^\/skypass\/bookings\/[^/]+\/update$/.test(path)) return "POST /skypass/bookings/{bookingId}/update";
  return `${method} ${path}`;
}

function pathParams(routeKey, path) {
  const names = [...routeKey.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  if (!names.length) return {};
  const routeSegments = routeKey.split(" ")[1].split("/");
  const pathSegments = path.split("/");
  const params = {};
  routeSegments.forEach((segment, index) => {
    const match = segment.match(/^\{([^}]+)\}$/);
    if (match) params[match[1]] = decodeURIComponent(pathSegments[index]);
  });
  return params;
}

function requestMethod(event) {
  return event.requestContext?.http?.method || event.httpMethod || "GET";
}

function normalizedPath(event) {
  let rawPath = event.rawPath || event.path || event.requestContext?.http?.path || "/";
  const providerMountIndex = rawPath.indexOf("/skypass");
  if (providerMountIndex > 0) rawPath = rawPath.slice(providerMountIndex);
  if (!rawPath.startsWith("/skypass") && event.requestContext?.http?.path?.startsWith("/skypass")) {
    rawPath = event.requestContext.http.path;
  }
  if (!rawPath.startsWith("/skypass") && event.routeKey === "ANY /skypass/{proxy+}") {
    rawPath = `/skypass${rawPath.startsWith("/") ? rawPath : `/${rawPath}`}`;
  }
  return rawPath !== "/" ? rawPath.replace(/\/+$/, "") : rawPath;
}

function header(event, name) {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(event.headers || {})) {
    if (key.toLowerCase() === lower) return value;
  }
  return undefined;
}

function bearerToken(event) {
  const value = header(event, "authorization");
  const [scheme, token] = String(value || "").split(/\s+/, 2);
  return scheme.toLowerCase() === "bearer" ? token : undefined;
}

function safeEqual(left, right) {
  if (!left || !right) return false;
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}

function parseResponse(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw providerError("Skypass returned a non-JSON response");
  }
}

function assertProviderConfig(config) {
  const missing = [];
  if (!config.baseUrl) missing.push("baseUrl");
  if (!config.apiKey) missing.push("apiKey");
  if (!config.apiSecret) missing.push("apiSecret");
  if (missing.length) {
    const error = providerError(`Skypass provider secret is missing: ${missing.join(", ")}`, 503);
    error.publicMessage = "Skypass provider is not configured";
    throw error;
  }
}

function extractToken(payload) {
  return payload?.token || payload?.access_token || payload?.data?.token || payload?.data?.access_token || "";
}

function extractTokenExpiresAt(payload, token) {
  const explicit = normalizeTimestamp(
    payload?.expires_at || payload?.expiresAt || payload?.data?.expires_at || payload?.data?.expiresAt,
  );
  if (explicit) return explicit;
  const jwtPayload = decodeJwtPayload(token);
  return normalizeTimestamp(jwtPayload?.exp);
}

function decodeJwtPayload(token) {
  try {
    const [, payload] = String(token).split(".");
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

function normalizeTimestamp(value) {
  if (!value) return 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric > 10_000_000_000 ? Math.floor(numeric / 1000) : numeric;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : 0;
}

function isTokenUsable(token, expiresAt) {
  return Boolean(token && expiresAt && expiresAt - TOKEN_REFRESH_BUFFER_SECONDS > Math.floor(Date.now() / 1000));
}

function clearCachedToken() {
  cachedToken = "";
  cachedTokenExpiresAt = 0;
  if (cachedProviderConfig) {
    cachedProviderConfig.token = "";
    cachedProviderConfig.tokenExpiresAt = 0;
  }
}

function providerError(message, statusCode = 502) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export const internals = {
  allowlistedQuery,
  appendNestedFormData,
  extractToken,
  extractTokenExpiresAt,
  isTokenUsable,
  normalizeTimestamp,
  normalizePassengers,
  normalizedPath,
  pathParams,
  routePattern,
};
