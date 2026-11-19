import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Notice } from "@/components/admin/ui/feedback";
import { StatusBadge, Tag } from "@/components/admin/ui/StatusBadge";
import { cancelAtSupplier, checkAtSupplier } from "@/lib/admin-bookings/api";
import { formatDateTime } from "@/lib/admin-bookings/format";
import { GatewayError } from "@/lib/gateway/client";
import type { BookingDetail } from "@/lib/admin-bookings/types";

type Supplier = NonNullable<BookingDetail["supplier_booking"]>;

const CANCEL_STATE: Record<Supplier["cancel_state"], { label: string; severity?: "critical" | "action" | "fine" }> = {
  none: { label: "Not cancelled" },
  requested: { label: "Cancel requested, not confirmed yet", severity: "action" },
  confirmed: { label: "Cancelled at SooperFare", severity: "fine" },
  failed: { label: "Cancel failed", severity: "critical" },
};

/** SooperFare's own booking (supplier-names permission): its ids, cancel at SooperFare, and a read-only check. */
export function SupplierBookingCard({ booking }: { booking: BookingDetail }) {
  const supplier = booking.supplier_booking!;
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const done = (state: Supplier) => {
    setProblem(null);
    setNote(state.cancel_state === "confirmed" ? "SooperFare confirms the booking is cancelled."
      : state.cancel_state === "requested" ? "SooperFare accepted the cancel request but still shows the booking as active. Check again later."
      : "Checked with SooperFare.");
    void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
  };
  const failed = (error: unknown, fallback: string) => setProblem(error instanceof GatewayError ? error.message : fallback);
  const cancel = useMutation({
    mutationFn: () => cancelAtSupplier(booking.booking_id),
    onSuccess: state => { setConfirming(false); done(state as Supplier); },
    onError: error => { setConfirming(false); failed(error, "The cancel couldn't be sent. Nothing was changed."); },
  });
  const check = useMutation({
    mutationFn: () => checkAtSupplier(booking.booking_id),
    onSuccess: state => done(state as Supplier),
    onError: error => failed(error, "SooperFare couldn't be checked. Nothing was changed."),
  });
  const state = CANCEL_STATE[supplier.cancel_state];
  const busy = cancel.isPending || check.isPending;
  return (
    <section aria-labelledby="supplier-booking-title" className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card px-card py-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="supplier-booking-title" className="font-display text-section font-semibold text-brand-navy">SooperFare booking</h2>
        <Tag>Admin only</Tag>
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-body sm:grid-cols-2">
        <div className="min-w-0"><dt className="text-label text-muted-foreground">SooperFare order ref</dt><dd className="font-mono font-semibold">{supplier.order_ref ?? "—"}</dd></div>
        <div className="min-w-0"><dt className="text-label text-muted-foreground">SooperFare booking ID</dt><dd className="truncate font-mono" title={supplier.booking_id}>{supplier.booking_id}</dd></div>
        <div className="min-w-0"><dt className="text-label text-muted-foreground">Cancel</dt><dd>{state.severity ? <StatusBadge severity={state.severity}>{state.label}</StatusBadge> : state.label}
          {supplier.cancel_at && <span className="ml-2 text-label text-muted-foreground">{formatDateTime(supplier.cancel_at)}</span>}</dd></div>
        {supplier.status_at_supplier && <div className="min-w-0"><dt className="text-label text-muted-foreground">Status at SooperFare</dt><dd>{supplier.status_at_supplier}</dd></div>}
      </dl>
      {supplier.cancel_message && <Notice tone="critical">{supplier.cancel_message}</Notice>}
      <div className="flex flex-wrap gap-2">
        {supplier.can_cancel && supplier.cancel_state !== "confirmed" && (
          <Button type="button" variant="outline" disabled={busy} onClick={() => { setProblem(null); setConfirming(true); }}>Cancel at SooperFare</Button>
        )}
        <Button type="button" variant="outline" disabled={busy} onClick={() => check.mutate()}>{check.isPending ? "Checking…" : "Check with SooperFare"}</Button>
      </div>
      {note && !problem && <p role="status" className="text-body text-muted-foreground">{note}</p>}
      {problem && <p role="alert" className="text-body text-status-critical-text">{problem}</p>}
      <Dialog open={confirming} onOpenChange={open => { if (!cancel.isPending) setConfirming(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this booking at SooperFare?</DialogTitle>
            <DialogDescription>
              SooperFare is asked to cancel PNR {booking.pnr ?? "—"} ({supplier.order_ref ?? supplier.booking_id}). The seats may be released and can't be
              held again at this price. The booking shows as Cancelled only once SooperFare confirms it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={cancel.isPending} onClick={() => setConfirming(false)}>Keep booking</Button>
            <Button type="button" variant="destructive" disabled={cancel.isPending} onClick={() => cancel.mutate()}>{cancel.isPending ? "Cancelling…" : "Cancel at SooperFare"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
