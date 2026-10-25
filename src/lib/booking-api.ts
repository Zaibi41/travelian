import type { BookingRecord } from "./booking-store";

import { API_BASE_URL } from "./api-config";

export async function listServerBookings(includeDeleted = false): Promise<BookingRecord[]> {
  const query = includeDeleted ? "?includeDeleted=true" : "";
  const response = await fetch(`${API_BASE_URL}/content/bookings${query}`);
  if (!response.ok) throw new Error("Unable to load bookings");
  const payload = await response.json();
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function saveServerBooking(booking: BookingRecord): Promise<BookingRecord> {
  const response = await fetch(`${API_BASE_URL}/content/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(booking),
  });
  if (!response.ok) throw new Error("Unable to save booking");
  const payload = await response.json();
  return payload.item;
}

export async function updateServerBooking(bookingId: string, changes: Partial<BookingRecord>): Promise<BookingRecord> {
  const response = await fetch(`${API_BASE_URL}/content/bookings/${encodeURIComponent(bookingId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });
  if (!response.ok) throw new Error("Unable to update booking");
  const payload = await response.json();
  return payload.item;
}
