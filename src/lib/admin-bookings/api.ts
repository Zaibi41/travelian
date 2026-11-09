import { gatewayGet, gatewayPost, type GatewayOptions } from "@/lib/gateway/client";
import type { BookingListParams } from "./types";

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
