import { describe, expect, it } from "vitest";
import { groupTicketWhatsAppMessage, normalizeGroupTicket } from "./group-ticketing";

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
    expect(groupTicketWhatsAppMessage("Umrah", group)).toContain("2026-07-02 PK-760: JED to LHE");
  });
});
