import { requireApiAuth } from "../auth.mjs";
import { json, readJson } from "../http.mjs";
import { validateSearchRequest } from "../validation.mjs";
import { SooperFareAdapter } from "../providers/sooperfare.mjs";

export async function rawFlightSearch(event, requestId, defaultProvider) {
  const headers = { "cache-control": "no-store", "x-request-id": requestId };
  try {
    await requireApiAuth(event, "POST /debug/flights/search/raw", { forceApiKey: true });
    const body = await readJson(event);
    if ((body.provider ?? defaultProvider) !== "sooperfare") {
      return json(400, { error: "provider must be sooperfare" }, headers);
    }
    if (body.airlineProvider !== undefined && !/^[A-Z0-9_-]{1,40}$/.test(body.airlineProvider)) {
      return json(400, { error: "airlineProvider must be a provider code such as SABRE" }, headers);
    }
    const request = validateSearchRequest(body);
    const provider = new SooperFareAdapter();
    const response = await provider.rawSearchFlights(request, body.airlineProvider);
    return { ...response, headers: { ...response.headers, ...headers } };
  } catch (error) {
    const status = error.statusCode === 401 ? 401 : error.statusCode === 400 ? 400 : 502;
    return json(status, {
      error: status === 401 ? "Unauthorized" : status === 400 ? "Invalid search request" : "Unable to complete provider search",
      ...(status === 401 ? { hint: "Send your Travelian client API key in the x-travelian-api-key header. Provider credentials are not accepted here." } : {}),
      ...(status === 400 && error.details ? { details: error.details } : {}),
      requestId,
    }, headers);
  }
}
