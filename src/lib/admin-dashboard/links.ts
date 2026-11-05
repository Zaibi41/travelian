// Where dashboard cards and rows link. A card links to an existing list only
// when that list shows the same count (same records, same rule, same filters);
// otherwise it links to the Attention Queue placeholder (spec 2.01).
//
// Flight Operations (/admin/flight-bookings) uses the same queue rules as the
// gateway for "approval" and "payment", but it is flight-only, has no provider
// filter, and its "Expiring Soon" tab uses 24 hours (the card uses the gateway's
// expiring window), so those cases go to the placeholder.

import type { AttentionItem, DashboardQuery } from "./types";

export const ATTENTION_QUEUE_PLACEHOLDER = "/admin/attention-queue";
const FLIGHT_OPERATIONS = "/admin/flight-bookings";

function flightOperationsMatches(query: DashboardQuery) {
  return !query.provider && (!query.product || query.product === "flight");
}

export function needsActionLinks(query: DashboardQuery) {
  const matches = flightOperationsMatches(query);
  return {
    pendingIssuance: matches ? `${FLIGHT_OPERATIONS}?tab=approval` : ATTENTION_QUEUE_PLACEHOLDER,
    paymentPending: matches ? `${FLIGHT_OPERATIONS}?tab=payment` : ATTENTION_QUEUE_PLACEHOLDER,
    expiringHolds: ATTENTION_QUEUE_PLACEHOLDER,
  };
}

const ROW_TAB: Record<AttentionItem["type"], string> = {
  pending_issuance: "approval",
  payment_pending: "payment",
  hold_expiring: "expiring", // the 24-hour tab contains every hold in the shorter window
};

/** A row opens the Flight Operations tab that lists that booking. */
export function attentionRowHref(item: AttentionItem) {
  return `${FLIGHT_OPERATIONS}?tab=${ROW_TAB[item.type]}`;
}
