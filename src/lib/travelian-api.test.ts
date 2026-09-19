import { afterEach, describe, expect, it, vi } from "vitest";
import { hydrateSooperFareOptions, type TravelianFlight } from "./travelian-api";

const flight = (id: string, provider: string): TravelianFlight => ({
  flightId: id,
  offerId: id,
  provider,
  airline: provider === "sooperfare" ? "Flynas" : "PIA",
  flightNumber: provider === "sooperfare" ? "XY-318 / XY-205" : "PK-203",
  origin: "LHE",
  destination: "DXB",
  departureTime: "2026-09-30T03:55:00",
  arrivalTime: "2026-09-30T16:10:00",
  price: 89_269,
  currency: "PKR",
  seats: 4,
  status: "scheduled",
  class: "economy",
  fareOptions: [],
  rawRef: provider === "sooperfare" ? {
    faresPayload: { ref_id: `search-${id}`, legs: [{ ref_id: `leg-${id}` }] },
    flightRefIds: [`flight-${id}`],
  } : undefined,
});

afterEach(() => vi.unstubAllGlobals());

describe("hydrateSooperFareOptions", () => {
  it("loads SooperFare tiers before returning and leaves other providers unchanged", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      result: {
        fareOptions: [
          { tier: "Light Flex (H)", price: { currency: "PKR", total: 85_249 }, bags: "7 kg", change: "Allowed", refund: "Allowed" },
          { tier: "Light (H)", price: { currency: "PKR", total: 84_112 }, bags: "7 kg", change: "Fee applies", refund: "Non-refundable" },
        ],
      },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const other = flight("other", "pia");
    const results = await hydrateSooperFareOptions([flight("sf", "sooperfare"), other]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results[0].fareOptions).toHaveLength(2);
    expect(results[0].price).toBe(84_112);
    expect(results[0].fareBrand).toBe("Light (H)");
    expect(results[1]).toEqual(other);
  });
});
