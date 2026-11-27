// Share on WhatsApp (#112): one fare of a search result as a plain message for the customer, with its price.
// Customer-facing: only what the customer may see (airline, flight, route, times, fare, baggage, meal and the selling
// price the gateway sent); never the provider, supplier cost or margin. The page computes no money: the price is the
// gateway's selling price as sent, per adult when more than one traveler is searched.

import { format, parseISO } from "date-fns";
import { formatMoney } from "@/lib/admin-bookings/format";
import { underBaggageLabel } from "@/lib/baggage";
import type { AirportIndex } from "./airports";
import { flightStays, stopsBelowLine } from "./stays";
import { airlineLabel, fareBaggage, formatDuration, type FareView, type FlightSearch, type FlightView, type JourneyView } from "./flights";

const clean = (value: unknown) => {
  const text = String(value ?? "").trim();
  return /^(null|undefined)$/i.test(text) ? "" : text;
};

/** "Lahore (LHE)", or the code when the airport list doesn't know it (or hasn't loaded). */
function airport(code: string, airports: AirportIndex | null) {
  const city = clean(airports?.byCode.get(code.toUpperCase())?.city);
  return city ? `${city} (${code})` : code;
}

function when(local?: string | null) {
  if (!local || local.length < 16) return null;
  const date = parseISO(local);
  return Number.isFinite(date.getTime()) ? `${format(date, "EEE d MMM yyyy")}, ${local.slice(11, 16)}` : null;
}

/** Whether the search is for more than one traveler (then the per-adult price says so). */
const severalTravelers = (request?: Pick<FlightSearch, "adults" | "children" | "infants">) =>
  Boolean(request && request.adults + request.children + request.infants > 1);

export function flightShareMessage(
  { journey, flight, fare }: { journey: JourneyView; flight: FlightView; fare: FareView },
  request: Pick<FlightSearch, "adults" | "children" | "infants" | "trip"> | undefined,
  airports: AirportIndex | null,
) {
  const baggage = fareBaggage(fare);
  const meal = clean(fare.meal);
  const departs = when(flight.departure_local);
  const arrives = when(flight.arrival_local);
  // Stops with where and how long the passenger stays (#89), as under the flight's line on the results.
  const trip = [formatDuration(flight.duration_minutes), stopsBelowLine(flight, flightStays(flight, airports))].filter(Boolean).join(" · ");
  const price = fare.selling_price ? `${formatMoney(fare.selling_price)}${severalTravelers(request) ? " per adult" : ""}` : null;
  return [
    "Flight details from Travelian",
    "",
    ...(request?.trip === "roundtrip" ? [journey.direction === "return" ? "Return flight" : "Outbound flight"] : []),
    ...(request?.trip === "multicity" && journey.leg ? [`Flight ${journey.leg}`] : []),
    [airlineLabel(flight), clean(flight.flight_number)].filter(Boolean).join(" "),
    `${airport(journey.origin, airports)} to ${airport(journey.destination, airports)}`,
    ...(departs ? [`Departs: ${departs}`] : []),
    ...(arrives ? [`Arrives: ${arrives}`] : []),
    ...(trip ? [`Duration: ${trip}`] : []),
    `Fare: ${fare.name}`,
    `Baggage: ${baggage.known ? baggage.detail : underBaggageLabel(baggage.short)}`,
    `Meal: ${meal || "No Meal"}`, // #198: missing meal data is "No Meal"
    ...(price ? [`Price: ${price}`] : []),
  ].join("\n");
}

/** WhatsApp's share link: opens WhatsApp (app or web) with the message, for staff to pick the customer. */
export const whatsappShareUrl = (message: string) => `https://wa.me/?text=${encodeURIComponent(message)}`;
