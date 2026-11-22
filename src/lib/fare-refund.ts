// Refundability of a fare, read only from what the fare data says (#149). Shared by the flight
// results' fare details and checkout so they always agree. Unknown stays unknown: nothing is shown
// as "Refundable" unless the airline's fare data says so.

export type RefundStatus = "refundable" | "non_refundable" | null;

/** Wording used when the fare carries no refund or cancellation rule of its own. */
export const FARE_RULES_FALLBACK = "As per airline fare rules";

const NON_REFUNDABLE = /non[\s-]?refundable|not refundable|no refund/i;
const REFUNDABLE = /refundable/i;

/** "refundable" / "non_refundable" when the flag or the fare's rule text says so, otherwise null. */
export function refundStatus(flag?: boolean | null, ...texts: Array<string | null | undefined>): RefundStatus {
  if (flag === false) return "non_refundable";
  const text = texts.filter(Boolean).join(" ");
  if (NON_REFUNDABLE.test(text)) return "non_refundable";
  if (flag === true || REFUNDABLE.test(text)) return "refundable";
  return null;
}

export const REFUND_LABEL: Record<Exclude<RefundStatus, null>, string> = {
  refundable: "Refundable",
  non_refundable: "Non-refundable",
};
