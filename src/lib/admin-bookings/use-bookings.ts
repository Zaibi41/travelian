import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchBookingDetail, fetchBookings } from "./api";
import { PAGE_SIZE, type BookingsFilters } from "./query-params";
import type { BookingListParams, BookingProduct } from "./types";

const LIVE = { staleTime: 60_000, refetchInterval: 60_000, refetchOnWindowFocus: true, retry: 1 } as const;

export function bookingListParams(product: BookingProduct | undefined, filters: BookingsFilters): BookingListParams {
  return {
    product,
    period: filters.period,
    q: filters.q,
    booking_status: filters.bookingStatus,
    payment_status: filters.paymentStatus,
    issuance_status: filters.issuanceStatus,
    provider: filters.provider,
    agency: filters.agency,
    card: filters.card,
    limit: PAGE_SIZE,
    offset: (filters.page - 1) * PAGE_SIZE,
  };
}

export function useBookings(product: BookingProduct | undefined, filters: BookingsFilters) {
  const params = bookingListParams(product, filters);
  return useQuery({
    queryKey: ["admin-bookings", "list", params],
    queryFn: ({ signal }) => fetchBookings(params, { signal }),
    placeholderData: keepPreviousData,
    ...LIVE,
  });
}

export function useBookingDetail(bookingId: string) {
  return useQuery({
    queryKey: ["admin-bookings", "detail", bookingId],
    queryFn: ({ signal }) => fetchBookingDetail(bookingId, { signal }),
    ...LIVE,
    retry: (count, error) => !(error instanceof Error && "kind" in error && error.kind === "not_found") && count < 1,
  });
}
