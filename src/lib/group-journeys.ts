// A group fare's flights as journeys (#152): the outbound journey and, for a return fare, the return journey, each
// with every flight in order and the connections between them. A one-way fare with a connection (LHE → MCT → JED)
// is one outbound journey with 1 stop, never an outbound and a "return". Display only: no prices here.
import { gapMinutes, minutesText } from "@/lib/flight-stays";
import type { GroupTicket, GroupTicketLeg } from "@/lib/group-ticketing";

export interface GroupConnection {
  /** The airport the passenger changes planes at. */
  airport: string;
  /** "3h 0m"; undefined when a time is missing. */
  duration?: string;
}

export interface GroupJourney {
  direction: "outbound" | "return";
  legs: GroupTicketLeg[];
  origin?: string;
  destination?: string;
  departureDate?: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  stops: number;
  connections: GroupConnection[];
}

const code = (value?: string) => String(value || "").trim().toUpperCase();

/** "YYYY-MM-DD" + one day; the same text back when it isn't a date. */
function nextDay(date: string) {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return date;
  const next = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1));
  return next.toISOString().slice(0, 10);
}

const clock = (value?: string) => String(value || "").trim().match(/^(\d{1,2}):(\d{2})/);
const hhmm = (value?: string) => {
  const match = clock(value);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : undefined;
};

/** The day a flight lands: the supplier's arrival date, else its departure date (the next day when it lands at an
 * earlier clock time than it left). */
export function legArrivalDate(leg: GroupTicketLeg): string | undefined {
  if (leg.arrivalDate) return leg.arrivalDate;
  const day = leg.flightDate;
  if (!day) return undefined;
  const leaves = hhmm(leg.departureTime);
  const lands = hhmm(leg.arrivalTime);
  return leaves && lands && lands < leaves ? nextDay(day) : day;
}

const stamp = (date?: string, time?: string) => {
  const day = String(date || "").slice(0, 10);
  const at = hhmm(time);
  return day && at ? `${day} ${at}` : undefined;
};

/** Which legs are the return: the gateway's direction when it sent one. Otherwise (older data) a round-trip fare
 * turns back at the first later leg leaving its outbound destination (the middle of a written-out sector such as
 * "LHE-MCT-JED-MCT-LHE", the sector's last airport for "LHE-JED", else the first flight's destination); anything else is all outbound. */
function directions(ticket: GroupTicket): ("outbound" | "return")[] {
  const legs = ticket.itinerary || [];
  if (legs.some((leg) => leg.direction)) return legs.map((leg) => (leg.direction === "return" ? "return" : "outbound"));
  if (ticket.tripType !== "round-trip" || legs.length < 2) return legs.map(() => "outbound");
  const codes = String(ticket.sector || "").toUpperCase().split("-").map((part) => part.trim()).filter((part) => /^[A-Z]{3}$/.test(part));
  const written = codes.length >= 3 && codes.length % 2 === 1 && codes.join("-") === [...codes].reverse().join("-");
  const home = code(legs[0].origin);
  const turn = written ? codes[(codes.length - 1) / 2]
    : codes.length >= 2 && codes[codes.length - 1] !== home ? codes[codes.length - 1] : code(legs[0].destination);
  const from = legs.findIndex((leg, index) => index > 0 && code(leg.origin) === turn);
  return legs.map((_, index) => (from > 0 && index >= from ? "return" : "outbound"));
}

function journeyOf(direction: "outbound" | "return", legs: GroupTicketLeg[]): GroupJourney {
  const first = legs[0];
  const last = legs[legs.length - 1];
  const connections = legs.slice(1).map((leg, index) => {
    const before = legs[index];
    const minutes = gapMinutes(stamp(legArrivalDate(before), before.arrivalTime), stamp(leg.flightDate, leg.departureTime));
    // More than two days on the ground is not a connection time we can trust from supplier data.
    return { airport: code(leg.origin || before.destination), duration: minutes !== undefined && minutes <= 48 * 60 ? minutesText(minutes) : undefined };
  });
  return {
    direction, legs,
    origin: first?.origin, destination: last?.destination,
    departureDate: first?.flightDate, departureTime: first?.departureTime,
    arrivalDate: last ? legArrivalDate(last) : undefined, arrivalTime: last?.arrivalTime,
    stops: Math.max(0, legs.length - 1), connections,
  };
}

/** The outbound journey first, then the return journey when the fare has one. */
export function groupJourneys(ticket: GroupTicket): GroupJourney[] {
  const legs = ticket.itinerary || [];
  if (!legs.length) return [];
  const sides = directions(ticket);
  const outbound = legs.filter((_, index) => sides[index] === "outbound");
  const back = legs.filter((_, index) => sides[index] === "return");
  return [
    ...(outbound.length ? [journeyOf("outbound", outbound)] : []),
    ...(back.length ? [journeyOf("return", back)] : []),
  ];
}

/** "Direct", "1 stop · via MCT (3h 0m)", "2 stops · via MCT (1h 50m), DXB". */
export function groupStopText(journey: Pick<GroupJourney, "stops" | "connections">) {
  if (!journey.stops) return "Direct";
  const via = journey.connections.map((stop) => (stop.duration ? `${stop.airport} (${stop.duration})` : stop.airport)).filter(Boolean).join(", ");
  const count = `${journey.stops} stop${journey.stops === 1 ? "" : "s"}`;
  return via ? `${count} · via ${via}` : count;
}
