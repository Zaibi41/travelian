import { getSecretJson } from "./secrets.mjs";
import { timingSafeEqual } from "node:crypto";

const PUBLIC_ROUTES = new Set([
  "GET /health",
  "GET /content/blog-posts",
  "GET /content/blog-posts/{slug}",
  "GET /content/hotels",
  "GET /content/group-ticketing-collections/public",
  "POST /payments/payfast/session",
  "POST /payments/payfast/callback",
]);

let apiKeyCache;

export async function requireApiAuth(event, routeKey, { forceApiKey = false } = {}) {
  const mode = forceApiKey ? "api-key" : (process.env.TRAVELIAN_API_AUTH_MODE || "off").toLowerCase();
  if (mode === "off" || PUBLIC_ROUTES.has(routeKey)) return;

  if (mode === "api-key") {
    const expected = await loadApiKey();
    const provided = header(event, "x-travelian-api-key") || bearerToken(event);
    if (expected && safeEqual(provided, expected)) return;
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    throw error;
  }

  const error = new Error(`Unsupported API auth mode: ${mode}`);
  error.statusCode = 500;
  throw error;
}

async function loadApiKey() {
  if (apiKeyCache) return apiKeyCache;
  const secretId = process.env.TRAVELIAN_API_KEY_SECRET_ID;
  if (!secretId) {
    const error = new Error("Travelian API key secret is not configured");
    error.statusCode = 500;
    throw error;
  }

  const secret = await getSecretJson(secretId);
  const apiKey = typeof secret === "string" ? secret : secret?.apiKey || secret?.key;
  if (!apiKey) {
    const error = new Error("Travelian API key secret must include apiKey");
    error.statusCode = 500;
    throw error;
  }
  apiKeyCache = String(apiKey);
  return apiKeyCache;
}

function header(event, name) {
  const headers = event.headers || {};
  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lowerName) return value;
  }
  return undefined;
}

function bearerToken(event) {
  const value = header(event, "authorization");
  if (!value) return undefined;
  const [scheme, token] = String(value).split(/\s+/, 2);
  return scheme?.toLowerCase() === "bearer" ? token : undefined;
}

function safeEqual(a, b) {
  if (!a || !b) return false;
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
