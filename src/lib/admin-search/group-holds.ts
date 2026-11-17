// Search > Group Ticketing booking flow (mockup PDF docs/2026-11-14, pages 9-13): hold seats,
// seats held, payment and issue tickets. Gateway: /v1/group-ticketing/holds. Every price, total,
// amount due and permission comes from the gateway; the page never computes money.

import { format, parseISO } from "date-fns";
import { GatewayError, gatewayGet, gatewayPost, type GatewayOptions } from "@/lib/gateway/client";
import type { components } from "@/lib/gateway/schema";
import { writeGroupSearch, type GroupSearch } from "./group-ticketing";

type Schemas = components["schemas"];
export type GroupHoldRequest = Schemas["GroupHoldRequest"];
export type GroupHoldView = Schemas["GroupHoldView"];
export type GroupHoldStatus = GroupHoldView["status"];
export type GroupPriceCheck = Schemas["GroupPriceCheck"];
export type GroupIssueResult = Schemas["GroupIssueResult"];
export type GroupMoney = Schemas["GroupMoney"];

export const GROUP_HOLD_PATH = "/admin/search/group-ticketing/hold";
export const groupHeldPath = (bookingId: string) => `/admin/search/group-ticketing/held/${encodeURIComponent(bookingId)}`;
export type GroupBookingTab = "details" | "travelers" | "payments";
export const GROUP_BOOKING_TABS: { slug: GroupBookingTab; label: string }[] = [
  { slug: "details", label: "Details" },
  { slug: "travelers", label: "Travelers" },
  { slug: "payments", label: "Payments" },
];
export const groupBookingPath = (bookingId: string, tab: GroupBookingTab = "payments") =>
  `/admin/bookings/group-ticketing/${encodeURIComponent(bookingId)}/${tab}`;

/** Search results URL for a search (Back to results / search again). */
export const groupResultsPath = (search: GroupSearch) =>
  `/admin/search?${writeGroupSearch(new URLSearchParams("tab=group-ticketing"), search).toString()}`;

/** The traveler details page for one result row: the fare and the search stay in the URL. */
export const groupHoldFormPath = (ticketId: string, search: GroupSearch) => {
  const params = writeGroupSearch(new URLSearchParams(), search);
  params.set("ticket", ticketId);
  params.set("adults", String(search.adults)); // always explicit here: the form makes one card per adult
  return `${GROUP_HOLD_PATH}?${params.toString()}`;
};

const options = (bookingId: string, extra?: GatewayOptions, unavailableMessage?: string): GatewayOptions => ({
  ...extra, pathParams: { booking_id: bookingId }, ...(unavailableMessage ? { unavailableMessage } : {}),
});

export const fetchGroupTicket = (ticketId: string, extra?: GatewayOptions) =>
  gatewayGet("/v1/group-ticketing/tickets/{ticket_id}", undefined, {
    ...extra, pathParams: { ticket_id: ticketId }, unavailableMessage: "Group fares can't be loaded right now. Try again in a few minutes.",
  });

/** Hold the seats (never retried by the gateway). The answer carries the price. */
export const holdGroupSeats = (body: GroupHoldRequest, extra?: GatewayOptions) =>
  gatewayPost("/v1/group-ticketing/holds", body, { ...extra, unavailableMessage: "The seats couldn't be held right now. Nothing was held." });

export const fetchGroupHold = (bookingId: string, extra?: GatewayOptions) =>
  gatewayGet("/v1/group-ticketing/holds/{booking_id}", undefined, options(bookingId, extra, "This booking can't be loaded right now."));

export const releaseGroupHold = (bookingId: string, extra?: GatewayOptions) =>
  gatewayPost("/v1/group-ticketing/holds/{booking_id}/release", undefined as never,
    options(bookingId, extra, "The hold couldn't be released right now. Nothing was changed."));

export type GroupTicketsRequest = Schemas["GroupTicketsRequest"];
export type GroupTicketingStatus = NonNullable<GroupHoldView["ticketing_status"]>;

/** After payment: "Paid – awaiting final PNR" -> "Final PNR received" -> "Ticketed". */
export const GROUP_TICKETING_LABEL: Record<GroupTicketingStatus, string> = {
  awaiting_final_pnr: "Paid – awaiting final PNR", final_pnr_received: "Final PNR received", ticketed: "Ticketed",
};

/** Staff record the airline's final PNR and per-traveler ticket numbers (logged; the gateway checks permission and payment). */
export const recordGroupTickets = (bookingId: string, body: GroupTicketsRequest, extra?: GatewayOptions) =>
  gatewayPost("/v1/group-ticketing/holds/{booking_id}/tickets", body,
    options(bookingId, extra, "The final PNR and tickets couldn't be saved right now. Nothing was changed."));

