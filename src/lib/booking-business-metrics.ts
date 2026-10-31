import type { BookingRecord } from "@/lib/booking-store";

export function isIssuedTicket(booking: BookingRecord) {
  return booking.type === "flight" && booking.status !== "cancelled" && booking.status !== "expired" &&
    (booking.status === "ticket_issued" || booking.ticketStatus === "issued");
}

function isSale(booking: BookingRecord) {
  if (booking.status === "cancelled" || booking.status === "expired") return false;
  return booking.paymentStatus === "paid" || booking.status === "payment_received" || booking.status === "ticket_issued" || booking.ticketStatus === "issued";
}

export function getBookingBusinessMetrics(bookings: BookingRecord[]) {
  const sold = bookings.filter(isSale);
  const hasValidSales = sold.every(booking => booking.pricing?.currency?.toUpperCase() === "PKR" && Number.isFinite(booking.pricing.total));
  const missingCostCount = sold.filter(booking => !Number.isFinite(booking.pricing?.supplierCost) || (booking.pricing?.supplierCost ?? -1) < 0).length;
  const totalSales = hasValidSales ? sold.reduce((sum, booking) => sum + booking.pricing.total, 0) : null;
  const grossProfit = totalSales !== null && missingCostCount === 0
    ? sold.reduce((sum, booking) => sum + booking.pricing.total - (booking.pricing.supplierCost ?? 0), 0)
    : null;

  return {
    totalBookings: bookings.length,
    issuedTickets: bookings.filter(isIssuedTicket).length,
    totalSales,
    grossProfit,
    missingCostCount,
  };
}

export function formatCompactAmount(amount: number) {
  const absolute = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  const compact = absolute >= 1_000_000
    ? `${(absolute / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
    : absolute >= 100_000
      ? `${(absolute / 1_000).toFixed(1).replace(/\.0$/, "")}K`
      : Math.round(absolute).toLocaleString("en-PK");
  return `${sign}${compact}`;
}

export function formatCompactPkr(amount: number) {
  return `PKR ${formatCompactAmount(amount)}`;
}
