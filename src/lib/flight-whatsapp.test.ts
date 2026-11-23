import { describe, expect, it } from "vitest";
import { flightHelpMessage } from "./flight-whatsapp";

describe("one WhatsApp message per flight (#53)", () => {
  it("one-way: flight numbers, route, date, cabin and the lowest price on the card", () => {
    const text = flightHelpMessage({ airline: "Etihad Airways", cabin: "Economy", lowestPrice: "PKR 150,000",
      journeys: [{ label: "Flight", flightNumbers: ["EY254", "EY11"], origin: "LHE", destination: "LHR", date: "Dec 10, 2026" }] });
    expect(text).toBe([
      "Hello Travelian,", "", "I have a question about this flight:", "", "Airline: Etihad Airways",
      "EY254 / EY11, LHE to LHR, Dec 10, 2026", "Cabin: Economy", "Lowest fare shown: PKR 150,000", "", "Please guide me with booking details.",
    ].join("\n"));
  });

  it("round trip: each journey on its own line with its label", () => {
    const text = flightHelpMessage({ airline: "PIA", cabin: "Economy", lowestPrice: "PKR 320,000", journeys: [
      { label: "Outbound", flightNumbers: ["PK757"], origin: "LHE", destination: "LHR", date: "Dec 10, 2026" },
      { label: "Return", flightNumbers: ["PK758"], origin: "LHR", destination: "LHE", date: "Dec 20, 2026" },
    ] });
    expect(text).toContain("Outbound: PK757, LHE to LHR, Dec 10, 2026\nReturn: PK758, LHR to LHE, Dec 20, 2026");
  });

  it("leaves out what is missing and never names a supplier", () => {
    const text = flightHelpMessage({ airline: "Airblue", cabin: "", lowestPrice: "", journeys: [{ label: "", flightNumbers: [], origin: "KHI", destination: "LHE", date: "Dec 12, 2026" }] });
    expect(text).toContain("KHI to LHE, Dec 12, 2026");
    expect(text).not.toMatch(/Cabin|Lowest|undefined|null|sooperfare|southair|AIRSIALAPI/i);
  });
});