/** The customer agreed to the price the supplier held at (it differed from the price shown). Payments can follow. */
export const acceptHeldPrice = (bookingId: string, extra?: GatewayOptions) =>
  gatewayPost("/v1/group-ticketing/holds/{booking_id}/accept-held-price", undefined as never,
    options(bookingId, extra, "The new price couldn't be confirmed right now. Nothing was changed."));

/** Issue tickets. The gateway checks the supplier cost again first (the selling price never changes there).
 *  After "supplier_cost_changed": `acceptedCost` is the new cost the issuer confirmed; `acceptBelowCost` when it is
 *  above the selling price. */
export const issueGroupTickets = (bookingId: string, acceptedCost?: GroupMoney, acceptBelowCost = false, extra?: GatewayOptions) =>
  gatewayPost("/v1/group-ticketing/holds/{booking_id}/issue", { accepted_supplier_cost: acceptedCost ?? null, accept_below_cost: acceptBelowCost },
    options(bookingId, extra, "Tickets can't be issued right now. Nothing was issued."));

/** The gateway's "supplier_cost_changed" / "below_cost" refusal at issue. Cost amounts and profit only reach viewers
 *  with cost access; everyone gets the selling total and the cost to confirm. */
export interface CostChange {
  sellingTotal: GroupMoney;
  belowCost: boolean;
  acceptedCost: GroupMoney;
  previousCost?: GroupMoney;
  newCost?: GroupMoney;
  difference?: GroupMoney;
  profit?: GroupMoney;
}

const isMoney = (value: unknown): value is GroupMoney =>
  typeof value === "object" && value !== null && typeof (value as GroupMoney).amount_minor === "number" && typeof (value as GroupMoney).currency === "string";
const optionalMoney = (value: unknown) => (isMoney(value) ? value : undefined);

/** The cost-change refusal's fields; null for any other error. */
export function costChangeFrom(error: unknown): CostChange | null {
  if (!(error instanceof GatewayError) || (error.code !== "supplier_cost_changed" && error.code !== "below_cost")) return null;
  const extra = error.extra;
  if (!isMoney(extra.selling_total) || !isMoney(extra.accepted_supplier_cost)) return null;
  return {
    sellingTotal: extra.selling_total, belowCost: extra.below_cost === true, acceptedCost: extra.accepted_supplier_cost,
    previousCost: optionalMoney(extra.previous_supplier_cost), newCost: optionalMoney(extra.new_supplier_cost),
    difference: optionalMoney(extra.difference), profit: optionalMoney(extra.profit),
  };
}

/** The sentence to show for a failed action: the gateway's own words when it gave them. */
export function gatewayMessage(error: unknown, fallback: string) {
  if (!(error instanceof GatewayError)) return fallback;
  if (typeof error.extra.message === "string" && error.fieldErrors.length) return error.extra.message;
  return error.message || fallback;
}

/** The return flight of a held booking, "21 Dec 2026 11:05–18:05, JED - ISB, 9P701"; null for one-way. */
export function returnFlightText(flight: GroupHoldView["flight"]) {
  const back = (flight.legs ?? []).filter(leg => leg.direction === "return");
  if (!back.length) return null;
  const first = back[0];
  const last = back[back.length - 1];
  const when = departureText(first.departure_date, first.departure_time);
  const span = when && last.arrival_time ? `${when}–${last.arrival_time}` : when;
  const route = first.origin && last.destination ? `${first.origin} - ${last.destination}` : null;
  return [span, route, back.map(leg => leg.flight_number).filter(Boolean).join(" / ") || null].filter(Boolean).join(", ") || null;
}

/** "22 Nov 2026 06:40" from the gateway's date and time; null without a date. */
export function departureText(date?: string | null, time?: string | null) {
  if (!date) return null;
  const parsed = parseISO(date);
  const day = Number.isFinite(parsed.getTime()) ? format(parsed, "d MMM yyyy") : date;
  return time ? `${day} ${time}` : day;
}

/** "28:14" (minutes:seconds), or "1:02:05" past an hour. Display only. */
export function countdownLabel(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const two = (value: number) => String(value).padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
}

/** "Sana Raza, Passport AB1234567". */
export const travelerLine = (traveler: GroupHoldView["travelers"][number]) =>
  [`${traveler.first_name} ${traveler.last_name}`.trim(),
    traveler.document_number ? `${traveler.id_type === "NATI" ? "CNIC" : "Passport"} ${traveler.document_number}` : null]
    .filter(Boolean).join(", ");
