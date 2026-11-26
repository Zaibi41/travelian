// Where dashboard cards and rows link. A card links to an existing list only
// when that list shows the same count (same records, same rule, same filters);
// otherwise it links to the Attention Queue placeholder (spec 2.01).
//
// The needs-action cards open Bookings > Flights with their card picked
// ("Click opens Bookings, already filtered", dashboard mockup). The gateway
// counts each pair with the same rule: Pending issuance = Awaiting issuance,
// Payment pending = Payment pending, Expiring holds = Expiring within N hours
// (same window setting). The list defaults to all dates (needs-action cards
// ignore the date filter) and applies the same provider filter. These rules
// are flight-only, so another product filter goes to the placeholder.
//
// The old Flight Operations page (/admin/flight-bookings) reads the legacy
// /content data, not the gateway, so its counts can't match.

import { BOOKINGS_BASE, bookingDetailPath } from "@/lib/admin-bookings/tabs";
import type { AttentionItem, DashboardQuery } from "./types";

export const ATTENTION_QUEUE_PLACEHOLDER = "/admin/attention-queue";

type FlightsCard = "awaiting_issuance" | "payment_pending" | "expiring_soon" | "unknown_issuance";

function flightsCardList(card: FlightsCard, query: DashboardQuery) {
  if (query.product && query.product !== "flight") return ATTENTION_QUEUE_PLACEHOLDER;
  const params = new URLSearchParams({ card });
  if (query.provider) params.set("provider", query.provider);
  return `${BOOKINGS_BASE}/flights?${params}`;
}

export function needsActionLinks(query: DashboardQuery) {
  return {
    pendingIssuance: flightsCardList("awaiting_issuance", query),
    paymentPending: flightsCardList("payment_pending", query),
    expiringHolds: flightsCardList("expiring_soon", query),
    unknownIssuance: flightsCardList("unknown_issuance", query),
  };
}

/** A row opens its booking. */
export function attentionRowHref(item: AttentionItem) {
  return bookingDetailPath(item.booking_id);
}
