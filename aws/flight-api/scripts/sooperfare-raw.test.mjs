import test from "node:test";
import assert from "node:assert/strict";
import { handler } from "../src/index.mjs";
import { SOOPERFARE_RAW_ROUTES } from "../src/services/sooperfare-raw.mjs";

process.env.TRAVELIAN_API_AUTH_MODE = "off";
process.env.TRAVELIAN_API_KEY_SECRET_ID = "env:RAW_KEY";
process.env.RAW_KEY = JSON.stringify({ apiKey: "test-only-key" });
process.env.SOOPERFARE_SECRET_ID = "env:RAW_PROVIDER";
process.env.RAW_PROVIDER = JSON.stringify({ baseUrl: "https://provider.invalid" });
process.env.EGRESS_PROXY_URL = "https://egress.invalid/proxy";
process.env.EGRESS_PROXY_TOKEN = "test-only-egress";

function event(route, body = ' {"raw_field":12.00} ') {
  const [method, path] = route.split(" ");
  return { rawPath: `/sooperfare/raw${path}`, requestContext: { http: { method } },
    headers: { "x-travelian-api-key": "test-only-key" }, body, rawQueryString: "query=LHE&query=DXB" };
}

test("all full-collection operations require authentication with global auth off", async () => {
  for (const route of SOOPERFARE_RAW_ROUTES) {
    assert.equal((await handler({ ...event(route), headers: {} })).statusCode, 401);
    assert.equal((await handler({ ...event(route), headers: { "x-travelian-api-key": "wrong" } })).statusCode, 401);
  }
});

test("all non-login operations preserve methods, query, bodies, responses and status", async (t) => {
  let sent;
  const raw = ' { "untouched": 12.00 } ';
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://egress.invalid/proxy");
    sent = JSON.parse(options.body);
    return new Response(raw, { status: 202, headers: { "content-type": "application/json" } });
  });
  for (const route of SOOPERFARE_RAW_ROUTES) {
    if (route.includes("/auth/login")) continue;
    const request = event(route);
    const response = await handler(request);
    assert.equal(response.statusCode, 202);
    assert.equal(response.body, raw);
    assert.equal(sent.body, request.body);
    assert.equal(sent.method, route.split(" ")[0]);
    assert.equal(sent.url, `https://provider.invalid${route.split(" ")[1]}?query=LHE&query=DXB`);
    assert.equal(sent.headers["x-travelian-api-key"], undefined);
    assert.equal(response.headers["cache-control"], "no-store");
  }
});

test("unknown paths and wrong methods never reach the provider", async (t) => {
  t.mock.method(globalThis, "fetch", () => { throw new Error("must not call provider"); });
  for (const route of ["DELETE /v1/booking/list", "POST /v1/admin", "POST /v1/../admin", "GET //other.invalid/path"]) {
    assert.equal((await handler(event(route))).statusCode, 404);
  }
});

test("base64 bodies and provider errors remain intact", async (t) => {
  const raw = '{"ref_id":"example"}';
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(JSON.parse(options.body).body, raw);
    return new Response("provider error", { status: 422, headers: { "content-type": "text/plain" } });
  });
  const response = await handler({ ...event("POST /v1/airline/quote", Buffer.from(raw).toString("base64")), isBase64Encoded: true });
  assert.equal(response.statusCode, 422);
  assert.equal(response.body, "provider error");
});

test("login uses server credentials and returns the raw provider response", async (t) => {
  const previousSecret = process.env.SOOPERFARE_SECRET_ID;
  process.env.SOOPERFARE_SECRET_ID = "env:RAW_LOGIN_PROVIDER";
  process.env.RAW_LOGIN_PROVIDER = JSON.stringify({ baseUrl: "https://provider.invalid", username: "test-user", password: "test-password" });
  t.mock.method(globalThis, "fetch", async (url, options) => {
    const forwarded = JSON.parse(options.body);
    assert.equal(forwarded.url, "https://provider.invalid/v1/partner/auth/login?query=LHE&query=DXB");
    assert.deepEqual(JSON.parse(forwarded.body), { username: "test-user", password: "test-password" });
    return new Response('{"token":"test-only-response"}', { status: 200 });
  });
  try {
    const response = await handler(event("POST /v1/partner/auth/login", "{}"));
    assert.equal(response.statusCode, 200);
    assert.equal(response.body, '{"token":"test-only-response"}');
  } finally {
    process.env.SOOPERFARE_SECRET_ID = previousSecret;
  }
});
