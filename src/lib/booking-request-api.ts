import type { BookingRequest, BookingRequestStatus, BookingRequestType } from "@/data/models";

import { API_BASE_URL } from "./api-config";

export async function listBookingRequests(filters: { status?: BookingRequestStatus; type?: BookingRequestType } = {}): Promise<BookingRequest[]> {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.type) query.set("type", filters.type);
  const suffix = query.size ? `?${query.toString()}` : "";
  const response = await fetch(`${API_BASE_URL}/content/booking-requests${suffix}`);
  if (!response.ok) throw new Error("Unable to load booking requests");
  const payload = await response.json();
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function createBookingRequest(input: {
  type: BookingRequestType;
  provider?: string;
  packageId?: string;
  packageName?: string;
  customerName: string;
  phone: string;
  email?: string;
  selectedOption?: string;
}): Promise<BookingRequest> {
  const response = await fetch(`${API_BASE_URL}/content/booking-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Unable to submit booking request");
  const payload = await response.json();
  return payload.item;
}

export async function updateBookingRequest(requestId: string, changes: Partial<BookingRequest>): Promise<BookingRequest> {
  const response = await fetch(`${API_BASE_URL}/content/booking-requests/${encodeURIComponent(requestId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });
  if (!response.ok) throw new Error("Unable to update booking request");
  const payload = await response.json();
  return payload.item;
}
