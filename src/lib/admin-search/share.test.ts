import { describe, expect, it } from "vitest";
import { buildIndex, type Airport } from "./airports";
import type { FareView, FlightView, JourneyView } from "./flights";
import { flightShareMessage, whatsappShareUrl } from "./share";

const airport = (iata: string, city: string): Airport => ({ iata, name: `${city} Airport`, city, country: "X", countryCode: "XX", type: "large" });
const AIRPORTS = buildIndex([airport("LHE", "Lahore"), airport("DXB", "Dubai"), airport("DOH", "Doha")]);
const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });

const journey: JourneyView = { direction: "outbound", origin: "LHE", destination: "DXB", flights: [] };
const flight: FlightView = {
  id: "f2", airline_code: "QR", airline_name: "Qatar Airways", flight_number: "QR629", departure_local: "2026-12-05T04:10",
  arrival_local: "2026-12-05T11:00", duration_minutes: 470, stops: 1, stop_cities: ["DOH"], fares: [],
} as FlightView;
const fare: FareView = {
  id: "q", name: "Economy Classic", baggage: "7+30 kg", baggage_detail: "7 kg hand carry + 30 kg checked", meal: "Meal included",
  selling_price: rs(132_400), booking_mode: "request", supplier: "sooperfare", supplier_cost: rs(131_000),
} as FareView;
const ONE = { trip: "oneway" as const, adults: 1, children: 0, infants: 0 };

describe("Share on WhatsApp (#112)", () => {
  it("the flight details with the price, in plain lines", () => {
    expect(flightShareMessage({ journey, flight, fare }, ONE, AIRPORTS)).toBe([
      "Flight details from Travelian",
      "",
      "Qatar Airways QR629",
      "Lahore (LHE) to Dubai (DXB)",
      "Departs: Sat 5 Dec 2026, 04:10",
      "Arrives: Sat 5 Dec 2026, 11:00",
      "Duration: 07h 50m · 1 stop via DOH",
      "Fare: Economy Classic",
      "Baggage: 7 kg hand carry + 30 kg checked",
      "Meal: Meal included",
      "Price: Rs 132,400",
    ].join("\n"));
  });

  it("never includes the provider, supplier cost or margin", () => {
    const text = flightShareMessage({ journey, flight, fare }, ONE, AIRPORTS);
    expect(text).not.toMatch(/sooperfare|131,000|supplier|margin/i);
  });

  it("more than one traveler: the gateway's price says per adult (no maths on the page)", () => {
    expect(flightShareMessage({ journey, flight, fare }, { ...ONE, adults: 2, children: 1 }, AIRPORTS)).toContain("Price: Rs 132,400 per adult");
  });

  it("missing meal, baggage, price and airport names: clean fallbacks, never null or undefined", () => {
    const bare = { ...fare, meal: null, baggage: null, baggage_detail: null, selling_price: null } as FareView;
    const text = flightShareMessage({ journey, flight: { ...flight, duration_minutes: null, stops: null, airline_name: null }, fare: bare }, ONE, null);
    expect(text).toContain("QR QR629");
    expect(text).toContain("LHE to DXB");
    expect(text).toContain("Meal: No Meal");
    expect(text).toContain("Baggage: Check with airline");
    expect(text).not.toMatch(/Price:|Duration:|null|undefined/);
  });

  it("round trip says which flight it is", () => {
    const back = { ...journey, direction: "return" as const, origin: "DXB", destination: "LHE" };
    expect(flightShareMessage({ journey: back, flight, fare }, { ...ONE, trip: "roundtrip" }, AIRPORTS)).toContain("\nReturn flight\nQatar Airways QR629\nDubai (DXB) to Lahore (LHE)");
  });

  it("opens WhatsApp with the whole message encoded", () => {
    const url = whatsappShareUrl("A & B\nRs 1,000");
    expect(url).toBe("https://wa.me/?text=A%20%26%20B%0ARs%201%2C000");
  });
});
