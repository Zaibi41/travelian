import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { reholdAtSupplier } from "@/lib/admin-bookings/api";
import { formatMoney } from "@/lib/admin-bookings/format";
import { GatewayError } from "@/lib/gateway/client";
import type { BookingDetail } from "@/lib/admin-bookings/types";

type Money = { amount_minor: number; currency: string };
const asMoney = (value: unknown): Money | null =>
  value && typeof value === "object" && typeof (value as Money).amount_minor === "number" && typeof (value as Money).currency === "string" ? value as Money : null;

/** "Re-hold at SooperFare" (gateway#44): asks first at the booking's price. If SooperFare's price changed, the new and old
 *  totals are shown and nothing is held until staff press "Hold at Rs …". The gateway holds, verifies the new hold at
 *  SooperFare and only then changes the booking; refusals and failures show the gateway's own words. Shown only when the
 *  gateway offers it (supplier_booking.can_rehold). Used on the SooperFare card and on the Payments tab's hold-expired card. */
export function ReholdAtSupplier({ booking, disabled, onOpen, onHeld, onPendingChange }: {
  booking: BookingDetail; disabled?: boolean; onOpen?: () => void; onHeld?: (message: string) => void; onPendingChange?: (pending: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newPrice, setNewPrice] = useState<{ next: Money; before: Money } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const close = () => { setOpen(false); setNewPrice(null); setProblem(null); };
  const rehold = useMutation({
    mutationFn: (accept?: number) => reholdAtSupplier(booking.booking_id, accept),
    onMutate: () => onPendingChange?.(true),
    onSettled: () => onPendingChange?.(false),
    onSuccess: result => {
      close();
      onHeld?.(`Held again at SooperFare: ${(result as { message: string }).message.replace(/^held again: /, "")}.`);
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: error => {
      const next = error instanceof GatewayError && error.code === "price_changed" ? asMoney(error.extra.new_total) : null;
      const before = error instanceof GatewayError ? asMoney(error.extra.old_total) : null;
      if (next && before) { setNewPrice({ next, before }); setProblem(null); return; }
      setProblem(error instanceof GatewayError ? error.message : "The re-hold couldn't be sent. Nothing was held.");
    },
  });
  return (
    <>
      <Button type="button" className="h-11 sm:h-10" variant="primary" disabled={disabled || rehold.isPending}
        onClick={() => { onOpen?.(); setProblem(null); setOpen(true); }}>Re-hold at SooperFare</Button>
      <Dialog open={open} onOpenChange={next => { if (!rehold.isPending) { if (next) setOpen(true); else close(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{newPrice ? "The price has changed" : "Re-hold at SooperFare?"}</DialogTitle>
            <DialogDescription>
              {newPrice
                ? <>The same flights and fare now cost <strong className="text-foreground">{formatMoney(newPrice.next)}</strong> instead of {formatMoney(newPrice.before)}. Nothing has been held yet. Hold at the new price only if the customer agrees; the booking total changes to the new price.</>
                : <>SooperFare is asked to hold the same flights and fare again for the same travelers, at the booking's price of {formatMoney(booking.amount)}. If the price is different, you'll see it here first and nothing is held.</>}
            </DialogDescription>
          </DialogHeader>
          {problem && <p role="alert" className="text-body text-status-critical-text">{problem}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" className="h-11 sm:h-10" variant="outline" disabled={rehold.isPending} onClick={close}>{newPrice ? "Don't hold" : "Cancel"}</Button>
            <Button type="button" className="h-11 sm:h-10" variant="primary" disabled={rehold.isPending} onClick={() => rehold.mutate(newPrice?.next.amount_minor)}>
              {rehold.isPending ? "Holding…" : newPrice ? `Hold at ${formatMoney(newPrice.next)}` : "Re-hold at SooperFare"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
