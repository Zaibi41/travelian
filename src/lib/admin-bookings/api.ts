import { gatewayGet, type GatewayOptions } from "@/lib/gateway/client";
import type { BookingListParams } from "./types";

export const fetchBookings = (params: BookingListParams, options?: GatewayOptions) =>
  gatewayGet("/v1/admin/bookings", params, options);

export const fetchBookingDetail = (bookingId: string, options?: GatewayOptions) =>
  gatewayGet("/v1/admin/bookings/{booking_id}", undefined, { ...options, pathParams: { booking_id: bookingId } });
