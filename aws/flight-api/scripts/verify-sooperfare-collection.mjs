import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import https from "node:https";
import assert from "node:assert/strict";

const downloads = join(homedir(), "Downloads");
const collection = JSON.parse(readFileSync(join(downloads, "SooperFare-Complete-Raw-AWS.postman_collection.json"), "utf8"));
const environment = JSON.parse(readFileSync(join(downloads, "Travelian-Private.postman_environment.json"), "utf8"));
const variables = Object.fromEntries(collection.variable.map(item => [item.key, item.value]));
for (const item of environment.values) if (item.enabled) variables[item.key] = item.value;
const departure = new Date();
departure.setUTCDate(departure.getUTCDate() + 30);
variables.flightDate1 = departure.toISOString().slice(0, 10);
function resolve(value) { return value.replace(/\{\{([^}]+)\}\}/g, (_, key) => variables[key] ?? ""); }
function request(url, method, body, key) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers: {
      "content-type": "application/json", "content-length": Buffer.byteLength(body || ""),
      ...(key ? { "x-travelian-api-key": key } : {}),
    } }, response => {
      let raw = "";
      response.setEncoding("utf8");
      response.on("data", chunk => { raw += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, raw }));
    });
    req.on("error", reject);
    req.setTimeout(45000, () => req.destroy(new Error("Request timed out")));
    req.end(body);
  });
}
const airline = collection.item.find(item => item.name === "Airline");
assert.ok(airline);
const first = airline.item.find(item => item.name === "Airports").request;
for (const key of ["", "incorrect-key"]) {
  const result = await request(resolve(first.url), first.method, first.body.raw, key);
  assert.equal(result.status, 401);
}
for (const name of ["Airports", "Availability", "Search"]) {
  const item = airline.item.find(item => item.name === name).request;
  const result = await request(resolve(item.url), item.method, resolve(item.body.raw), variables.travelianApiKey);
  const payload = JSON.parse(result.raw);
  console.log(JSON.stringify({ operation: name, status: result.status, bytes: Buffer.byteLength(result.raw), providerKeys: Object.keys(payload) }));
  assert.equal(result.status, 200, `${name} failed`);
  assert.ok(!payload.searchId, "Received normalized results");
}
