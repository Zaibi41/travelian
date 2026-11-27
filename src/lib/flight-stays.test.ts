import { describe, expect, it } from "vitest";
import { checkoutJourneys, durationMinutes, gapMinutes, journeyMinutes, minutesText, placeName, placeOf, stayAt, stayBetween, stopCountText, stopLine, stopSummary, viaText, type Place } from "./flight-stays";

// The shared airport list's shape (src/data/airports.json): city and full country name per code.
const AIRPORTS: Record<string, Place> = {
  AUH: { code: "AUH", city: "Abu Dhabi", country: "United Arab Emirates" },
  DOH: { code: "DOH", city: "Doha", country: "Qatar" },
  SIN: { code: "SIN", city: "Singapore", country: "Singapore" },
  UET: { code: "UET", city: "Quetta", country: "Pakistan" },
  XCT: { code: "XCT", city: "Cityonly" },
  LNG: { code: "LNG", city: "Santa Cruz de la Sierra del Norte Internacional", country: "Plurinational State of Bolivia" },
};
const lookup = (code: string) => AIRPORTS[code];

describe("where the passenger stays (#37, #119)", () => {
  it("names the city and country from the airport list, never blank or undefined", () => {
    expect(placeName("AUH", lookup)).toBe("Abu Dhabi, United Arab Emirates");
    expect(placeName(" auh ", lookup)).toBe("Abu Dhabi, United Arab Emirates");
    expect(placeName("SIN", lookup)).toBe("Singapore"); // city and country the same: once
    expect(placeName("XCT", lookup)).toBe("Cityonly"); // no country: the city
    expect(placeName("ZZZ", lookup)).toBe("ZZZ"); // unknown airport: the code
    expect(placeName(undefined, lookup)).toBe("");
    expect(placeName("undefined", lookup)).toBe("");
    expect(placeOf("ZZZ", lookup)).toEqual({ code: "ZZZ", city: "", country: "" });
  });

  it("stop count: Non-stop, 1 Stop, 2 Stops (#120)", () => {
    expect([0, 1, 2, 3, undefined, null, -1].map(stopCountText)).toEqual(["Non-stop", "1 Stop", "2 Stops", "3 Stops", "Non-stop", "Non-stop", "Non-stop"]);
  });

  it("the card line: count, then each stay's city and country (#119)", () => {
    expect(stopSummary(0, ["AUH"], lookup)).toEqual({ count: "Non-stop", places: "" });
    expect(stopSummary(1, ["AUH"], lookup)).toEqual({ count: "1 Stop", places: "Abu Dhabi, United Arab Emirates" });
    expect(stopSummary(2, ["AUH", "DOH"], lookup)).toEqual({ count: "2 Stops", places: "Abu Dhabi, United Arab Emirates · Doha, Qatar" });
    expect(stopSummary(1, [], lookup)).toEqual({ count: "1 Stop", places: "" }); // stop airport not sent
    expect(stopSummary(1, [null, "", "ZZZ"], lookup).places).toBe("ZZZ");
    expect(stopLine(1, ["UET"], lookup)).toBe("1 Stop · Quetta, Pakistan");
    expect(stopLine(0, [], lookup)).toBe("Non-stop");
  });
});

describe("how long the passenger stays (#83, #84)", () => {
  it("formats minutes like flight durations", () => {
    expect([165, 45, 0, 990, undefined, null, -5, Number.NaN].map(minutesText)).toEqual(["2h 45m", "0h 45m", "0h 0m", "16h 30m", undefined, undefined, undefined, undefined]);
  });

  it("counts the time on the ground from the two local times at that airport", () => {
    expect(gapMinutes("2026-12-10 05:30", "2026-12-10 08:15")).toBe(165);
    expect(gapMinutes("2026-12-10T22:40", "2026-12-11T09:10")).toBe(630); // overnight
    expect(gapMinutes("2026-12-10 05:30", "2026-12-10 04:00")).toBeUndefined(); // out of order: unknown, not negative
    expect(gapMinutes("", "2026-12-10 04:00")).toBeUndefined();
    expect(gapMinutes("TBA", "TBA")).toBeUndefined();
  });

  it("a stay between two flights: airport, city, country, duration and times", () => {
    const stay = stayBetween(
      { origin: "LHE", destination: "AUH", flightNumber: "EY254", arrivalTime: "2026-12-10 05:30" },
      { origin: "AUH", destination: "LHR", flightNumber: "EY11", departureTime: "2026-12-10 08:15" },
      undefined, lookup);
    expect(stay).toEqual({ code: "AUH", city: "Abu Dhabi", country: "United Arab Emirates", place: "Abu Dhabi, United Arab Emirates",
      duration: "2h 45m", arrivalTime: "2026-12-10 05:30", departureTime: "2026-12-10 08:15" });
    expect(JSON.stringify(stay)).not.toMatch(/EY254|EY11/); // no flight name or number in the stay (#122)
  });

  it("falls back to the gateway's stay time, then to nothing (shown as TBA)", () => {
    const before = { origin: "LHE", destination: "DOH" };
    const after = { origin: "DOH", destination: "LHR" };
    expect(stayBetween(before, after, { location: "DOH", duration: "3h 5m" }, lookup).duration).toBe("3h 5m");
    expect(stayBetween(before, after, undefined, lookup).duration).toBeUndefined();
    expect(stayBetween({ destination: "ZZZ" }, {}, undefined, lookup)).toMatchObject({ code: "ZZZ", city: "", country: "", place: "ZZZ" });
  });

  it("a stay known only by its airport (stop city without each flight)", () => {
    expect(stayAt({ location: "uet" }, lookup)).toEqual({ code: "UET", city: "Quetta", country: "Pakistan", place: "Quetta, Pakistan",
      duration: undefined, arrivalTime: undefined, departureTime: undefined });
    expect(stayAt({ location: "LNG", duration: "1h 0m" }, lookup).place).toBe("Santa Cruz de la Sierra del Norte Internacional, Plurinational State of Bolivia");
  });
});

