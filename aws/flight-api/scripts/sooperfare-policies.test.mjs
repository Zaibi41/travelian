import test from "node:test";
import assert from "node:assert/strict";
import { SooperFareAdapter } from "../src/providers/sooperfare.mjs";

test("SooperFareAdapter extracts exchange and refund rules from fare_policies", () => {
  const adapter = new SooperFareAdapter();

  const mockOffer = {
    ref_id: "flight-123",
    provider: "PIA",
    fares: [
      {
        ref_id: "fare-1",
        name: "Economy Smart",
        class_code: "U",
        billable_price: 65000,
        currency: "PKR",
        baggage_policies: [
          { type: "carry", weight_limit: 7 },
          { type: "checked", weight_limit: 20, pieces: 1 }
        ],
        fare_policies: [
          {
            type: "exchange",
            description: "Date change permitted with PKR 3,000 fee plus fare difference",
            traveler_type: "adult"
          },
          {
            type: "refund",
            description: "Cancellation permitted before departure with PKR 5,000 fee",
            traveler_type: "adult"
          }
        ]
      }
    ],
    segments: [
      {
        from: { iata: "LHE", name: "Lahore" },
        to: { iata: "DXB", name: "Dubai" },
        departure: { date: "2026-10-15", time: "10:00" },
        arrival: { date: "2026-10-15", time: "12:30" }
      }
    ]
  };

  const normalized = adapter.normalizeOffer(mockOffer, {
    tripType: "oneway",
    cabin: "Economy",
    origin: "LHE",
    destination: "DXB"
  });

  assert.ok(normalized);
  assert.equal(normalized.fareOptions.length, 1);
  const option = normalized.fareOptions[0];
  assert.equal(option.tier, "Economy Smart (U)");
  assert.equal(option.bags, "7Kg + 20Kg");
  assert.equal(option.change, "Date change permitted with PKR 3,000 fee plus fare difference");
  assert.equal(option.refund, "Cancellation permitted before departure with PKR 5,000 fee");
  assert.equal(option.cancellation, "Cancellation permitted before departure with PKR 5,000 fee");
  assert.equal(option.farePolicies?.length, 2);
});

test("SooperFareAdapter handles non-refundable fare flag when policies array is missing", () => {
  const adapter = new SooperFareAdapter();

  const mockOffer = {
    ref_id: "flight-456",
    provider: "Fly Jinnah",
    fares: [
      {
        ref_id: "fare-2",
        name: "Basic",
        class_code: "Y",
        billable_price: 45000,
        currency: "PKR",
        refundable: false
      }
    ],
    segments: [
      {
        from: { iata: "KHI", name: "Karachi" },
        to: { iata: "ISB", name: "Islamabad" },
        departure: { date: "2026-10-15", time: "10:00" },
        arrival: { date: "2026-10-15", time: "12:00" }
      }
    ]
  };

  const normalized = adapter.normalizeOffer(mockOffer, {
    tripType: "oneway",
    cabin: "Economy",
    origin: "KHI",
    destination: "ISB"
  });

  assert.ok(normalized);
  const option = normalized.fareOptions[0];
  assert.equal(option.refund, "Non-refundable");
  assert.equal(option.cancellation, "Non-refundable");
});

test("SooperFareAdapter handles Fly Jinnah + Air Arabia connecting flight", () => {
  const adapter = new SooperFareAdapter();

  const mockOffer = {
    ref_id: "conn-123",
    provider: "FLYJINNAH",
    fares: [
      {
        ref_id: "fare-conn-1",
        name: "Economy",
        billable_price: 85000,
        currency: "PKR",
      }
    ],
    segments: [
      {
        carrier: "9P",
        flight_number: "9P-501",
        from: { iata: "LHE", name: "Lahore" },
        to: { iata: "SHJ", name: "Sharjah" },
        departure: { date: "2026-10-15", time: "06:00" },
        arrival: { date: "2026-10-15", time: "08:30" }
      },
      {
        carrier: "G9",
        flight_number: "G9-123",
        from: { iata: "SHJ", name: "Sharjah" },
        to: { iata: "DMM", name: "Dammam" },
        departure: { date: "2026-10-15", time: "11:00" },
        arrival: { date: "2026-10-15", time: "12:15" }
      }
    ]
  };

  const normalized = adapter.normalizeOffer(mockOffer, {
    tripType: "oneway",
    cabin: "Economy",
    origin: "LHE",
    destination: "DMM"
  });

  assert.ok(normalized);
  assert.equal(normalized.airline, "Fly Jinnah / Air Arabia");
  assert.equal(normalized.airlineCode, "9P / G9");
  assert.deepEqual(normalized.airlines, ["Fly Jinnah", "Air Arabia"]);
  assert.equal(normalized.segments.length, 2);
  assert.equal(normalized.segments[0].carrier, "9P");
  assert.equal(normalized.segments[0].airline, "Fly Jinnah");
  assert.equal(normalized.segments[1].carrier, "G9");
  assert.equal(normalized.segments[1].airline, "Air Arabia");
});

test("SooperFareAdapter extracts 3 Flynas fare tiers with distinct baggage allowances", () => {
  const adapter = new SooperFareAdapter();

  const mockOffer = {
    ref_id: "flynas-456",
    provider: "FLYNAS",
    marketing_carrier: { name: "Flynas", iata: "XY" },
    fares: [
      {
        ref_id: "fn-light",
        name: "Light",
        billable_price: 45000,
        currency: "PKR",
        baggage_policies: [
          { type: "carry", weight_limit: 7 }
        ]
      },
      {
        ref_id: "fn-value",
        name: "Value",
        billable_price: 52000,
        currency: "PKR",
        baggage_policies: [
          { type: "carry", weight_limit: 7 },
          { type: "checked", weight_limit: 20 }
        ]
      },
      {
        ref_id: "fn-plus",
        name: "Plus",
        billable_price: 61000,
        currency: "PKR",
        baggage_policies: [
          { type: "carry", weight_limit: 7 },
          { type: "checked", weight_limit: 30, pieces: 1 }
        ]
      }
    ],
    segments: [
      {
        carrier: "XY",
        flight_number: "XY-318",
        from: { iata: "LHE", name: "Lahore" },
        to: { iata: "RUH", name: "Riyadh" },
        departure: { date: "2026-10-15", time: "14:00" },
        arrival: { date: "2026-10-15", time: "16:30" }
      }
    ]
  };

  const normalized = adapter.normalizeOffer(mockOffer, {
    tripType: "oneway",
    cabin: "Economy",
    origin: "LHE",
    destination: "RUH"
  });

  assert.ok(normalized);
  assert.equal(normalized.airline, "Flynas");
  assert.equal(normalized.fareOptions.length, 3);
  assert.equal(normalized.fareOptions[0].tier, "Light");
  assert.equal(normalized.fareOptions[0].bags, "7Kg");
  assert.equal(normalized.fareOptions[1].tier, "Value");
  assert.equal(normalized.fareOptions[1].bags, "7Kg + 20Kg");
  assert.equal(normalized.fareOptions[2].tier, "Plus");
  assert.equal(normalized.fareOptions[2].bags, "7Kg + 30Kg");
});
