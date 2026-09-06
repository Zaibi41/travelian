import { afterEach, describe, expect, it, vi } from "vitest";
import { searchFlights } from "./travelian-api";

afterEach(() => vi.unstubAllGlobals());

describe("flight schedule timezone handling", () => {
  it.each([
    ["2026-10-06T19:00:00+04:00", "2026-10-06 19:00"],
    ["2026-10-06T18:20:00+04:00", "2026-10-06 18:20"],
    ["2026-10-06T23:30:00-05:00", "2026-10-06 23:30"],
    ["2026-10-06T00:30:00+14:00", "2026-10-06 00:30"],
    ["2026-10-06T19:00:00Z", "2026-10-06 19:00"],
    ["2026-10-06T19:00:00", "2026-10-06 19:00"],
  ])("preserves the provider's airport-local time for %s", async (arrival, expected) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [{
      offerId: "test", provider: "sooperfare", airline: "Test Airline", flightNumber: "TEST-1",
      origin: "LHE", destination: "DXB", cabin: "Economy", price: { total: 100, currency: "PKR" },
      departureTime: "2026-10-06T15:50:00+05:00", arrivalTime: arrival,
      returnDepartureTime: arrival, returnArrivalTime: arrival,
      segments: [{ departureTime: arrival, arrivalTime: arrival }],
      layovers: [{ arrivalTime: arrival, departureTime: arrival }],
    }] }) }));
    const { flights: [flight] } = await searchFlights({ tripType: "oneway", from: "LHE", to: "DXB",
      departureDate: "2026-10-06", cabin: "Economy", currency: "PKR", passengers: { adults: 1, children: 0, infants: 0 } });
    expect(flight.arrivalTime).toBe(expected);
    expect(flight.returnDepartureTime).toBe(expected);
    expect(flight.returnArrivalTime).toBe(expected);
    expect(flight.segments?.[0].departureTime).toBe(expected);
    expect(flight.segments?.[0].arrivalTime).toBe(expected);
    expect(flight.layovers?.[0].arrivalTime).toBe(expected);
    expect(flight.arrivalTimestamp).toBe(arrival);
    expect(flight.segments?.[0].arrivalTimestamp).toBe(arrival);
    expect(flight.returnArrivalTimestamp).toBe(arrival);
    if (arrival === "2026-10-06T18:20:00+04:00") {
      expect(new Date(flight.arrivalTimestamp!).getTime() - new Date(flight.departureTimestamp!).getTime()).toBe(3.5 * 3600000);
    }
  });
});
