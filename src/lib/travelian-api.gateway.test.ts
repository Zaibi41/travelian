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

  it("keeps each flight of a connection and where and how long the passenger stays (#37, #83, #84)", () => {
    const twoStops = { ...flight("f1", "EY", "EY254 / EY11 / EY19", "2026-12-12T03:00", [fare("a", "Saver", 90000)]), stops: 2, stop_cities: ["AUH", "DOH"],
      duration_minutes: 900, segments: [
        { flight_number: "EY254", origin: "LHE", destination: "AUH", departure_local: "2026-12-12T03:00", arrival_local: "2026-12-12T05:30", duration_minutes: 210 },
        { flight_number: "EY11", origin: "AUH", destination: "DOH", departure_local: "2026-12-12T08:15", arrival_local: "2026-12-12T08:30", duration_minutes: 75, layover_minutes: 165 },
        { flight_number: "EY19", origin: "DOH", destination: "LHR", departure_local: "2026-12-12T10:00", arrival_local: "2026-12-12T15:00", duration_minutes: 420, layover_minutes: 90 },
      ] };
    const [offer] = gatewayOffers({ search_id: "s", status: "complete", journeys: [{ direction: "outbound", origin: "LHE", destination: "LHR", flights: [twoStops] }] }, "Economy");
    expect(offer.stops).toBe(2);
    expect(offer.segments?.map((s) => [s.flightNumber, s.origin, s.destination, s.duration])).toEqual([
      ["EY254", "LHE", "AUH", "3h 30m"], ["EY11", "AUH", "DOH", "1h 15m"], ["EY19", "DOH", "LHR", "7h 0m"]]);
    expect(offer.layovers).toEqual([
      { location: "AUH", duration: "2h 45m", arrivalTime: "2026-12-12T05:30", departureTime: "2026-12-12T08:15", nextFlightNumber: "EY11" },
      { location: "DOH", duration: "1h 30m", arrivalTime: "2026-12-12T08:30", departureTime: "2026-12-12T10:00", nextFlightNumber: "EY19" }]);
  });

  it("each flight of a connection has its own airline, and a codeshare names the airline that flies it", () => {
    const tk = { ...flight("f1", "TK", "TK715 / TK8050", "2026-12-05T06:00", [fare("a", "Economy", 150000)]), airline_name: "Turkish Airlines",
      stops: 1, stop_cities: ["IST"], segments: [
        { flight_number: "TK715", airline_code: "TK", airline_name: "Turkish Airlines", origin: "LHE", destination: "IST", departure_local: "2026-12-05T06:00", arrival_local: "2026-12-05T10:30" },
        { flight_number: "TK8050", airline_code: "TK", operating_code: "EY", operating_name: "Etihad Airways", origin: "IST", destination: "AUH",
          departure_local: "2026-12-05T13:55", arrival_local: "2026-12-05T19:25", layover_minutes: 205 },
      ] };
    const [offer] = gatewayOffers({ search_id: "s", status: "complete", journeys: [{ direction: "outbound", origin: "LHE", destination: "AUH", flights: [tk] }] }, "Economy");
    expect(offer.segments?.map((s) => [s.carrier, s.airline, s.operatingCarrier, s.operatingAirline])).toEqual([
      ["TK", "Turkish Airlines", null, null], ["TK", "Turkish Airlines", "EY", "Etihad Airways"]]);
    const mixed = { ...flight("f2", "PK", "PK303 / EY11", "2026-12-05T06:00", [fare("a", "Economy", 150000)]), stops: 1, stop_cities: ["AUH"], segments: [
      { flight_number: "PK303", airline_code: "PK", origin: "LHE", destination: "AUH" }, { flight_number: "EY11", airline_code: "EY", origin: "AUH", destination: "LHR" }] };
    const [both] = gatewayOffers({ search_id: "s", status: "complete", journeys: [{ direction: "outbound", origin: "LHE", destination: "LHR", flights: [mixed] }] }, "Economy");
    expect(both.segments?.map((s) => [s.carrier, s.airline])).toEqual([["PK", "PIA"], ["EY", "Etihad Airways"]]);
  });

  it("without flight-by-flight detail: the stop city alone, and one segment with the flight's own duration", () => {
    const oneStop = { ...flight("f1", "PA", "PA200", "2026-12-12T08:00", [fare("a", "Value", 22050)]), stops: 1, stop_cities: ["MUX"] };
    const [offer] = gatewayOffers({ search_id: "s", status: "complete", journeys: [{ direction: "outbound", origin: "KHI", destination: "LHE", flights: [oneStop] }] }, "Economy");
    expect(offer.layovers).toEqual([{ location: "MUX" }]);
    expect(offer.segments).toHaveLength(1);
    expect(offer.segments?.[0]).toMatchObject({ origin: "KHI", destination: "LHE", duration: "2h 0m" });
    const [direct] = gatewayOffers({ search_id: "s", status: "complete", journeys: [{ direction: "outbound", origin: "KHI", destination: "LHE",
      flights: [flight("f2", "PA", "PA400", "2026-12-12T08:00", [fare("a", "Value", 22050)])] }] }, "Economy");
    expect(direct.layovers).toEqual([]);
  });

  it("round trip: outbound and return flights in order; the stays listed are the outbound's", () => {
    const out = { ...flight("o1", "EY", "EY254 / EY11", "2026-12-12T03:00", [fare("a", "Saver", 90000)]), stops: 1, stop_cities: ["AUH"], segments: [
      { flight_number: "EY254", origin: "LHE", destination: "AUH", departure_local: "2026-12-12T03:00", arrival_local: "2026-12-12T05:30" },
      { flight_number: "EY11", origin: "AUH", destination: "LHR", departure_local: "2026-12-12T08:15", arrival_local: "2026-12-12T12:30", layover_minutes: 165 }] };
    const back = { ...flight("r1", "EY", "EY12 / EY255", "2026-12-20T09:00", [fare("b", "Saver", 80000)]), stops: 1, stop_cities: ["AUH"], segments: [
      { flight_number: "EY12", origin: "LHR", destination: "AUH", departure_local: "2026-12-20T09:00", arrival_local: "2026-12-20T19:00" },
      { flight_number: "EY255", origin: "AUH", destination: "LHE", departure_local: "2026-12-20T21:00", arrival_local: "2026-12-21T01:30", layover_minutes: 120 }] };
    const [offer] = gatewayOffers({ search_id: "s", status: "complete", journeys: [
      { direction: "outbound", origin: "LHE", destination: "LHR", flights: [out] },
      { direction: "return", origin: "LHR", destination: "LHE", flights: [back] }] }, "Economy");
    expect(offer.segments?.map((s) => s.flightNumber)).toEqual(["EY254", "EY11", "EY12", "EY255"]);
    expect(offer.layovers?.map((l) => [l.location, l.duration])).toEqual([["AUH", "2h 45m"]]);
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

  it("#113: keeps the gateway's total for all travelers; a round trip adds its two totals; none when a leg has none", () => {
    const money = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
    const total = (id: string, name: string, adult: number, child: number) => ({
      ...fare(id, name, adult), total_price: money(adult * 2 + child),
      passenger_prices: [{ type: "ADT" as const, count: 2, selling_each: money(adult) }, { type: "CHD" as const, count: 1, selling_each: money(child) }],
    });
    const [oneWay] = gatewayOffers({ search_id: "s", status: "complete", journeys: [{ direction: "outbound", origin: "KHI", destination: "LHE",
      flights: [flight("o1", "PA", "PA400", "2026-12-10T08:00", [total("a", "Value", 21828, 19174), fare("b", "Xtra", 25000)])] }] }, "Economy");
    expect(oneWay.fareOptions?.[0]).toMatchObject({ tier: "Value", price: { total: 21828 }, allTravelersTotal: 62830, travelerCount: 3 });
    expect(oneWay.fareOptions?.[1].allTravelersTotal).toBeUndefined(); // the gateway sent no total: none is made up

    const [roundTrip] = gatewayOffers({ search_id: "s", status: "complete", journeys: [
      { direction: "outbound", origin: "KHI", destination: "LHE", flights: [flight("o1", "PA", "PA400", "2026-12-10T08:00", [total("a", "Value", 21828, 19174)])] },
      { direction: "return", origin: "LHE", destination: "KHI", flights: [flight("r1", "PA", "PA401", "2026-12-15T11:15", [total("c", "Value", 23746, 20613)])] },
    ] }, "Economy");
    expect(roundTrip.fareOptions?.[0]).toMatchObject({ price: { total: 21828 + 23746 }, allTravelersTotal: 62830 + 68105, travelerCount: 3 });

    const [mixed] = gatewayOffers({ search_id: "s", status: "complete", journeys: [
      { direction: "outbound", origin: "KHI", destination: "LHE", flights: [flight("o1", "PA", "PA400", "2026-12-10T08:00", [total("a", "Value", 21828, 19174)])] },
      { direction: "return", origin: "LHE", destination: "KHI", flights: [flight("r1", "PA", "PA401", "2026-12-15T11:15", [fare("c", "Value", 23746)])] },
    ] }, "Economy");
    expect(mixed.fareOptions?.[0].allTravelersTotal).toBeUndefined();
  });

  it("the gateway label is never taken for a group fare", () => {
    expect(isGroupTicketingProvider(GATEWAY_FLIGHT_PROVIDER)).toBe(false);
  });
});
