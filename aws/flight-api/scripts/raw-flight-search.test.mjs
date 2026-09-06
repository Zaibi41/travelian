import test from "node:test";
import assert from "node:assert/strict";
import { handler } from "../src/index.mjs";
import { SooperFareAdapter } from "../src/providers/sooperfare.mjs";

process.env.TRAVELIAN_API_AUTH_MODE = "off";
process.env.TRAVELIAN_API_KEY_SECRET_ID = "env:RAW_TEST_KEY";
process.env.RAW_TEST_KEY = JSON.stringify({ apiKey: "test-only-key" });
process.env.SOOPERFARE_SECRET_ID = "env:RAW_TEST_PROVIDER";
process.env.RAW_TEST_PROVIDER = JSON.stringify({ baseUrl: "https://provider.invalid", provider: "SABRE" });
process.env.EGRESS_PROXY_URL = "https://egress.invalid/proxy";
process.env.EGRESS_PROXY_TOKEN = "test-only-egress";

const input = {
  provider: "sooperfare", airlineProvider: "SABRE", tripType: "oneway",
  origin: "LHE", destination: "DXB", departureDate: "2026-10-15",
  passengers: { adults: 1, children: 0, infants: 0 }, cabin: "Economy", currency: "PKR",
};
function event(body = input, key = "test-only-key") {
  return { rawPath: "/debug/flights/search/raw", requestContext: { http: { method: "POST" } },
    headers: key ? { "x-travelian-api-key": key } : {}, body: JSON.stringify(body) };
}

test("raw search enforces auth even when public API auth is off", async () => {
  for (const key of [null, "wrong"]) {
    assert.equal((await handler(event(input, key))).statusCode, 401);
  }
});

test("rejects invalid requests before calling provider", async () => {
  for (const body of [{ ...input, provider: "unknown" }, { ...input, airlineProvider: "https://other.invalid" }, { ...input, origin: "bad-airport" }]) {
    assert.equal((await handler(event(body))).statusCode, 400);
  }
});

test("preserves raw body/status through egress for all trip types", async (t) => {
  const raw = ' { "unmapped_provider_field": [1, 2], "amount": 12.00 } ';
  let sent;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://egress.invalid/proxy");
    sent = JSON.parse(options.body);
    return new Response(raw, { status: 200, headers: { "content-type": "application/json" } });
  });
  for (const tripType of ["oneway", "roundtrip", "multicity"]) {
    const result = await handler(event({ ...input, tripType, returnDate: "2026-10-20",
      segments: [{ from: "LHE", to: "DXB", date: "2026-10-15" }, { from: "DXB", to: "LHE", date: "2026-10-20" }] }));
    assert.equal(result.statusCode, 200);
    assert.equal(result.body, raw);
    assert.equal(result.headers["cache-control"], "no-store");
    assert.equal(sent.url, "https://provider.invalid/v1/airline/search");
    assert.equal(JSON.parse(sent.body).provider, "SABRE");
    assert.equal(result.headers["x-sf-token"], undefined);
  }
});

test("preserves provider errors and non-JSON bodies", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("Provider unavailable", { status: 503, headers: { "content-type": "text/plain" } }));
  const result = await handler(event());
  assert.equal(result.statusCode, 503);
  assert.equal(result.body, "Provider unavailable");
  assert.equal(result.headers["content-type"], "text/plain");
});

test("omitting source selects an available provider", async (t) => {
  t.mock.method(SooperFareAdapter.prototype, "availableProviders", async () => ["AVAILABLE_SOURCE"]);
  t.mock.method(globalThis, "fetch", async (url, options) => {
    const forwarded = JSON.parse(options.body);
    assert.equal(JSON.parse(forwarded.body).provider, "AVAILABLE_SOURCE");
    return new Response('{"data":[]}', { status: 200 });
  });
  const result = await handler(event({ ...input, airlineProvider: undefined }));
  assert.equal(result.statusCode, 200);
  assert.equal(result.headers["x-travelian-provider-source"], "AVAILABLE_SOURCE");
});

test("transport errors do not expose credentials", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("secret token in upstream error"); });
  const result = await handler(event());
  assert.equal(result.statusCode, 502);
  assert.ok(!result.body.includes("secret token"));
});
