import { requireApiAuth } from "../auth.mjs";
import { json, method } from "../http.mjs";
import { SooperFareAdapter } from "../providers/sooperfare.mjs";

export const SOOPERFARE_RAW_ROUTES = new Set([
  "GET /v1/airline/airports",
  "GET /v1/airline/availability",
  "POST /v1/airline/search",
  "POST /v1/airline/quote",
  "POST /v1/airline/ancillary",
  "PATCH /v1/airline/ancillary",
  "POST /v1/airline/reservation",
  "POST /v1/airline/fares",
  "POST /v1/partner/auth/login",
  "POST /v1/booking/extras",
  "PATCH /v1/booking/extras",
  "POST /v1/booking/list",
  "POST /v1/booking/confirm",
  "POST /v1/booking/cancel",
  "POST /v1/booking/void",
]);

export async function sooperFareRaw(event, path, requestId) {
  const headers = { "cache-control": "no-store", "x-request-id": requestId };
  try {
    await requireApiAuth(event, "sooperfare-raw", { forceApiKey: true });
    const providerPath = path.slice("/sooperfare/raw".length);
    const requestMethod = method(event);
    if (!SOOPERFARE_RAW_ROUTES.has(`${requestMethod} ${providerPath}`)) {
      return json(404, { error: "Unsupported SooperFare operation", requestId }, headers);
    }
    const query = event.rawQueryString || new URLSearchParams(event.queryStringParameters || {}).toString();
    const body = event.body == null ? undefined : event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
    const clientHeaders = {};
    for (const [key, value] of Object.entries(event.headers || {})) {
      if (["x-sf-client-currency", "x-sf-client-locale"].includes(key.toLowerCase())) {
        clientHeaders[key.toLowerCase()] = value;
      }
    }
    const response = await new SooperFareAdapter().rawProviderRequest(
      requestMethod, providerPath, query, body, clientHeaders,
    );
    return { ...response, headers: { ...response.headers, ...headers } };
  } catch (error) {
    const unauthorized = error.statusCode === 401;
    return json(unauthorized ? 401 : 502, {
      error: unauthorized ? "Unauthorized" : "Unable to complete provider request",
      ...(unauthorized ? { hint: "Select the Travelian Private environment and send x-travelian-api-key. Provider credentials are not accepted here." } : {}),
      requestId,
    }, headers);
  }
}
