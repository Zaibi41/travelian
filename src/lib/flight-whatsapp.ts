// One WhatsApp message per flight on the results (#53): the flight number(s), date, route and cabin of each journey and
// the lowest price shown on the card (as the gateway sent it; nothing is worked out here). No supplier or internal labels.

export type WhatsAppJourney = {
  /** "Outbound", "Return", "Flight 1"…; empty for a one-way trip. */
  label: string;
  flightNumbers: string[];
  origin: string;
  destination: string;
  /** "Dec 08, 2026". */
  date: string;
};

export function flightHelpMessage({ airline, journeys, cabin, lowestPrice }: {
  airline: string; journeys: WhatsAppJourney[]; cabin: string; lowestPrice: string;
}): string {
  const lines = ["Hello Travelian,", "", "I have a question about this flight:", "", `Airline: ${airline}`];
  for (const journey of journeys) {
    const prefix = journeys.length > 1 && journey.label ? `${journey.label}: ` : "";
    const numbers = journey.flightNumbers.filter(Boolean);
    lines.push(`${prefix}${numbers.length ? `${numbers.join(" / ")}, ` : ""}${journey.origin} to ${journey.destination}, ${journey.date}`);
  }
  if (cabin) lines.push(`Cabin: ${cabin}`);
  if (lowestPrice) lines.push(`Lowest fare shown: ${lowestPrice}`);
  lines.push("", "Please guide me with booking details.");
  return lines.join("\n");
}
