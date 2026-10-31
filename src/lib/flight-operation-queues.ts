import type { BookingRecord } from "@/lib/booking-store";

export type FlightOperationQueue = "approval" | "payment" | "failed" | "expiring";

function isOpenHold(booking: BookingRecord) {
  return booking.status === "held" || booking.status === "pending_payment";
}

function holdDeadline(booking: BookingRecord) {
  const deadline = booking.holdExpiresAt ? new Date(booking.holdExpiresAt).getTime() : NaN;
  return Number.isFinite(deadline) ? deadline : null;
}

export function matchesFlightOperation(booking: BookingRecord, queue: FlightOperationQueue, now = new Date()) {
  if (booking.type !== "flight") return false;
  const deadline = holdDeadline(booking);
  const overdueHold = isOpenHold(booking) && deadline !== null && deadline <= now.getTime();

  switch (queue) {
    case "approval":
      return (booking.status === "payment_received" || booking.status === "confirmed") && booking.ticketStatus !== "issued";
    case "payment":
      return isOpenHold(booking) && booking.paymentStatus !== "paid" && !overdueHold;
    case "failed":
      return booking.status === "expired" || overdueHold;
    case "expiring":
      return isOpenHold(booking) && !overdueHold && deadline !== null && deadline <= now.getTime() + 24 * 60 * 60 * 1000;
  }
}
