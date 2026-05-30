import assert from "node:assert/strict";
import test from "node:test";
import { internals } from "../index.mjs";

test("maps dynamic route patterns without exposing arbitrary provider paths", () => {
  assert.equal(internals.routePattern("GET", "/skypass/tickets/123"), "GET /skypass/tickets/{ticketId}");
  assert.equal(internals.routePattern("POST", "/skypass/bookings/456/update"), "POST /skypass/bookings/{bookingId}/update");
  assert.equal(internals.routePattern("GET", "/skypass/private"), "GET /skypass/private");
});

test("extracts dynamic path parameters", () => {
  assert.deepEqual(
    internals.pathParams("GET /skypass/tickets/{ticketId}", "/skypass/tickets/ABC%20123"),
    { ticketId: "ABC 123" },
  );
});

test("normalizes the API Gateway stage prefix before matching provider routes", () => {
  assert.equal(internals.normalizedPath({ rawPath: "/prod/skypass/health" }), "/skypass/health");
});

test("only forwards explicitly documented query parameters", () => {
  assert.equal(
    internals.allowlistedQuery({ sector: "LHE-DXB", page: "2", supplier_token: "nope" }, ["sector", "page"]),
    "?sector=LHE-DXB&page=2",
  );
});

test("flattens booking payloads into Skypass form field names", () => {
  const form = new FormData();
  internals.appendNestedFormData(form, internals.normalizePassengers({
    ticket_id: 1234,
    passengers: [{ title: "Mr", passport_number: "A123456" }],
    agent_details: { id: "1", name: "Travelian Agent" },
  }));
  assert.deepEqual([...form.entries()], [
    ["ticket_id", "1234"],
    ["passengers[title][0]", "Mr"],
    ["passengers[passport_number][0]", "A123456"],
    ["agent_details[id]", "1"],
    ["agent_details[name]", "Travelian Agent"],
  ]);
});

test("extracts expiry from JWT when Skypass omits explicit expiry", () => {
  const payload = Buffer.from(JSON.stringify({ exp: 2_000_000_000 })).toString("base64url");
  assert.equal(internals.extractTokenExpiresAt({}, `header.${payload}.signature`), 2_000_000_000);
});
