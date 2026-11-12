// Payment and issuing helpers for the booking Payments tab. Input parsing only: the gateway
// stores, totals and checks every amount (integer paisa); the page never computes money.
import type { IssuanceStatus, PaymentMethod } from "./types";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "1link", label: "1Link" },
];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = Object.fromEntries(
  PAYMENT_METHODS.map(method => [method.value, method.label]),
) as Record<PaymentMethod, string>;

/** "15,316", "15316.5", "Rs 15,316.50" -> 1531650 paisa. Exact (string digits, no floating point);
 *  null for anything that isn't a positive amount with at most 2 decimals. */
export function rupeesToPaisa(input: string): number | null {
  const text = input.replace(/^\s*rs\.?\s*/i, "").replace(/,/g, "").trim();
  const match = /^(\d{1,12})(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) return null;
  const paisa = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return paisa > 0 ? paisa : null;
}

/** Paisa -> the plain rupee text an input starts with ("15316" or "15316.50"). */
export function paisaToInput(paisa: number) {
  const rupees = Math.floor(paisa / 100);
  const rest = paisa % 100;
  return rest ? `${rupees}.${String(rest).padStart(2, "0")}` : String(rupees);
}

/** "14:05" (24-hour). */
export const isClockTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());

/** Local date (yyyy-MM-dd) and 24-hour time -> ISO instant, or null when not a real moment. */
export function receivedAtIso(date: string | undefined, time: string): string | null {
  if (!date || !isClockTime(time)) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.trim().split(":").map(Number);
  const moment = new Date(year, month - 1, day, hours, minutes);
  return Number.isFinite(moment.getTime()) && moment.getDate() === day ? moment.toISOString() : null;
}

/** Who recorded a payment: the gateway sends the role, not a name. */
export function recordedByLabel(role?: string | null) {
  if (!role) return "—";
  return role.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export const ISSUANCE_STATE_LABEL: Record<IssuanceStatus, string> = {
  not_issued: "Not issued",
  requested: "Waiting for approver",
  processing: "Issuing in progress",
  issued: "Issued",
  unknown: "Unknown issuance",
};
