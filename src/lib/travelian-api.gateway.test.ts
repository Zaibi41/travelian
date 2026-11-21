import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GATEWAY_FLIGHT_PROVIDER, gatewayOffers, searchFlights } from "./travelian-api";
import { isGroupTicketingProvider } from "./provider-systems";
import { clearSession, setSession } from "./auth-session";

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

  it("round trip: each fare keeps the outbound and the return baggage separately for the Baggage tab (#123)", () => {
    const bag = (id: string, name: string, rupees: number, baggage: string, baggage_detail: string) =>
      ({ id, name, baggage, baggage_detail, selling_price: { amount_minor: rupees * 100, currency: "PKR" } });
    const [offer] = gatewayOffers({ search_id: "s", status: "complete", journeys: [
      { direction: "outbound", origin: "KHI", destination: "LHE", flights: [flight("o1", "PA", "PA400", "2026-12-12T08:00", [
        bag("a", "Value", 22050, "7 kg", "7 kg hand carry only, no checked bag"), bag("b", "Flexi", 25050, "7+20 kg", "7 kg hand carry + 20 kg checked")])] },
      { direction: "return", origin: "LHE", destination: "KHI", flights: [flight("r1", "PA", "PA401", "2026-12-15T11:00", [
        bag("c", "Value", 21000, "7+30 kg", "7 kg hand carry + 30 kg checked")])] },
    ] }, "Economy");
    expect(offer.fareOptions?.map((o) => [o.tier, o.bags, o.legBags])).toEqual([
      ["Value", "7 kg / 7+30 kg", [{ label: "Outbound", bags: "7 kg", bagsDetail: "7 kg hand carry only, no checked bag" },
                                   { label: "Return", bags: "7+30 kg", bagsDetail: "7 kg hand carry + 30 kg checked" }]],
      ["Flexi", "7+20 kg / 7+30 kg", [{ label: "Outbound", bags: "7+20 kg", bagsDetail: "7 kg hand carry + 20 kg checked" },
                                       { label: "Return", bags: "7+30 kg", bagsDetail: "7 kg hand carry + 30 kg checked" }]],
    ]);
    const [oneWay] = gatewayOffers({ search_id: "s", status: "complete", journeys: [{ direction: "outbound", origin: "KHI", destination: "LHE",
      flights: [flight("o1", "PA", "PA400", "2026-12-12T08:00", [fare("a", "Value", 22050)])] }] }, "Economy");
    expect(oneWay.fareOptions?.[0].legBags).toBeUndefined(); // one flight: the fare's own baggage is all there is
  });

  describe("signed in (admin and agency screens, #130)", () => {
    beforeEach(() => setSession({ email: "agency@example.invalid", name: "Agency", groups: ["agency_owner"], accessToken: "agency-token",
      createdAt: new Date().toISOString(), expiresAt: Date.now() + 60_000 }));
    afterEach(() => clearSession());
    const input = { tripType: "roundtrip" as const, from: "KHI", to: "Lahore (LHE)", departureDate: "2026-12-12", returnDate: "2026-12-15",
      cabin: "Premium Economy", currency: "PKR", passengers: { adults: 2, children: 0, infants: 1 } };
    // A super admin's answer: supplier fields present. Agency roles never get them (the gateway leaves them out); either
    // way the mapped flights carry none of them.
    const answer = { search_id: "s2", expires_at: "2026-12-12T08:15:00Z", status: "complete", providers: [{ name: "sooperfare", status: "responded" }], journeys: [
      { direction: "outbound", origin: "KHI", destination: "LHE", flights: [flight("o1", "PA", "PA400", "2026-12-12T08:00", [
        { ...fare("a", "Value", 22050), supplier: "sooperfare", supplier_cost: { amount_minor: 2_100_000, currency: "PKR" } } as ReturnType<typeof fare>])] },
      { direction: "return", origin: "LHE", destination: "KHI", flights: [flight("r1", "PA", "PA401", "2026-12-15T11:00", [fare("c", "Value", 23000)])] },
    ] };

    it("searches the signed-in route with the user's token, never the public route or the old API", async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(answer), { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);
      const result = await searchFlights(input, undefined, { signedIn: true });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://api.example.test/v1/live-ticketing/flights/search");
      expect(init.method).toBe("POST");
      expect(init.headers.Authorization).toBe("Bearer agency-token");
      expect(JSON.parse(init.body)).toEqual({ origin: "KHI", destination: "LHE", departure_date: "2026-12-12", return_date: "2026-12-15",
        adults: 2, children: 0, infants: 1, cabin: "premium_economy", currency: "PKR" });
      expect(result.searchId).toBe("s2");
      expect(result.flights).toHaveLength(1);
      expect(result.flights[0]).toMatchObject({ provider: GATEWAY_FLIGHT_PROVIDER, flightNumber: "PA400", price: 22050 + 23000, gatewaySearchId: "s2" });
      expect(result.flights[0].fareOptions?.[0]).toMatchObject({ tier: "Value", gatewayFareIds: ["a", "c"] });
      expect(JSON.stringify(result)).not.toMatch(/sooperfare|supplier|2100000|"providers"/i);
    });

    it("shows the gateway's sentence when the search fails, and a role refusal as a refusal", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "Search access denied." }), { status: 403 })));
      await expect(searchFlights(input, undefined, { signedIn: true })).rejects.toMatchObject({ kind: "forbidden" });
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "Pick a later date." }), { status: 422 })));
      await expect(searchFlights(input, undefined, { signedIn: true })).rejects.toThrow("Pick a later date.");
    });

    it("an unavailable answer has no flights", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ search_id: "s3", expires_at: "2026-12-12T08:15:00Z", status: "unavailable", journeys: [] }), { status: 200 })));
      expect((await searchFlights(input, undefined, { signedIn: true })).flights).toEqual([]);
    });

    it("without a session nothing is sent", async () => {
      clearSession();
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      await expect(searchFlights(input, undefined, { signedIn: true })).rejects.toMatchObject({ kind: "unauthorized" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("multi-city is refused before any call", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      await expect(searchFlights({ ...input, tripType: "multicity" }, undefined, { signedIn: true })).rejects.toThrow(/Multi-city/);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it("the gateway label is never taken for a group fare", () => {
    expect(isGroupTicketingProvider(GATEWAY_FLIGHT_PROVIDER)).toBe(false);
  });
});