describe("a journey's total time across time zones", () => {
  it("reads durations", () => {
    expect(["2h 45m", "45m", "2h", "0h 0m", "", "TBA", undefined].map(durationMinutes)).toEqual([165, 45, 120, 0, undefined, undefined, undefined]);
  });
  it("adds each flight's flying time and the stays (LHE 03:00 -> AUH -> LHR 12:30 local is 14h 30m, not 9h 30m)", () => {
    expect(journeyMinutes([
      { duration: "3h 30m", arrivalTime: "2026-12-10 05:30" },
      { duration: "8h 15m", departureTime: "2026-12-10 08:15" },
    ])).toBe(870);
    expect(journeyMinutes([{ duration: "7h 30m" }])).toBe(450);
    expect(journeyMinutes([{ duration: "3h 30m" }, { duration: undefined }])).toBeUndefined();
    expect(journeyMinutes([{ duration: "3h", arrivalTime: "TBA" }, { duration: "1h", departureTime: "TBA" }])).toBeUndefined();
    expect(journeyMinutes([])).toBeUndefined();
  });
});

describe("checkout journey durations (#153)", () => {
  const seg = (origin: string, destination: string, dep: string, arr: string, duration?: string) =>
    ({ origin, destination, departureTime: dep, arrivalTime: arr, departureTimestamp: dep, arrivalTimestamp: arr, duration });

  it("uses the flight's own time, not local arrival minus local departure (LHE +5 -> DXB +4)", () => {
    // 11:50 PKT -> 14:35 GST is 3h 45m; the clocks alone say 2h 45m.
    expect(checkoutJourneys([seg("LHE", "DXB", "2026-12-08 11:50", "2026-12-08 14:35", "3h 45m")], { destination: "DXB", trip: "oneway" }))
      .toEqual([{ label: "", duration: "3h 45m", stops: 0, stopText: "Non-stop" }]);
  });

  it("works westbound where the local arrival clock is before the departure clock (DXB -> LHE is fine, DXB -> JFK)", () => {
    expect(checkoutJourneys([seg("DXB", "JFK", "2026-12-08 08:00", "2026-12-08 07:30", "14h 30m")])[0].duration).toBe("14h 30m");
    expect(checkoutJourneys([seg("DXB", "LHE", "2026-12-08 16:00", "2026-12-08 20:10", "3h 10m")])[0].duration).toBe("3h 10m");
  });

  it("adds the stay between flights for a 1-stop trip (LHE -> DXB -> IST)", () => {
    const journeys = checkoutJourneys([
      seg("LHE", "DXB", "2026-12-08 11:50", "2026-12-08 14:35", "3h 45m"),
      seg("DXB", "IST", "2026-12-08 16:35", "2026-12-08 20:35", "5h 0m"),
    ], { destination: "IST", trip: "oneway" });
    expect(journeys).toEqual([{ label: "", duration: "10h 45m", stops: 1, stopText: "1 Stop" }]);
  });

  it("splits a round trip at the destination and gives each direction its own time and stops", () => {
    const journeys = checkoutJourneys([
      seg("LHE", "DXB", "2026-12-08 11:50", "2026-12-08 14:35", "3h 45m"),
      seg("DXB", "LHE", "2026-12-15 16:00", "2026-12-15 20:10", "3h 10m"),
    ], { destination: "DXB", trip: "roundtrip" });
    expect(journeys.map((j) => `${j.label} ${j.duration} ${j.stopText}`)).toEqual(["Outbound 3h 45m Non-stop", "Return 3h 10m Non-stop"]);
  });

  it("splits a multi-city trip where the passenger stays a day or more", () => {
    const journeys = checkoutJourneys([
      seg("LHE", "DXB", "2026-12-08 11:50", "2026-12-08 14:35", "3h 45m"),
      seg("DXB", "IST", "2026-12-12 09:00", "2026-12-12 13:00", "5h 0m"),
    ], { trip: "multicity" });
    expect(journeys.map((j) => j.label)).toEqual(["Flight 1", "Flight 2"]);
  });

  it("leaves the time out (never a wrong one) when a flight's duration is missing", () => {
    expect(checkoutJourneys([seg("LHE", "DXB", "2026-12-08 11:50", "2026-12-08 14:35")])[0].duration).toBeUndefined();
    expect(checkoutJourneys([])).toEqual([]);
  });
});

describe("the card's stops under the stop count, as on the admin booking", () => {
  const stay = (city: string, code: string, duration?: string) => ({ code, city, country: "", place: city || code, duration });
  it("names each stop with how long, the time only when known", () => {
    expect(viaText([stay("Jeddah", "JED", "6h 35m")])).toBe("via Jeddah (6h 35m)");
    expect(viaText([stay("Doha", "DOH", "2h 30m"), stay("Kinshasa", "FIH", "9h 40m")])).toBe("via Doha (2h 30m), Kinshasa (9h 40m)");
    expect(viaText([stay("Multan", "MUX")])).toBe("via Multan");
    expect(viaText([stay("", "XYZ", "1h 0m")])).toBe("via XYZ (1h 0m)");
    expect(viaText([])).toBe("");
  });
});
