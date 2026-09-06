import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { SOOPERFARE_RAW_ROUTES } from "../src/services/sooperfare-raw.mjs";

const source = process.argv[2] || "SooperFare Shareable.postman_collection.json";
const original = JSON.parse(readFileSync(source, "utf8"));
const variables = new Map([
  ["END_POINT", "https://api.travelian.pk/sooperfare/raw"],
  ["travelianApiKey", ""], ["airlineProvider", "PA"],
  ["origin", "LHE"], ["destination", "DXB"],
]);
const privateField = /^(?:.*ref_id|first_name|last_name|middle_name|email|phone.*|mobile.*|dob|date_of_birth|passport.*|nic|cnic|address.*)$/i;
function placeholder(key) {
  variables.set(key, "");
  return `{{${key}}}`;
}
function sanitizeBody(value, key = "") {
  if (Array.isArray(value)) return value.map(item => sanitizeBody(item, key));
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).map(([field, item]) => [field, sanitizeBody(item, field)]),
  );
  if (privateField.test(key)) return placeholder(key);
  if (key === "provider") return "{{airlineProvider}}";
  return value;
}
let count = 0;
function convert(items) {
  return items.map(item => {
    if (item.item) return { name: item.name, item: convert(item.item) };
    const request = item.request;
    const originalUrl = typeof request.url === "string" ? request.url : request.url.raw;
    const suffix = originalUrl.slice(originalUrl.indexOf("v1/"));
    const path = `/${suffix.split("?")[0]}`;
    if (!SOOPERFARE_RAW_ROUTES.has(`${request.method} ${path}`)) throw new Error(`Unsupported source operation: ${request.method} ${path}`);
    const converted = {
      method: request.method,
      auth: undefined,
      header: (request.header || []).filter(header => ["content-type", "accept", "x-sf-client-currency", "x-sf-client-locale"].includes(header.key.toLowerCase())),
      url: `{{END_POINT}}/${suffix}`,
      description: "Raw SooperFare operation via the whitelisted AWS IP. Uses the Travelian Private environment. Fill reference/passenger placeholders before sending booking requests.",
    };
    if (request.body?.mode === "raw") {
      let body = request.body.raw?.trim() ? JSON.parse(request.body.raw) : {};
      body = path === "/v1/partner/auth/login" ? {} : sanitizeBody(body);
      if (["/v1/airline/search", "/v1/airline/availability"].includes(path)) {
        for (const [index, leg] of (body.legs || []).entries()) {
          leg.date = `{{flightDate${index + 1}}}`;
          leg.from = index % 2 ? "{{destination}}" : "{{origin}}";
          leg.to = index % 2 ? "{{origin}}" : "{{destination}}";
          if ("return" in leg) leg.return = body.trip_type === "one_way" ? null : "{{flightDate2}}";
        }
      }
      converted.body = { mode: "raw", raw: JSON.stringify(body, null, 2), options: { raw: { language: "json" } } };
    }
    count++;
    return { name: item.name, request: converted, response: [] };
  });
}
const items = convert(original.item);
const collection = {
  info: {
    name: "SooperFare - Complete Raw via Travelian AWS",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    description: "All 15 operations from the supplied SooperFare collection. Import and select Travelian Private for authentication. Start with Airports, Availability, then Search; choose an enabled airlineProvider from Availability. Login uses AWS-held supplier credentials. Requests after Search require current references from earlier responses. Reservation, Confirm, Cancel, Void and PATCH operations can change real bookings: send individually, not as a collection run.",
  },
  variable: [...variables].map(([key, value]) => ({ key, value })),
  auth: { type: "apikey", apikey: [
    { key: "key", value: "x-travelian-api-key", type: "string" },
    { key: "value", value: "{{travelianApiKey}}", type: "string" },
    { key: "in", value: "header", type: "string" },
  ] },
  event: [{ listen: "prerequest", script: { type: "text/javascript", exec: [
    "for (let i = 1; i <= 6; i++) {",
    "  const key = 'flightDate' + i;",
    "  if (!pm.variables.get(key)) {",
    "    const date = new Date(); date.setUTCDate(date.getUTCDate() + 30 + (i - 1) * 7);",
    "    pm.variables.set(key, date.toISOString().slice(0, 10));",
    "  }",
    "}",
  ] } }],
  item: items,
};
const destination = join(homedir(), "Downloads", "SooperFare-Complete-Raw-AWS.postman_collection.json");
writeFileSync(destination, JSON.stringify(collection, null, 2) + "\n");
console.log(JSON.stringify({ destination, requests: count }));
