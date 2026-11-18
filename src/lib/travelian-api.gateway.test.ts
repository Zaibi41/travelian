import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GATEWAY_FLIGHT_PROVIDER, gatewayOffers, searchFlights } from "./travelian-api";
import { isGroupTicketingProvider } from "./provider-systems";

const fare = (id: string, name: string, rupees: number) => ({ id, name, baggage: "20 kg checked", selling_price: { amount_minor: rupees * 100, currency: "PKR" } });
const flight = (id: string, code: string, number: string, dep: string, fares: ReturnType<typeof fare>[]) => ({
  id, airline_code: code, airline_name: code === "PA" ? "Airblue" : "PIA", flight_number: number,
  departure_local: dep, arrival_local: dep.replace(/T(\d\d)/, (_, h) => `T${String(Number(h) + 2).padStart(2, "0")}`), duration_minutes: 120, stops: 0, fares,
});

describe("flights through the gateway", () => {
  beforeEach(() => vi.stubEnv("VITE_TRAVELIAN_GATEWAY_BASE_URL", "https://api.example.test"));
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("one-way: one offer per priced flight, fares as options, cheapest first", () => {
    const offers = gatewayOffers({ search_id: "s", status: "complete", journeys: [{ direction: "outbound", origin: "KHI", destination: "LHE", flights: [
      flight("f1", "PA", "PA400", "2026-12-12T08:00", [fare("a", "Xtra", 25050), fare("b", "Value", 22050)]),
      flight("f2", "PK", "PK302", "2026-12-12T09:00", [{ id: "c", name: "Lite" } as never]),
    ] }] }, "Economy");
    expect(offers).toHaveLength(1); // a flight without a selling price is not offered
    expect(offers[0]).toMatchObject({ provider: GATEWAY_FLIGHT_PROVIDER, flightNumber: "PA400", duration: "2h 0m", fareBrand: "Value", price: { total: 22050 } });
    expect(offers[0].fareOptions?.map((o) => o.tier)).toEqual(["Value", "Xtra"]);
  });

  it("round trip: pairs each outbound with the cheapest return of the same airline only", () => {
    const offers = gatewayOffers({ search_id: "s", status: "complete", journeys: [
      { direction: "outbound", origin: "KHI", destination: "LHE", flights: [flight("o1", "PA", "PA400", "2026-12-12T08:00", [fare("a", "Value", 22050)]),
                                                                            flight("o2", "PK", "PK302", "2026-12-12T09:00", [fare("b", "Lite", 24000)])] },
      { direction: "return", origin: "LHE", destination: "KHI", flights: [flight("r1", "PA", "PA401", "2026-12-15T11:00", [fare("c", "Value", 23000)]),
                                                                          flight("r2", "PA", "PA407", "2026-12-15T19:00", [fare("d", "Value", 21000)])] },
    ] }, "Economy");
    expect(offers).toHaveLength(1); // PIA has no return on PIA: not offered as a round trip
    expect(offers[0]).toMatchObject({ flightNumber: "PA400", returnDepartureTime: "2026-12-15T19:00", price: { total: 22050 + 21000 } });
  });

  it("searches the gateway's public route with the trip, never the old API, and keeps airport times", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ search_id: "s1", status: "complete", journeys: [
      { direction: "outbound", origin: "KHI", destination: "LHE", flights: [flight("f1", "PA", "PA400", "2026-12-12T08:00", [fare("a", "Value", 22050)])] },
    ] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await searchFlights({ tripType: "oneway", from: "Karachi (KHI)", to: "LHE", departureDate: "2026-12-12", cabin: "Economy", currency: "PKR",
      passengers: { adults: 2, children: 1, infants: 0 } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/v1/public/flights/search");
    expect(JSON.parse(init.body)).toMatchObject({ origin: "KHI", destination: "LHE", departure_date: "2026-12-12", return_date: null, adults: 2, children: 1, cabin: "economy" });
    expect(result.flights[0]).toMatchObject({ provider: "travelian", flightNumber: "PA400", departureTime: "2026-12-12 08:00", price: 22050 });
  });

  it("the gateway label is never taken for a group fare", () => {
    expect(isGroupTicketingProvider(GATEWAY_FLIGHT_PROVIDER)).toBe(false);
  });
});
