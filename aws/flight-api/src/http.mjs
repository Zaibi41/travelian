import { getSecretJson } from "./secrets.mjs";

export function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": process.env.CORS_ORIGIN || "*",
      "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type,authorization,x-request-id,x-travelian-api-key",
      ...headers
    },
    body: JSON.stringify(body)
  };
}

export async function readJson(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Invalid JSON body");
    error.statusCode = 400;
    throw error;
  }
}

export function requestId(event) {
  return (
    event.headers?.["x-request-id"] ||
    event.headers?.["X-Request-Id"] ||
    event.requestContext?.requestId ||
    crypto.randomUUID()
  );
}

export function normalizePath(event) {
  let rawPath = event.rawPath || event.path || "/";
  const stage = event.requestContext?.stage;
  if (stage && rawPath === `/${stage}`) rawPath = "/";
  else if (stage && rawPath.startsWith(`/${stage}/`)) rawPath = rawPath.slice(stage.length + 1);
  if (rawPath.length > 1 && rawPath.endsWith("/")) rawPath = rawPath.slice(0, -1);
  return rawPath;
}

export function method(event) {
  return event.requestContext?.http?.method || event.httpMethod || "GET";
}

export async function outboundFetch(url, options = {}) {
  const proxyUrl = process.env.EGRESS_PROXY_URL;
  if (!proxyUrl) return fetch(url, options);

  const token = await egressProxyToken();
  const headers = options.headers instanceof Headers
    ? Object.fromEntries(options.headers.entries())
    : { ...(options.headers || {}) };

  const body = options.body === undefined || options.body === null
    ? undefined
    : typeof options.body === "string"
      ? options.body
      : options.body instanceof URLSearchParams
        ? options.body.toString()
        : JSON.stringify(options.body);

  return fetch(proxyUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-travelian-egress-token": token,
    },
    body: JSON.stringify({
      url: String(url),
      method: options.method || "GET",
      headers,
      body,
    }),
    signal: options.signal,
  });
}

async function egressProxyToken() {
  if (process.env.EGRESS_PROXY_TOKEN) return process.env.EGRESS_PROXY_TOKEN;
  const secretId = process.env.EGRESS_PROXY_SECRET_ID;
  const secret = secretId ? await getSecretJson(secretId) : null;
  const token = typeof secret === "string" ? secret : secret?.token;
  if (!token) throw new Error("Egress proxy token is not configured");
  return String(token);
}
