import { describe, expect, it, vi } from "vitest";
import { inventoryOptions, parseGroupSearch, resultRows, searchGroupFares, sectorCodes, writeGroupSearch, type GroupInventory } from "./group-ticketing";

const ticket = (id: string, overrides: Record<string, unknown> = {}) => ({
  id, sector: "LHE - DMM", departure_date: "2026-11-13", departure_time: "09:45", airline: "Airblue", remaining: 9, baggage: "20 KG",
  logo_url: "/v1/logos/abc", selling_price: { amount_minor: 9_975_000, currency: "PKR" }, ...overrides,
});
const GROUPS = [
  { id: "g1", sector: "LAHORE - DAMMAM", airline: "Airblue", tickets: [ticket("t1"), ticket("t2", { departure_date: "2026-11-10", airline: "Serene Air" })] },
  { id: "g2", sector: "KARACHI - JEDDAH", airline: "PIA", tickets: [ticket("t3", { sector: "KHI-JED", airline: null, baggage: "" })] },
] as unknown as GroupInventory[];

describe("group ticketing search helpers", () => {
  it("reads sectors as airport codes", () => {
    expect(sectorCodes("LHE - DMM")).toEqual(["LHE", "DMM"]);
    expect(sectorCodes("ISB-DXB-JED")).toEqual(["ISB", "JED"]);
    expect(sectorCodes("LAHORE - DAMMAM")).toBeNull();
    expect(sectorCodes(null)).toBeNull();
  });
  it("lists sectors by departures on offer, and airlines A–Z", () => {
    const options = inventoryOptions(GROUPS);
    expect(options.sectors).toEqual([{ from: "LHE", to: "DMM", count: 2 }, { from: "KHI", to: "JED", count: 1 }]);
    expect(options.airlines).toEqual(["Airblue", "PIA", "Serene Air"]);
  });
  it("builds rows with the selling price and gateway logo only, earliest first, with an airline filter", () => {
    const rows = resultRows(GROUPS);
    expect(rows.map(row => row.id)).toEqual(["t2", "t1", "t3"]);
    expect(Object.keys(rows[0]).sort()).toEqual(["airline", "baggage", "departureDate", "departureTime", "id", "logoUrl", "price", "seatsLeft", "sector"]);
    expect(rows[0]).toMatchObject({ logoUrl: "/v1/logos/abc", price: { amount_minor: 9_975_000, currency: "PKR" } });
    expect(rows[2]).toMatchObject({ airline: "PIA", baggage: null });
    expect(resultRows(GROUPS, "Serene Air").map(row => row.id)).toEqual(["t2"]);
  });
  it("keeps the search in the URL", () => {
    const search = parseGroupSearch(new URLSearchParams("tab=group-ticketing&from=lhe&to=DMM&date=2026-11-13&adults=3&airline=PIA"));
    expect(search).toEqual({ from: "LHE", to: "DMM", date: "2026-11-13", adults: 3, airline: "PIA" });
    expect(writeGroupSearch(new URLSearchParams("tab=group-ticketing"), search).toString()).toBe("tab=group-ticketing&from=LHE&to=DMM&date=2026-11-13&adults=3&airline=PIA");
    expect(parseGroupSearch(new URLSearchParams("from=LAHORE&date=13-11-2026&adults=40"))).toEqual({ adults: 1 });
  });
  it("posts the search to the gateway with the token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    await searchGroupFares({ from: "LHE", to: "DMM", date: "2026-11-13", adults: 2 }, { baseUrl: "http://gw", accessToken: "t", fetchImpl });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://gw/v1/group-ticketing/search");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ origin: "LHE", destination: "DMM", departure_date: "2026-11-13", adults: 2 });
    expect(init.headers.Authorization).toBe("Bearer t");
    const down = vi.fn().mockResolvedValue(new Response("{}", { status: 503 }));
    await expect(searchGroupFares({ from: "LHE", to: "DMM", date: "2026-11-13", adults: 1 }, { baseUrl: "http://gw", accessToken: "t", fetchImpl: down }))
      .rejects.toMatchObject({ kind: "unavailable", message: expect.stringMatching(/Group fares/) });
  });
});
