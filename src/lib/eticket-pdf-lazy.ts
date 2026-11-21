import type { BookingRecord } from "@/lib/booking-store";

// The PDF library is large; checkout and My Bookings load it only when the traveller asks for the e-ticket.
export function downloadETicket(booking: BookingRecord): Promise<void> {
  return import("@/lib/eticket-pdf").then(module => module.downloadETicket(booking));
}
