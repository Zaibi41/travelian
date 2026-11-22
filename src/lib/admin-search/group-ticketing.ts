// Group Ticketing search on travelian-api-gateway (/v1/group-ticketing). The gateway decides
// what each role receives (D23): everyone gets the selling price and a gateway-served logo;
// supplier, supplier cost and raw supplier fields only with permission. This page shows
// only the selling price, never supplier cost.

import { gatewayGet, gatewayPost, type GatewayOptions } from "@/lib/gateway/client";
import { groupBaggageText, type BaggageText } from "@/lib/baggage";
import type { components } from "@/lib/gateway/schema";

export type GroupInventory = components["schemas"]["GroupView"];
export type GroupTicket = components["schemas"]["GroupTicketView"];
export type GroupMoney = components["schemas"]["GroupMoney"];
export type GroupSource = components["schemas"]["GroupSource"];

/** "Dhillu & Sahi · PNR 41SDS4 · Group 3056". The gateway sends group_source only to viewers with
 *  supplier access (Admin and Super Admin, or staff granted it); null when it isn't sent. */
export function sourceLine(source?: GroupSource | null): string | null {
  if (!source) return null;
  return [source.provider_name, source.supplier_pnr && `PNR ${source.supplier_pnr}`, source.supplier_group_id && `Group ${source.supplier_group_id}`]
    .filter(Boolean).join(" · ");
}

const UNAVAILABLE = "Group fares can't be loaded right now. The supplier isn't responding; try again in a few minutes.";

export const fetchGroupInventory = (options?: GatewayOptions) =>
  gatewayGet("/v1/group-ticketing/inventory", undefined, { unavailableMessage: UNAVAILABLE, ...options });

export interface GroupSearch {
  from?: string;
  to?: string;
  /** yyyy-mm-dd */
  date?: string;
  adults: number;
  airline?: string;
}

/** Any one of From, To and date is enough; the empty ones are sent as null. */
export const searchGroupFares = (search: GroupSearch, options?: GatewayOptions) =>
  gatewayPost(
    "/v1/group-ticketing/search",
    { origin: search.from ?? null, destination: search.to ?? null, departure_date: search.date ?? null, adults: search.adults },
    { unavailableMessage: UNAVAILABLE, ...options },
  );

const CODE = /^[A-Z]{3}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** "LHE - DMM" → ["LHE", "DMM"] (first and last airport). */
export function sectorCodes(sector?: string | null): [string, string] | null {
  const parts = (sector ?? "").split("-").map(part => part.trim().toUpperCase()).filter(Boolean);
  return parts.length >= 2 && CODE.test(parts[0]) && CODE.test(parts[parts.length - 1]) ? [parts[0], parts[parts.length - 1]] : null;
}

export interface SectorOption {
  from: string;
  to: string;
  /** Departures on offer for this sector. */
  count: number;
}

/** Sectors on offer, most departures first; airlines on offer, A–Z. */
export function inventoryOptions(groups: GroupInventory[]) {
  const sectors = new Map<string, SectorOption>();
  const airlines = new Set<string>();
  for (const group of groups) {
    for (const ticket of group.tickets) {
      const codes = sectorCodes(ticket.sector);
      if (codes) {
        const key = codes.join("-");
        const entry = sectors.get(key) ?? { from: codes[0], to: codes[1], count: 0 };
        entry.count += 1;
        sectors.set(key, entry);
      }
      const airline = (ticket.airline ?? group.airline)?.trim();
      if (airline) airlines.add(airline);
    }
  }
  return {
    sectors: [...sectors.values()].sort((a, b) => b.count - a.count || a.from.localeCompare(b.from) || a.to.localeCompare(b.to)),
    airlines: [...airlines].sort((a, b) => a.localeCompare(b)),
  };
}

export function parseGroupSearch(params: URLSearchParams): GroupSearch {
  const code = (key: string) => {
    const value = params.get(key)?.trim().toUpperCase();
    return value && CODE.test(value) ? value : undefined;
  };
  const date = params.get("date") ?? "";
  const adults = Number(params.get("adults"));
  return {
    from: code("from"),
    to: code("to"),
    date: DATE.test(date) ? date : undefined,
    adults: Number.isInteger(adults) && adults >= 1 && adults <= 9 ? adults : 1,
    airline: params.get("airline")?.trim() || undefined,
  };
}

export function writeGroupSearch(params: URLSearchParams, search: GroupSearch): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const key of ["from", "to", "date", "adults", "airline"]) next.delete(key);
  if (search.from) next.set("from", search.from);
  if (search.to) next.set("to", search.to);
  if (search.date) next.set("date", search.date);
  if (search.adults !== 1) next.set("adults", String(search.adults));
  if (search.airline) next.set("airline", search.airline);
  return next;
}

