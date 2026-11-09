import { bookingReportPeriods } from "@/lib/booking-report-period";
import type { BookingPeriod, BookingStatus, IssuanceStatus, PaymentStatus } from "./types";

export const PAGE_SIZE = 50;

export interface BookingsFilters {
  q?: string;
  /** Default "all". */
  period: BookingPeriod;
  bookingStatus?: BookingStatus;
  paymentStatus?: PaymentStatus;
  issuanceStatus?: IssuanceStatus;
  /** Lower-case provider name. Only sent when the gateway offered provider options. */
  provider?: string;
  agency?: string;
  page: number;
}

const BOOKING_STATUSES: BookingStatus[] = ["held", "pending_payment", "payment_received", "confirmed", "ticket_issued", "cancelled", "expired"];
const PAYMENT_STATUSES: PaymentStatus[] = ["paid", "unpaid"];
const ISSUANCE_STATUSES: IssuanceStatus[] = ["not_issued", "issued"];

const pick = <T extends string>(value: string | null, allowed: T[]) => (allowed.includes(value as T) ? (value as T) : undefined);
const text = (value: string | null) => value?.trim() || undefined;

/** Reads filters from the URL. Unknown values fall back to defaults. */
export function parseBookingsFilters(params: URLSearchParams): BookingsFilters {
  const period = params.get("period");
  const page = Number(params.get("page"));
  return {
    q: text(params.get("q"))?.slice(0, 64),
    period: bookingReportPeriods.some(option => option.value === period) ? (period as BookingPeriod) : "all",
    bookingStatus: pick(params.get("booking_status"), BOOKING_STATUSES),
    paymentStatus: pick(params.get("payment_status"), PAYMENT_STATUSES),
    issuanceStatus: pick(params.get("issuance_status"), ISSUANCE_STATUSES),
    provider: text(params.get("provider"))?.toLowerCase(),
    agency: text(params.get("agency")),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/** Writes only non-default filters, so a clean URL means "All". */
export function serializeBookingsFilters(filters: BookingsFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.period !== "all") params.set("period", filters.period);
  if (filters.bookingStatus) params.set("booking_status", filters.bookingStatus);
  if (filters.paymentStatus) params.set("payment_status", filters.paymentStatus);
  if (filters.issuanceStatus) params.set("issuance_status", filters.issuanceStatus);
  if (filters.provider) params.set("provider", filters.provider);
  if (filters.agency) params.set("agency", filters.agency);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params;
}

export const BOOKING_STATUS_OPTIONS = BOOKING_STATUSES;
export const PAYMENT_STATUS_OPTIONS = PAYMENT_STATUSES;
export const ISSUANCE_STATUS_OPTIONS = ISSUANCE_STATUSES;
