import { Notice } from "@/components/admin/ui/feedback";
import { formatDateTime } from "@/lib/admin-bookings/format";
import type { BookingDetail } from "@/lib/admin-bookings/types";

const EMAIL_LABEL: Record<string, string> = {
  booking_held: "Seats held (pay by card)", book_only_held: "Seats held (Book Only)", bank_transfer: "Bank transfer details",
  jazzcash: "JazzCash details", payment_received: "Payment received", ticket_issued: "E-ticket", issuance_pending: "Ticket being issued",
  paid_not_ticketed: "Couldn't issue: refund or rebook", hold_expired: "Hold ended", booking_cancelled: "Booking cancelled",
};

/** Customer emails that weren't delivered (e.g. SES sandbox): staff contact the customer instead. */
export function EmailNotSentNotice({ booking }: { booking: BookingDetail }) {
  const problems = booking.customer_email_problems ?? [];
  if (!problems.length) return null;
  return (
    <Notice tone="action" title={problems.length === 1 ? "Email not sent to the customer" : `${problems.length} emails not sent to the customer`}>
      <ul className="flex flex-col gap-1">
        {problems.map(problem => (
          <li key={problem.email}>
            <span className="font-semibold">{EMAIL_LABEL[problem.email] ?? problem.email}</span>
            <span className="text-muted-foreground"> · {formatDateTime(problem.at)}</span>
            {problem.reason && <span className="block text-label">{problem.reason}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-1">Contact the customer by phone or WhatsApp with these details.</p>
    </Notice>
  );
}
