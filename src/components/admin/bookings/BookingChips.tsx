import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { BOOKING_STATUS_LABEL, ISSUANCE_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/admin-bookings/format";
import type { BookingStatuses, PaymentStatus } from "@/lib/admin-bookings/types";

const CHIP = "inline-flex h-badge max-w-full items-center whitespace-nowrap rounded-pill px-2 text-label font-medium";

/** Imported (test) rows are labelled so they're never mistaken for live bookings. */
export function SampleDataBadge({ className }: { className?: string }) {
  return <span className={cn(CHIP, "border border-border bg-muted font-semibold text-foreground", className)}>Sample data</span>;
}

/** Booking, payment and issuance status, each a separate labelled chip (spec D5). */
export function StatusChips({ statuses, direction = "column" }: { statuses: BookingStatuses; direction?: "row" | "column" }) {
  return (
    <div className={cn("flex gap-1", direction === "column" ? "flex-col items-start" : "flex-wrap items-center")}>
      <span className={cn(CHIP, "border border-brand-navy/20 bg-accent text-brand-navy")} title="Booking status">{BOOKING_STATUS_LABEL[statuses.booking]}</span>
      <span className={cn(CHIP, "border border-border bg-muted text-foreground")} title="Payment status">{PAYMENT_STATUS_LABEL[statuses.payment]}</span>
      <span className={cn(CHIP, "border border-border bg-muted text-foreground")} title="Issuance status">{ISSUANCE_STATUS_LABEL[statuses.issuance]}</span>
    </div>
  );
}

/** Paid / Unpaid chip under an amount. */
export function PaidChip({ status }: { status: PaymentStatus }) {
  return <StatusBadge severity={status === "paid" ? "fine" : "action"}>{PAYMENT_STATUS_LABEL[status]}</StatusBadge>;
}
