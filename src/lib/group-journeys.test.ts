import { afterEach, describe, expect, it, vi } from "vitest";
import { groupJourneys, groupStopText, legArrivalDate } from "./group-journeys";
import type { GroupTicket } from "./group-ticketing";
import { groupTicketDestinationCode } from "./group-ticketing";
import { groupTicketToFlight } from "./provider-systems";
import { searchPublicGroups } from "./public-booking";

// The gateway's public search answer for LHE → JED, read 22 Nov 2026 (#152): SalamAir one-way via Muscat (Al Haider),
// an Airblue return (Dhillu & Sahi) and a Saudia ticket that names only the carrier code.
const money = { amount_minor: 9_000_000, currency: "PKR" };
const leg = (over: Record<string, unknown>) => ({ direction: "outbound", baggage: "20", hand_carry: "5", meal: "No", ...over });
const LIVE = {
  data: [
    { id: "g1", sector: "LHE - MCT - JED", airline: "SALAM AIR", logo_url: "/v1/logos/a", tickets: [{
      id: "t1", sector: "LHE - MCT - JED", airline: "SALAM AIR", flight_number: "OV522", departure_date: "2026-11-27", departure_time: "03:25",
      ticket_type: "KSA ONEWAY", selling_price: money, legs: [
        leg({ flight_number: "OV522", origin: "LHE", destination: "MCT", departure_date: "2026-11-27", departure_time: "03:25", arrival_time: "05:40" }),
        leg({ flight_number: "OV283", origin: "MCT", destination: "JED", departure_date: "2026-11-27", departure_time: "08:40", arrival_time: "11:10" }),
      ] }] },
    { id: "g2", sector: "LHE - JED", airline: "PA", logo_url: "/v1/logos/b", tickets: [{
      id: "t2", sector: "LHE - JED", airline: "PA", flight_number: "PA470", departure_date: "2026-12-02", departure_time: "23:00",
      ticket_type: "2", selling_price: money, legs: [
        leg({ flight_number: "PA470", origin: "LHE", destination: "JED", departure_date: "2026-12-02", departure_time: "23:00", arrival_date: "2026-12-03", arrival_time: "03:15" }),
        leg({ direction: "return", flight_number: "PA471", origin: "JED", destination: "LHE", departure_date: "2026-12-22", departure_time: "04:30", arrival_date: "2026-12-22", arrival_time: "11:35" }),
      ] }] },
    { id: "g3", sector: "LHE - JED", airline: "SV", tickets: [{
      id: "t3", sector: "LHE - JED", airline: "SV", flight_number: "SV739", departure_date: "2026-12-04", departure_time: "04:00", selling_price: money,
      legs: [leg({ flight_number: "SV739", origin: "LHE", destination: "JED", departure_date: "2026-12-04", departure_time: "04:00", arrival_time: "07:10" })] }] },
  ],
};

