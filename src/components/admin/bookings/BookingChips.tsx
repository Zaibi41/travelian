import { StatusBadge, Tag } from "@/components/admin/ui/StatusBadge";
import { cn } from "@/lib/utils";
import { BOOKING_STATUS_LABEL, ISSUANCE_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/admin-bookings/format";
import type { BookingStatuses, PaymentStatus } from "@/lib/admin-bookings/types";

/** Test rows (imported sample data, supplier UAT holds) are labelled so they're never mistaken for live bookings. */
export function SampleDataBadge({ className, label = "Imported" }: { className?: string; label?: string | null }) {
  return <Tag className={className}>{label ?? "Imported"}</Tag>;
}

/** Booking, payment and issuance status, each a separate labelled chip (spec D5). */
export function StatusChips({ statuses, direction = "column" }: { statuses: BookingStatuses; direction?: "row" | "column" }) {
  return (
    <div className={cn("flex gap-1", direction === "column" ? "flex-col items-start" : "flex-wrap items-center")}>
      <Tag tone="navy" title="Booking status">{BOOKING_STATUS_LABEL[statuses.booking]}</Tag>
      <Tag title="Payment status">{PAYMENT_STATUS_LABEL[statuses.payment]}</Tag>
      {statuses.issuance === "unknown"
        ? <StatusBadge severity="critical">{ISSUANCE_STATUS_LABEL.unknown}</StatusBadge>
        : <Tag title="Issuance status">{ISSUANCE_STATUS_LABEL[statuses.issuance]}</Tag>}
    </div>
  );
}

/** Paid / Unpaid chip under an amount. */
export function PaidChip({ status }: { status: PaymentStatus }) {
  return <StatusBadge severity={status === "paid" ? "fine" : "action"}>{PAYMENT_STATUS_LABEL[status]}</StatusBadge>;
}
