import { gatewayGet, gatewayPost, type GatewayOptions } from "@/lib/gateway/client";
import type { BookingListParams, RecordPaymentBody, ResolveIssuanceBody } from "./types";

export const fetchBookings = (params: BookingListParams, options?: GatewayOptions) =>
  gatewayGet("/v1/admin/bookings", params, options);

export const fetchBookingDetail = (bookingId: string, options?: GatewayOptions) =>
  gatewayGet("/v1/admin/bookings/{booking_id}", undefined, { ...options, pathParams: { booking_id: bookingId } });

/** Full date of birth, document number and expiry for one traveler. Needs reveal_identity; logged with the reason. */
export const revealTraveler = (bookingId: string, position: number, reason: string, options?: GatewayOptions) =>
  gatewayPost("/v1/admin/bookings/{booking_id}/travelers/{position}/reveal", { reason }, {
    ...options, pathParams: { booking_id: bookingId, position: String(position) },
    unavailableMessage: "Identity details can't be shown right now.",
  });

// Payments and issuing (spec 7 Booking detail, mockup booking-payment-issue). The gateway checks
// every permission and rule again; the page only offers what the booking detail says is allowed.
const issuancePath = (bookingId: string, options?: GatewayOptions) => ({
  ...options, pathParams: { booking_id: bookingId }, unavailableMessage: "Issuing isn't available right now. Nothing was issued.",
});

/** The checks before issuing (payment, hold, status); supplier amount, balance and margin only with cost and margin. */
export const fetchIssuance = (bookingId: string, options?: GatewayOptions) =>
  gatewayGet("/v1/admin/bookings/{booking_id}/issuance", undefined, issuancePath(bookingId, options));

/** Record a customer payment (bank transfer, JazzCash, 1Link). Needs record_payments; logged. */
export const recordPayment = (bookingId: string, body: RecordPaymentBody, options?: GatewayOptions) =>
  gatewayPost("/v1/admin/bookings/{booking_id}/payments", body, {
    ...options, pathParams: { booking_id: bookingId }, unavailableMessage: "The payment couldn't be recorded right now. Nothing was saved.",
  });

/** Ask an approver to issue (full payment recorded and a valid hold). */
export const requestIssuance = (bookingId: string, note?: string, options?: GatewayOptions) =>
  gatewayPost("/v1/admin/bookings/{booking_id}/issuance/request", { note: note?.trim() || null }, issuancePath(bookingId, options));

/** Issue once, never retried; the gateway decides issued / not issued / unknown from the PNR. */
export const issueTicket = (bookingId: string, options?: GatewayOptions) =>
  gatewayPost("/v1/admin/bookings/{booking_id}/issuance/issue", undefined as never, issuancePath(bookingId, options));

/** Unknown issuance: check the PNR again (read-only) and settle it if clear. */
export const verifyIssuance = (bookingId: string, options?: GatewayOptions) =>
  gatewayPost("/v1/admin/bookings/{booking_id}/issuance/verify", undefined as never, issuancePath(bookingId, options));

/** Unknown issuance: mark issued (a ticket number for every traveler) or not issued, with a reason. */
export const resolveIssuance = (bookingId: string, body: ResolveIssuanceBody, options?: GatewayOptions) =>
  gatewayPost("/v1/admin/bookings/{booking_id}/issuance/resolve", body, issuancePath(bookingId, options));
