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

/** Issue tickets. The gateway checks the price again first; `acceptedTotal` after the customer agreed to a new price. */
export const issueGroupTickets = (bookingId: string, acceptedTotal?: GroupMoney, extra?: GatewayOptions) =>
  gatewayPost("/v1/group-ticketing/holds/{booking_id}/issue", { accepted_total: acceptedTotal ?? null },
    options(bookingId, extra, "Tickets can't be issued right now. Nothing was issued."));

export interface PriceChange {
  heldTotal: GroupMoney;
  newTotal: GroupMoney;
  difference: GroupMoney;
}

const isMoney = (value: unknown): value is GroupMoney =>
  typeof value === "object" && value !== null && typeof (value as GroupMoney).amount_minor === "number" && typeof (value as GroupMoney).currency === "string";

/** The gateway's "price_changed" refusal, with its three amounts; null for any other error. */
export function priceChangeFrom(error: unknown): PriceChange | null {
  if (!(error instanceof GatewayError) || error.code !== "price_changed") return null;
  const { held_total: heldTotal, new_total: newTotal, difference } = error.extra;
  return isMoney(heldTotal) && isMoney(newTotal) && isMoney(difference) ? { heldTotal, newTotal, difference } : null;
}

/** The sentence to show for a failed action: the gateway's own words when it gave them. */
export function gatewayMessage(error: unknown, fallback: string) {
  if (!(error instanceof GatewayError)) return fallback;
  if (typeof error.extra.message === "string" && error.fieldErrors.length) return error.extra.message;
  return error.message || fallback;
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

/** "Sana Raza, Passport AB•••4567" (masked by the gateway). */
export const travelerLine = (traveler: GroupHoldView["travelers"][number]) =>
  [`${traveler.first_name} ${traveler.last_name}`.trim(),
    traveler.document_number_masked ? `${traveler.id_type === "NATI" ? "CNIC" : "Passport"} ${traveler.document_number_masked}` : null]
    .filter(Boolean).join(", ");
