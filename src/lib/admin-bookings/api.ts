import { gatewayGet, gatewayGetFile, gatewayPost, gatewayPut, type GatewayOptions } from "@/lib/gateway/client";
import type { BookingListParams, RecordPaymentBody, ResolveIssuanceBody } from "./types";

export const fetchBookings = (params: BookingListParams, options?: GatewayOptions) =>
  gatewayGet("/v1/admin/bookings", params, options);

export const fetchBookingDetail = (bookingId: string, options?: GatewayOptions) =>
  gatewayGet("/v1/admin/bookings/{booking_id}", undefined, { ...options, pathParams: { booking_id: bookingId } });

/** The booking's itinerary (Flights and Group Ticketing), fetched with the user's token, then saved as
 *  "<booking reference>.pdf" or, as an image of the same document, "<booking reference>-itinerary.png". The gateway
 *  leaves supplier names, group ids, cost and profit out. */
export async function downloadItinerary(bookingId: string, options?: GatewayOptions, format: "pdf" | "png" = "pdf", withFare = true) {
  const query = { ...(format === "png" ? { format: "png" as const } : {}), ...(withFare ? {} : { fare: false }) };
  const file = await gatewayGetFile("/v1/admin/bookings/{booking_id}/itinerary.pdf", format === "png" ? "image/png" : "application/pdf", {
    ...options, pathParams: { booking_id: bookingId }, unavailableMessage: "The itinerary can't be downloaded right now.",
  }, Object.keys(query).length ? query : undefined);
  const safe = bookingId.replace(/[^A-Za-z0-9._-]/g, "_");
  const suffix = withFare ? "" : "-no-fare";  // issue #18: a print without fare
  saveFile(file, format === "png" ? `${safe}-itinerary${suffix}.png` : `${safe}${suffix}.pdf`);
}

export function saveFile(file: Blob, name: string) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

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

/** Fix the customer's email on this booking after a bounce or complaint (gateway#59). Logged. */
export const changeCustomerEmail = (bookingId: string, email: string, options?: GatewayOptions) =>
  gatewayPut("/v1/admin/bookings/{booking_id}/customer-email", { email }, {
    ...options, pathParams: { booking_id: bookingId }, unavailableMessage: "The email address couldn't be saved right now. Nothing was changed.",
  });

/** Send a customer email for this booking again (gateway#53); the answer says sent or why not, in plain words. */
export const resendEmail = (bookingId: string, email: string, options?: GatewayOptions) =>
  gatewayPost("/v1/admin/bookings/{booking_id}/emails/{email}/resend", undefined as never, {
    ...options, pathParams: { booking_id: bookingId, email }, unavailableMessage: "The email couldn't be resent right now. Try again.",
  });

/** Ask an approver to issue (full payment recorded and a valid hold). */
export const requestIssuance = (bookingId: string, note?: string, options?: GatewayOptions) =>
  gatewayPost("/v1/admin/bookings/{booking_id}/issuance/request", { note: note?.trim() || null }, issuancePath(bookingId, options));

/** Issue once, never retried; the gateway decides issued / not issued / unknown from the PNR. After a 409
 *  "supplier_cost_changed", send the airline's new cost back as `acceptedSupplierCost` to issue at it. */
export const issueTicket = (bookingId: string, options?: GatewayOptions, acceptedSupplierCost?: Money | null) =>
  gatewayPost("/v1/admin/bookings/{booking_id}/issuance/issue",
    (acceptedSupplierCost ? { accepted_supplier_cost: acceptedSupplierCost } : undefined) as never, issuancePath(bookingId, options));

type Money = { amount_minor: number; currency: string };

/** What the customer pays, per passenger type (Group Ticketing and Flights): whole rupees, not below cost, before any
 *  payment. Needs record_payments; logged. */
export const setSellingPrice = (bookingId: string, prices: { passenger_type: "ADT" | "CHD" | "INF"; selling_each: Money }[], options?: GatewayOptions) =>
  gatewayPost("/v1/admin/bookings/{booking_id}/selling-price", { prices }, {
    ...options, pathParams: { booking_id: bookingId }, unavailableMessage: "The selling price couldn't be saved right now. Nothing was changed.",
  });

/** Unknown issuance: check the PNR again (read-only) and settle it if clear. */
export const verifyIssuance = (bookingId: string, options?: GatewayOptions) =>
  gatewayPost("/v1/admin/bookings/{booking_id}/issuance/verify", undefined as never, issuancePath(bookingId, options));

/** Unknown issuance: mark issued (a ticket number for every traveler) or not issued, with a reason. */
export const resolveIssuance = (bookingId: string, body: ResolveIssuanceBody, options?: GatewayOptions) =>
  gatewayPost("/v1/admin/bookings/{booking_id}/issuance/resolve", body, issuancePath(bookingId, options));

/** Travelian's active receiving accounts (where customer payments arrive), for "Received into". */
export const fetchPaymentAccounts = (options?: GatewayOptions) =>
  gatewayGet("/v1/admin/payment-accounts", undefined, { ...options, unavailableMessage: "The receiving accounts couldn't be loaded." });

/** SooperFare bookings: ask SooperFare to cancel. Marked Cancelled only when SooperFare's own record confirms it. */
export const cancelAtSupplier = (bookingId: string, options?: GatewayOptions) =>
  gatewayPost("/v1/admin/bookings/{booking_id}/supplier-cancel", undefined as never, {
    ...options, pathParams: { booking_id: bookingId }, unavailableMessage: "SooperFare couldn't be reached. Nothing was changed.",
  });

/** SooperFare bookings whose hold is gone: hold the same flights and fare again. Same total only, unless
 *  acceptTotalMinor is the new total the gateway returned in a 409 price_changed (error.extra.new_total). */
export const reholdAtSupplier = (bookingId: string, acceptTotalMinor?: number, options?: GatewayOptions) =>
  gatewayPost("/v1/admin/bookings/{booking_id}/supplier-rehold", (acceptTotalMinor ? { accept_total_minor: acceptTotalMinor } : {}) as never, {
    ...options, pathParams: { booking_id: bookingId }, unavailableMessage: "SooperFare couldn't be reached. Nothing was held.",
  });

/** SooperFare bookings: read what SooperFare shows now (read-only); confirms a requested cancel once SooperFare has applied it. */
export const checkAtSupplier = (bookingId: string, options?: GatewayOptions) =>
  gatewayPost("/v1/admin/bookings/{booking_id}/supplier-check", undefined as never, {
    ...options, pathParams: { booking_id: bookingId }, unavailableMessage: "SooperFare couldn't be reached. Nothing was changed.",
  });
