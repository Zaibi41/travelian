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