/** A search runs once any one of From, To or Departure date is filled (as on the home page); From and To must differ. */
export const isCompleteSearch = (search: GroupSearch): boolean =>
  Boolean(search.from || search.to || search.date) && !(search.from && search.from === search.to);

/** "20" / "20 kg" / 20 -> 20; empty or not a number -> null. */
/** Group baggage as shown (#36), hand carry first: "7+20 kg"; the gateway's label when sent. Display only. */
export function ticketBaggage(item: { baggage?: unknown; hand_carry?: unknown; baggage_label?: string | null; baggage_detail?: string | null }): BaggageText {
  return groupBaggageText(item.baggage, item.hand_carry, item.baggage_label, item.baggage_detail);
}

export interface GroupResultLeg {
  flightNumber?: string | null;
  /** "JED - ISB" */
  route?: string | null;
  departureDate?: string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  baggage: BaggageText;
  meal?: "Yes" | "No" | null;
}

export interface GroupResultRow {
  id: string;
  departureDate?: string | null;
  departureTime?: string | null;
  /** Gateway path, e.g. /v1/logos/{id}. */
  logoUrl?: string | null;
  /** Per adult, selling price from the gateway (the listing price plus markup). */
  price?: GroupMoney | null;
  sector?: string | null;
  airline?: string | null;
  flightNumber?: string | null;
  seatsLeft?: number | null;
  baggage: BaggageText;
  meal?: "Yes" | "No" | null;
  /** The outbound flight's arrival time (HH:MM), when the provider sends it. */
  arrivalTime?: string | null;
  /** The return flight, when the provider sends one. */
  returnLeg?: GroupResultLeg | null;
  stock?: "supplier" | "owned";
  canHold: boolean;
  /** The gateway's reason when Hold seats is off (provider can't hold, no price from the provider, ...). */
  holdUnavailableReason?: string | null;
  /** "Dhillu & Sahi · PNR 41SDS4 · Group 3056"; only when the gateway sent group_source (supplier access). */
  source: string | null;
}

/** "OV522 / OV287" for the flights of one journey, when there is more than one; undefined otherwise. */
function flightNumbers(legs: { flight_number?: string | null }[]) {
  const numbers = legs.map(leg => leg.flight_number).filter(Boolean);
  return numbers.length > 1 ? numbers.join(" / ") : undefined;
}

/** One row per departure, filtered by airline (display filter), earliest first. */
export function resultRows(groups: GroupInventory[], airline?: string): GroupResultRow[] {
  return groups
    .flatMap(group => group.tickets.map(ticket => {
      const legs = ticket.legs ?? [];
      const back = legs.find(leg => leg.direction === "return");
      const outbound = legs.filter(leg => leg.direction !== "return");
      return {
        id: ticket.id,
        departureDate: ticket.departure_date,
        departureTime: ticket.departure_time,
        logoUrl: ticket.logo_url ?? group.logo_url,
        price: ticket.selling_price ?? null,
        sector: ticket.sector ?? group.sector,
        airline: (ticket.airline ?? group.airline)?.trim() || null,
        // #152: a connecting fare shows every flight number ("OV522 / OV287").
        flightNumber: flightNumbers(outbound) ?? ticket.flight_number ?? null,
        seatsLeft: ticket.remaining,
        baggage: ticketBaggage(ticket),
        meal: ticket.meal ?? null,
        arrivalTime: outbound.length ? outbound[outbound.length - 1].arrival_time ?? null : null,
        returnLeg: back ? {
          flightNumber: flightNumbers(legs.filter(leg => leg.direction === "return")) ?? back.flight_number,
          route: back.origin && legs.filter(leg => leg.direction === "return").at(-1)?.destination
            ? [back.origin, ...legs.filter(leg => leg.direction === "return").map(leg => leg.destination)].join(" - ") : null,
          departureDate: back.departure_date, departureTime: back.departure_time, arrivalTime: legs.filter(leg => leg.direction === "return").at(-1)?.arrival_time ?? null,
          baggage: ticketBaggage(back), meal: back.meal ?? null,
        } : null,
        stock: ticket.stock,
        canHold: Boolean(ticket.can_hold),
        holdUnavailableReason: ticket.hold_unavailable_reason ?? null,
        source: sourceLine(ticket.group_source),
      };
    }))
    .filter(row => !airline || row.airline === airline)
    // Lowest fare first (no price last), then departure date, then airline.
    .sort((a, b) => (a.price?.amount_minor ?? Number.MAX_SAFE_INTEGER) - (b.price?.amount_minor ?? Number.MAX_SAFE_INTEGER)
      || (a.departureDate ?? "").localeCompare(b.departureDate ?? "") || (a.airline ?? "").localeCompare(b.airline ?? ""));
}