async function live(): Promise<GroupTicket[]> {
  vi.stubEnv("VITE_TRAVELIAN_GATEWAY_BASE_URL", "https://gateway.test");
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(LIVE), { status: 200 })));
  return searchPublicGroups({ origin: "LHE", destination: "JED" });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("group journeys (#152)", () => {
  it("keeps a one-way connection as one outbound journey with 1 stop, final destination and last arrival", async () => {
    const [salam] = await live();
    expect(salam.tripType).toBe("one-way");
    expect(salam.returnDate).toBeUndefined();
    const journeys = groupJourneys(salam);
    expect(journeys).toHaveLength(1);
    expect(journeys[0]).toMatchObject({ direction: "outbound", origin: "LHE", destination: "JED", departureTime: "03:25", arrivalTime: "11:10",
      departureDate: "2026-11-27", arrivalDate: "2026-11-27", stops: 1, connections: [{ airport: "MCT", duration: "3h 0m" }] });
    expect(journeys[0].legs.map((l) => l.flightNumber)).toEqual(["OV522", "OV283"]);
    expect(groupStopText(journeys[0])).toBe("1 stop · via MCT (3h 0m)");
    expect(groupTicketDestinationCode(salam)).toBe("JED");
  });

  it("splits a return fare into outbound and return by the gateway's direction", async () => {
    const [, airblue] = await live();
    expect(airblue.tripType).toBe("round-trip");
    const [out, back] = groupJourneys(airblue);
    expect(out).toMatchObject({ direction: "outbound", origin: "LHE", destination: "JED", arrivalDate: "2026-12-03", stops: 0 });
    expect(back).toMatchObject({ direction: "return", origin: "JED", destination: "LHE", departureDate: "2026-12-22", stops: 0 });
    expect(groupStopText(out)).toBe("Direct");
    expect(groupTicketDestinationCode(airblue)).toBe("JED");
  });

  it("shows a carrier code as the airline's name, keeping the code", async () => {
    const [, , saudia] = await live();
    expect(saudia.airlineName).toBe("Saudia");
    expect(saudia.airlineCode).toBe("SV");
    const [salam] = await live();
    expect(salam.airlineName).toBe("SALAM AIR");
  });

  it("gives the flights page and checkout the connection and the right arrival day", async () => {
    const [salam, airblue] = await live();
    const flight = groupTicketToFlight(salam);
    expect(flight).toMatchObject({ origin: "LHE", destination: "JED", stops: 1, arrivalTime: "2026-11-27 11:10" });
    expect(flight.layovers).toEqual([{ location: "MCT", duration: "3h 0m", nextFlightNumber: "OV283" }]);
    expect(flight.segments?.map((s) => s.flightNumber)).toEqual(["OV522", "OV283"]);
    expect(groupTicketToFlight(airblue).segments?.[0].arrivalTime).toBe("2026-12-03 03:15");
    expect(groupTicketToFlight(airblue).layovers).toBeUndefined();
  });

  it("works out a two-stop journey and missing times", () => {
    const ticket: GroupTicket = { id: "x", tripType: "one-way", itinerary: [
      { direction: "outbound", origin: "ISB", destination: "MCT", flightDate: "2026-12-01", departureTime: "22:00", arrivalTime: "00:10" },
      { direction: "outbound", origin: "MCT", destination: "DXB", flightDate: "2026-12-02", departureTime: "02:00", arrivalTime: "03:00" },
      { direction: "outbound", origin: "DXB", destination: "DMM", flightDate: "2026-12-02" },
    ] };
    const [journey] = groupJourneys(ticket);
    expect(journey.connections).toEqual([{ airport: "MCT", duration: "1h 50m" }, { airport: "DXB", duration: undefined }]);
    expect(groupStopText(journey)).toBe("2 stops · via MCT (1h 50m), DXB");
    expect(legArrivalDate(ticket.itinerary![0])).toBe("2026-12-02"); // lands after midnight
  });

  it("reads older data without directions: a connection stays outbound, a round trip turns back", () => {
    const connecting: GroupTicket = { id: "a", tripType: "one-way", sector: "LHE-MCT-JED", itinerary: [
      { origin: "LHE", destination: "MCT" }, { origin: "MCT", destination: "JED" }] };
    expect(groupJourneys(connecting).map((j) => j.direction)).toEqual(["outbound"]);
    const roundTrip: GroupTicket = { id: "b", tripType: "round-trip", sector: "LHE-MCT-JED-MCT-LHE", itinerary: [
      { origin: "LHE", destination: "MCT" }, { origin: "MCT", destination: "JED" }, { origin: "JED", destination: "MCT" }, { origin: "MCT", destination: "LHE" }] };
    expect(groupJourneys(roundTrip).map((j) => [j.direction, j.origin, j.destination, j.stops])).toEqual([["outbound", "LHE", "JED", 1], ["return", "JED", "LHE", 1]]);
    expect(groupJourneys({ id: "c" })).toEqual([]);
  });
});
