import { describe, expect, it } from "vitest";
import {
  extractAvailableSectors,
  filterGroupTickets,
  filterGroupTicketsByDateRange,
  getSupplierGCode,
  groupTicketDestinationCode,
  groupTicketOriginCode,
  groupTicketWhatsAppMessage,
  normalizeGroupTicket,
  type GroupTicket,
} from "./group-ticketing";

describe("normalizeGroupTicket", () => {
  it("keeps connected one-way legs without inventing a return date", () => {
    const group = normalizeGroupTicket({
      id: 2879,
      sector: "ISB-MCT-JED",
      type: "KSA ONEWAY",
      dept_date: "2026-06-12",
      arv_date: "2026-06-12",
      details: [
        { id: 1, sr: 1, flight_no: "OV-564", flight_date: "2026-06-12", origin: "ISLAMABAD", destination: "MUSCAT", dept_time: "03:30:00", arv_time: "05:45:00" },
        { id: 2, sr: 2, flight_no: "OV-283", flight_date: "2026-06-12", origin: "MUSCAT", destination: "JEDDAH", dept_time: "08:30:00", arv_time: "11:00:00" },
      ],
    });

    expect(group.tripType).toBe("one-way");
    expect(group.returnDate).toBeUndefined();
    expect(group.itinerary).toHaveLength(2);
  });

  it("derives a return date from the final leg of a round trip", () => {
    const group = normalizeGroupTicket({
      id: 3001,
      sector: "LHE-MED-LHE",
      type: "UMRAH",
      price: 160000,
      details: [
        { id: 1, sr: 1, flight_no: "PK-747", flight_date: "2026-06-12", origin: "LHE", destination: "MED", baggage: "30+07 KG", dept_time: "22:15:00", arv_time: "01:30:00" },
        { id: 2, sr: 2, flight_no: "PK-760", flight_date: "2026-07-02", origin: "JED", destination: "LHE", baggage: "30+07 KG", dept_time: "12:10:00", arv_time: "19:20:00" },
      ],
    });

    expect(group.tripType).toBe("round-trip");
    expect(group.returnDate).toBe("2026-07-02");
    expect(group.itinerary?.map((leg) => leg.flightNumber)).toEqual(["PK-747", "PK-760"]);
    expect(groupTicketWhatsAppMessage("Group Collection 1", group)).toContain("2026-07-02: JED to LHE");
  });
});

describe("group ticket route helpers", () => {
  const sample: GroupTicket = {
    id: "1",
    sector: "ISB-MCT-JED",
    departureDate: "2026-07-04",
    itinerary: [
      { origin: "ISLAMABAD", destination: "MUSCAT", flightDate: "2026-07-04" },
      { origin: "MUSCAT", destination: "JEDDAH", flightDate: "2026-07-04" },
    ],
  };

  it("resolves city names and sector codes", () => {
    expect(groupTicketOriginCode(sample)).toBe("ISB");
    expect(groupTicketDestinationCode(sample)).toBe("JED");
  });
});

describe("filterGroupTickets", () => {
  const sample: GroupTicket[] = [
    { id: "1", departureDate: "2026-06-10", sector: "ISB-JED", itinerary: [{ origin: "ISLAMABAD", destination: "JEDDAH" }] },
    { id: "2", departureDate: "2026-06-20", sector: "LHE-DXB", itinerary: [{ origin: "LHE", destination: "DXB" }] },
    { id: "3", itinerary: [{ flightDate: "2026-07-01", origin: "ISB", destination: "MED" }], sector: "ISB-MED" },
  ];

  it("returns all tickets when no filters are provided", () => {
    expect(filterGroupTickets(sample)).toHaveLength(3);
  });

  it("filters tickets by route and exact departure date", () => {
    expect(filterGroupTickets(sample, { from: "ISB", to: "JED", dateFrom: "2026-06-10" })).toEqual([sample[0]]);
    expect(filterGroupTickets(sample, { from: "LHE", to: "DXB" })).toEqual([sample[1]]);
    expect(filterGroupTickets(sample, { dateFrom: "2026-07-01" })).toEqual([sample[2]]);
  });
});

describe("filterGroupTicketsByDateRange", () => {
  const sample: GroupTicket[] = [
    { id: "1", departureDate: "2026-06-10", sector: "ISB-JED" },
    { id: "2", departureDate: "2026-06-20", sector: "LHE-DXB" },
    { id: "3", itinerary: [{ flightDate: "2026-07-01", origin: "ISB", destination: "MED" }], sector: "ISB-MED" },
  ];

  it("returns all tickets when no dates are provided", () => {
    expect(filterGroupTicketsByDateRange(sample)).toHaveLength(3);
  });

  it("filters tickets by date from and date to", () => {
    expect(filterGroupTicketsByDateRange(sample, "2026-06-15", "2026-07-01")).toEqual([
      sample[1],
      sample[2],
    ]);
  });
});
describe("getSupplierGCode", () => {
  it("maps suppliers to G1-G5 public codes correctly", () => {
    expect(getSupplierGCode({ id: "alhaider-123", provider: "alhaider" })).toBe("G1");
    expect(getSupplierGCode({ id: "dhilluandsahi-456", provider: "dhilluandsahi" })).toBe("G2");
    expect(getSupplierGCode({ id: "skypass-789", provider: "skypass" })).toBe("G3");
    expect(getSupplierGCode({ id: "travelntours-101", provider: "travelntours" })).toBe("G4");
    expect(getSupplierGCode({ id: "other-999", provider: "unknown" })).toBe("G5");
  });
});

describe("extractAvailableSectors", () => {
  it("extracts and sorts sectors dynamically by popularity", () => {
    const sample: GroupTicket[] = [
      { id: "1", sector: "LHE-JED" },
      { id: "2", sector: "LHE-JED" },
      { id: "3", sector: "SKT-JED" },
      { id: "4", sector: "LHE-DXB" },
    ];

    const sectors = extractAvailableSectors(sample);
    expect(sectors).toHaveLength(3);
    expect(sectors[0].sector).toBe("LHE-JED");
    expect(sectors[0].count).toBe(2);
    expect(sectors[0].label).toBe("LHE → JED");
  });
});

describe("roundtrip destination resolution", () => {
  it("resolves outbound destination for roundtrip tickets", () => {
    const sample: GroupTicket = {
      id: "rt-1",
      sector: "LHE-MED-LHE",
      tripType: "round-trip",
      returnDate: "2026-07-02",
      itinerary: [
        { origin: "LHE", destination: "MED" },
        { origin: "JED", destination: "LHE" },
      ],
    };

    expect(groupTicketOriginCode(sample)).toBe("LHE");
    expect(groupTicketDestinationCode(sample)).toBe("MED");
  });
});
