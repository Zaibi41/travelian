// Group fares are non-refundable and non-changeable (the gateway holds the same wording in
// app/services/group_terms.py and stores the acknowledgement with the booking).

/** The notice above group results, admin and public. */
export const GROUP_FARE_NOTICE = "Group fares are non-refundable and non-changeable. Names and dates cannot be altered after booking.";
/** The Refund column on every group fare row. */
export const GROUP_FARE_REFUND = "Non-refundable";
/** Public wording: the customer says it in the pre-filled WhatsApp message (there is no public booking form). */
export const GROUP_FARE_CUSTOMER_LINE = "I understand this fare is non-refundable and non-changeable.";

/** "Told by staff on 15 Nov 2026 17:40" for a stored acknowledgement. */
export function acknowledgedBy(terms: { acknowledged_by: "staff" | "customer" }, when: string) {
  return `${terms.acknowledged_by === "staff" ? "Told by staff" : "Agreed by the customer"} on ${when}`;
}
