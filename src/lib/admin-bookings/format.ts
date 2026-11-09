import { differenceInMinutes, format } from "date-fns";
import { formatRs } from "@/lib/admin-dashboard/format";
import type { BookingMoney, BookingStatus, IssuanceStatus, PaymentStatus } from "./types";

// Display only. Amounts arrive from the gateway as integer minor units.

/** "Rs 12,500" for PKR; other currencies show their code, e.g. "INR 4,000". */
export function formatMoney(money: BookingMoney) {
  if (money.currency === "PKR") return formatRs({ amount_minor: money.amount_minor, currency: "PKR" });
  const value = Math.round(money.amount_minor / 100);
  return `${value < 0 ? "-" : ""}${money.currency} ${Math.abs(value).toLocaleString("en-PK")}`;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? format(date, "d MMM yyyy, HH:mm") : "—";
}

/** "2h 15m left", "Expired". */
export function formatTimeLeft(value: string | null | undefined, now: Date = new Date()) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  const minutes = differenceInMinutes(date, now);
  if (minutes <= 0) return "Expired";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${rest}m left`;
  return `${rest}m left`;
}

/** A hold deadline only counts down while the hold is open (held or pending payment). */
export const isOpenHold = (status: BookingStatus) => status === "held" || status === "pending_payment";

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  held: "Held",
  pending_payment: "Pending payment",
  payment_received: "Payment received",
  confirmed: "Confirmed",
  ticket_issued: "Ticket issued",
  cancelled: "Cancelled",
  expired: "Expired",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = { paid: "Paid", unpaid: "Unpaid" };

export const ISSUANCE_STATUS_LABEL: Record<IssuanceStatus, string> = { issued: "Issued", not_issued: "Not issued" };

export const PRODUCT_LABEL: Record<string, string> = { flight: "Flight", group: "Group", hotel: "Hotel", umrah: "Umrah" };
