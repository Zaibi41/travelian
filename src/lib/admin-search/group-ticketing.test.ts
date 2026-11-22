import { describe, expect, it, vi } from "vitest";
import { ticketBaggage, inventoryOptions, isCompleteSearch, parseGroupSearch, resultRows, searchGroupFares, sectorCodes, sourceLine, writeGroupSearch, type GroupInventory } from "./group-ticketing";

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
  it("baggage, hand carry first (#36): 0 checked + 7 -> 7 kg; 20 + 7 -> 7+20 kg; no checked value is not read as none; unknown says so", () => {
    const shown = (baggage: unknown, hand_carry: unknown) => ticketBaggage({ baggage, hand_carry }).short;
    expect(shown("0", "7")).toBe("7 kg");
    expect(shown(0, 7)).toBe("7 kg");
    expect(shown("", "7")).toBe("7 kg hand carry");
    expect(shown(null, "7")).toBe("7 kg hand carry");
    expect(shown("20", "7")).toBe("7+20 kg");
    expect(shown("30", "10")).toBe("10+30 kg");
    expect(shown("20 KG", null)).toBe("20 kg checked");
    expect(shown("", "")).toBe("Baggage: check with airline");
    expect(shown("see supplier", null)).toBe("Baggage: check with airline");
    expect(ticketBaggage({ baggage: "20", hand_carry: "7", baggage_label: "7+20 kg", baggage_detail: "7 kg hand carry + 20 kg checked" }).detail)
      .toBe("7 kg hand carry + 20 kg checked");
  });
  it("builds rows with the listing price, logo, flight number, meal and the return leg, earliest first, with an airline filter", () => {
    const rows = resultRows(GROUPS);
    expect(rows.map(row => row.id)).toEqual(["t2", "t1", "t3"]);
    expect(Object.keys(rows[0]).sort()).toEqual(["airline", "arrivalTime", "baggage", "canHold", "departureDate", "departureTime", "flightNumber", "id", "logoUrl",
      "holdUnavailableReason", "meal", "price", "returnLeg", "seatsLeft", "sector", "source", "stock"].sort());
    expect(rows[0]).toMatchObject({ logoUrl: "/v1/logos/abc", price: { amount_minor: 9_975_000, currency: "PKR" }, baggage: { short: "20 kg checked" }, returnLeg: null });
    expect(rows[2]).toMatchObject({ airline: "PIA", baggage: { short: "Baggage: check with airline", known: false } });
    const twoWay = resultRows([{ id: "g3", sector: "ISB - JED", tickets: [ticket("t4", {
      flight_number: "9P700", meal: "No", baggage: "20", hand_carry: "7", can_hold: true, stock: "supplier",
      legs: [{ direction: "outbound", flight_number: "9P700", baggage: "20", hand_carry: "7" },
        { direction: "return", flight_number: "9P701", origin: "JED", destination: "ISB", departure_date: "2026-12-06", departure_time: "11:05", baggage: "30", hand_carry: "10", meal: "No" }],
    })] }] as unknown as GroupInventory[])[0];
    expect(twoWay).toMatchObject({ flightNumber: "9P700", meal: "No", baggage: { short: "7+20 kg" }, canHold: true, stock: "supplier",
      returnLeg: { flightNumber: "9P701", route: "JED - ISB", departureTime: "11:05", baggage: { short: "10+30 kg", detail: "10 kg hand carry + 30 kg checked" }, meal: "No" } });
    expect(resultRows(GROUPS, "Serene Air").map(row => row.id)).toEqual(["t2"]);
  });
  it("Source line from the gateway's group_source; none when the gateway leaves it out (no supplier access)", () => {
    const source = { provider: "dhillu_sahi", provider_name: "Dhillu & Sahi", supplier_pnr: "41SDS4", supplier_group_id: "3056", supplier_ticket_id: "10817" };
    expect(sourceLine(source)).toBe("Dhillu & Sahi · PNR 41SDS4 · Group 3056");
    expect(sourceLine({ provider: "skypass", provider_name: "Skypass", supplier_pnr: "4D1HMQ-4RPD3R", supplier_ticket_id: "12116" })).toBe("Skypass · PNR 4D1HMQ-4RPD3R");
    expect(sourceLine(null)).toBeNull();
    const [withSource] = resultRows([{ id: "g4", sector: "LHE - DMM", tickets: [ticket("t5", { group_source: source })] }] as unknown as GroupInventory[]);
    expect(withSource.source).toBe("Dhillu & Sahi · PNR 41SDS4 · Group 3056");
    expect(resultRows(GROUPS).every(row => row.source === null)).toBe(true);
  });

  it("suggested routes and sector counts come from the merged listing: Kuwait (Dhillu & Sahi id 29) and Al Haider's connecting sectors", () => {
    const merged = [
      { id: "ds-9", sector: "LAHORE - DAMMAM", tickets: [ticket("a", { sector: "LHE - DMM" }), ticket("b", { sector: "LHE - DMM" })] },
      { id: "ds-29", sector: "LAHORE - KUWAIT", tickets: [ticket("c", { sector: "LHE - KWI" })] },
      { id: "ah-1", sector: "ISB - MCT - JED", tickets: [ticket("d", { sector: "ISB - MCT - JED", airline: "SALAM AIR" })] },
    ] as unknown as GroupInventory[];
    expect(inventoryOptions(merged).sectors).toEqual([
      { from: "LHE", to: "DMM", count: 2 }, { from: "ISB", to: "JED", count: 1 }, { from: "LHE", to: "KWI", count: 1 },
    ]);
  });

  it("a search runs with any one of From, To or date; From and To must differ", () => {
    expect(isCompleteSearch({ from: "LHE", adults: 1 })).toBe(true);
    expect(isCompleteSearch({ to: "DMM", adults: 1 })).toBe(true);
    expect(isCompleteSearch({ date: "2026-12-05", adults: 1 })).toBe(true);
    expect(isCompleteSearch({ from: "LHE", to: "DMM", date: "2026-12-05", adults: 1 })).toBe(true);
    expect(isCompleteSearch({ adults: 1 })).toBe(false);
    expect(isCompleteSearch({ from: "LHE", to: "LHE", adults: 1 })).toBe(false);
  });

  it("return rows carry both flights with times; one-way rows have no return", () => {
    const [back] = resultRows([{ id: "g9", sector: "ISB - JED", tickets: [ticket("r1", {
      sector: "ISB - JED", departure_date: "2026-12-02", departure_time: "06:40", flight_number: "9P700",
      legs: [{ direction: "outbound", flight_number: "9P700", origin: "ISB", destination: "JED", departure_date: "2026-12-02", departure_time: "06:40", arrival_time: "10:05" },
        { direction: "return", flight_number: "9P701", origin: "JED", destination: "ISB", departure_date: "2026-12-21", departure_time: "11:05", arrival_time: "18:05" }],
    })] }] as unknown as GroupInventory[]);
    expect(back).toMatchObject({ arrivalTime: "10:05", returnLeg: { flightNumber: "9P701", route: "JED - ISB", departureDate: "2026-12-21", departureTime: "11:05", arrivalTime: "18:05" } });
    const [one] = resultRows([{ id: "g8", sector: "LHE - DMM", tickets: [ticket("o1", {
      legs: [{ direction: "outbound", flight_number: "PF742", origin: "LHE", destination: "DMM", departure_time: "21:10", arrival_time: "23:45" }] })] }] as unknown as GroupInventory[]);
    expect(one).toMatchObject({ arrivalTime: "23:45", returnLeg: null });
  });

  it("a connecting one-way row shows every flight number and the last arrival, with no return (#152)", () => {
    const [row] = resultRows([{ id: "g7", sector: "LHE - MCT - JED", tickets: [ticket("c1", {
      sector: "LHE - MCT - JED", departure_date: "2026-11-27", departure_time: "03:25", flight_number: "OV522",
      legs: [{ direction: "outbound", flight_number: "OV522", origin: "LHE", destination: "MCT", departure_date: "2026-11-27", departure_time: "03:25", arrival_time: "05:40" },
        { direction: "outbound", flight_number: "OV283", origin: "MCT", destination: "JED", departure_date: "2026-11-27", departure_time: "08:40", arrival_time: "11:10" }],
    })] }] as unknown as GroupInventory[]);
    expect(row).toMatchObject({ sector: "LHE - MCT - JED", flightNumber: "OV522 / OV283", arrivalTime: "11:10", returnLeg: null });
  });

  it("the sector list comes from the listing, both directions where offered", () => {
    const listed = [{ id: "a", sector: "x", tickets: [ticket("1", { sector: "LHE - DMM" }), ticket("2", { sector: "DMM - LHE" }), ticket("3", { sector: "LHE - DMM" })] }] as unknown as GroupInventory[];
    expect(inventoryOptions(listed).sectors).toEqual([{ from: "LHE", to: "DMM", count: 2 }, { from: "DMM", to: "LHE", count: 1 }]);
  });

  it("posts empty fields as null", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    await searchGroupFares({ to: "DMM", adults: 1 }, { baseUrl: "http://gw", accessToken: "t", fetchImpl });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ origin: null, destination: "DMM", departure_date: null, adults: 1 });
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
