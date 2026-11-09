// Group Ticketing search on travelian-api-gateway (/v1/group-ticketing). The gateway
// strips the supplier from these responses. Not shown on the page (docs/backend-todo.md):
// price (it is the supplier's own price, i.e. cost, until the gateway returns a selling
// price), airline_logo (hosted on the supplier's domain) and subparts (raw supplier data).

import { gatewayGet, gatewayPost, type GatewayOptions } from "@/lib/gateway/client";
import type { components } from "@/lib/gateway/schema";

export type GroupInventory = components["schemas"]["PublicGroupInventory"];
export type GroupTicket = components["schemas"]["PublicGroupTicket"];

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

export const searchGroupFares = (search: Required<Pick<GroupSearch, "from" | "to" | "date">> & GroupSearch, options?: GatewayOptions) =>
  gatewayPost(
    "/v1/group-ticketing/search",
    { origin: search.from, destination: search.to, departure_date: search.date, adults: search.adults },
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

export const isCompleteSearch = (search: GroupSearch): search is GroupSearch & { from: string; to: string; date: string } =>
  Boolean(search.from && search.to && search.date && search.from !== search.to);

export interface GroupResultRow {
  id: string;
  departureDate?: string | null;
  sector?: string | null;
  airline?: string | null;
  seatsLeft?: number | null;
  baggage?: string | null;
}

/** One row per departure, filtered by airline (display filter), earliest first. */
export function resultRows(groups: GroupInventory[], airline?: string): GroupResultRow[] {
  return groups
    .flatMap(group => group.tickets.map(ticket => ({
      id: ticket.id,
      departureDate: ticket.departure_date,
      sector: ticket.sector ?? group.sector,
      airline: (ticket.airline ?? group.airline)?.trim() || null,
      seatsLeft: ticket.remaining,
      baggage: ticket.baggage == null || String(ticket.baggage).trim() === "" ? null : String(ticket.baggage).trim(),
    })))
    .filter(row => !airline || row.airline === airline)
    .sort((a, b) => (a.departureDate ?? "").localeCompare(b.departureDate ?? "") || (a.airline ?? "").localeCompare(b.airline ?? ""));
}
