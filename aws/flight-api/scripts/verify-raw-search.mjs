import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

const endpoint = "https://api.travelian.pk/debug/flights/search/raw";
const parameter = JSON.parse(execFileSync("aws", [
  "ssm", "get-parameter", "--name", "/travelian/api/clients", "--with-decryption",
  "--region", "us-east-1", "--profile", "travelian-admin", "--output", "json",
], { encoding: "utf8" }));
let secret = parameter.Parameter.Value;
for (let i = 0; i < 2 && typeof secret === "string"; i++) {
  try { secret = JSON.parse(secret); } catch { break; }
}
const key = typeof secret === "string" ? secret : secret?.apiKey || secret?.key;
assert.ok(key, "Configured client API key is missing");
const departure = new Date();
departure.setUTCDate(departure.getUTCDate() + 30);
const body = JSON.stringify({ provider: "sooperfare", tripType: "oneway",
  origin: "LHE", destination: "DXB", departureDate: departure.toISOString().slice(0, 10),
  passengers: { adults: 1, children: 0, infants: 0 }, cabin: "Economy", currency: "PKR" });
for (const [name, token] of [["missing key", ""], ["incorrect key", "invalid-test-key"], ["authenticated provider search", key]]) {
  const response = await fetch(endpoint, { method: "POST", headers: {
    "content-type": "application/json", ...(token ? { "x-travelian-api-key": token } : {}),
  }, body, signal: AbortSignal.timeout(45000) });
  const raw = await response.text();
  console.log(JSON.stringify({ check: name, status: response.status, bytes: Buffer.byteLength(raw),
    contentType: response.headers.get("content-type"), cacheControl: response.headers.get("cache-control"),
    providerSource: response.headers.get("x-travelian-provider-source") }));
  if (token !== key) assert.equal(response.status, 401);
  else {
    if (response.status !== 200) {
      const errorPayload = JSON.parse(raw);
      console.log(JSON.stringify({ providerError: errorPayload.message || errorPayload.error, providerResponseKeys: Object.keys(errorPayload) }));
    }
    assert.equal(response.status, 200, "Authenticated search did not return a successful provider response");
    const payload = JSON.parse(raw);
    assert.ok(!payload.searchId, "Received normalized Travelian search response");
    console.log(JSON.stringify({ providerResponseKeys: Object.keys(payload) }));
  }
}
