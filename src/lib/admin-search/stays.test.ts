import { describe, expect, it } from "vitest";
import { buildIndex, type Airport } from "./airports";
import type { FlightView } from "./flights";
import { flightStays, gapMinutes, stayPlace, stopsBelowLine } from "./stays";

const airport = (iata: string, city: string, country: string): Airport => ({ iata, name: `${city} Airport`, city, country, countryCode: "XX", type: "large" });
const AIRPORTS = buildIndex([
  airport("LHE", "Lahore", "Pakistan"), airport("DOH", "Doha", "Qatar"), airport("DXB", "Dubai", "United Arab Emirates"),
  airport("ISB", "Islamabad", "Pakistan"), airport("KHI", "Karachi", "Pakistan"), airport("SIN", "Singapore", "Singapore"),
]);

const base: FlightView = { id: "f", fares: [], stop_cities: [], segments: [], stops: 0, duration_minutes: 210 };
const seg = (origin: string, destination: string, departure: string, arrival: string, layover?: number) =>
  ({ origin, destination, departure_local: departure, arrival_local: arrival, duration_minutes: 60, ...(layover === undefined ? {} : { layover_minutes: layover }) });

describe("flight stays (#85, #89)", () => {
  it("non-stop: no stays, 'Non-stop' under the line", () => {
    const flight = { ...base, segments: [seg("LHE", "DXB", "2026-12-05T03:00", "2026-12-05T05:30")] };
    expect(flightStays(flight, AIRPORTS)).toEqual([]);
    expect(stopsBelowLine(flight, [])).toBe("Non-stop");
  });

  it("1 stop: the stay's city, country, times and the gateway's layover minutes", () => {
    const flight = { ...base, stops: 1, stop_cities: ["DOH"], segments: [
      seg("LHE", "DOH", "2026-12-05T04:10", "2026-12-05T06:00"), seg("DOH", "DXB", "2026-12-05T08:45", "2026-12-05T11:00", 165),
    ] };
    const stays = flightStays(flight, AIRPORTS);
    expect(stays).toEqual([{ code: "DOH", city: "Doha", country: "Qatar", minutes: 165, arrival: "2026-12-05T06:00", departure: "2026-12-05T08:45" }]);
    expect(stayPlace(stays[0])).toBe("Doha, Qatar");
    expect(stopsBelowLine(flight, stays)).toBe("1 stop via Doha (02h 45m)");
  });

  it("2 stops, overnight stay worked out from local times when the layover isn't sent", () => {
    const flight = { ...base, stops: 2, stop_cities: ["ISB", "KHI"], segments: [
      seg("LHE", "ISB", "2026-12-05T06:00", "2026-12-05T07:00"), seg("ISB", "KHI", "2026-12-05T08:00", "2026-12-05T10:00"),
      seg("KHI", "DXB", "2026-12-06T01:30", "2026-12-06T03:40"),
    ] };
    const stays = flightStays(flight, AIRPORTS);
    expect(stays.map(stay => [stay.code, stay.minutes])).toEqual([["ISB", 60], ["KHI", 930]]);
    expect(stopsBelowLine(flight, stays)).toBe("2 stops via Islamabad (01h 00m), Karachi (15h 30m)");
  });

  it("times out of order give no stay time rather than a wrong one", () => {
    expect(gapMinutes("2026-12-05T10:00", "2026-12-05T09:00")).toBeNull();
    expect(gapMinutes(null, "2026-12-05T09:00")).toBeNull();
  });

  it("no segments: the stop airports from stop_cities, without a stay time", () => {
    const flight = { ...base, stops: 1, stop_cities: ["DOH"] };
    const stays = flightStays(flight, AIRPORTS);
    expect(stays).toEqual([{ code: "DOH", city: "Doha", country: "Qatar", minutes: null, arrival: null, departure: null }]);
    expect(stopsBelowLine(flight, stays)).toBe("1 stop via Doha");
    // segments missing entirely (an older gateway)
    expect(flightStays({ ...flight, segments: undefined } as unknown as FlightView, AIRPORTS)).toHaveLength(1);
  });

  it("never blank: unknown code falls back to the code; city = country shows once; list not loaded yet", () => {
    expect(stayPlace(flightStays({ ...base, stops: 1, stop_cities: ["ZZQ"] }, AIRPORTS)[0])).toBe("ZZQ");
    expect(stayPlace(flightStays({ ...base, stops: 1, stop_cities: ["SIN"] }, AIRPORTS)[0])).toBe("Singapore");
    expect(stayPlace(flightStays({ ...base, stops: 1, stop_cities: ["DOH"] }, null)[0])).toBe("DOH");
    expect(stopsBelowLine({ ...base, stops: 2, stop_cities: [] }, [])).toBe("2 stops");
    expect(stopsBelowLine({ ...base, stops: null }, [])).toBeNull();
  });
});
