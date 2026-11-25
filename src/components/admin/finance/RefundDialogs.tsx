// Refunds (travelian#69/#91): record that a customer is owed a refund, approve it, record the payout staff made outside
// Travelian (bank, JazzCash, PayFast portal), or reject it with a reason. The gateway checks amounts and audits every
// step; nothing here sends money.
import { useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Notice } from "@/components/admin/ui/feedback";
import { FieldShell, Input, Textarea } from "@/components/admin/ui/field";
import { LabeledSelect } from "@/components/admin/ui/LabeledSelect";
import { formatMoney } from "@/lib/admin-bookings/format";
import { paisaToInput, receivedAtIso, rupeesToPaisa } from "@/lib/admin-bookings/payments";
import { approveRefund, markRefundPaid, rejectRefund, requestRefund, type Refund, type RefundsDue } from "@/lib/finance/api";
import { pktDay } from "@/lib/finance/date-range";

export const REFUND_METHOD_LABEL: Record<Refund["method"], string> = {
  bank_transfer: "Bank transfer", jazzcash: "JazzCash", "1link": "1Link", payfast: "PayFast (card reversal)", alfalah: "Bank Alfalah (card reversal)",
};
export const REFUND_STATUS_LABEL: Record<Refund["status"], string> = { requested: "Requested", approved: "Approved", paid: "Paid", rejected: "Rejected" };

function useDone(onClose: () => void) {
  const queryClient = useQueryClient();
  return (message: string) => {
    toast.success(message);
    void queryClient.invalidateQueries({ queryKey: ["finance"] });
    onClose();
  };
}

export function RequestRefundDialog({ owed, onClose }: { owed: RefundsDue["owed"][number]; onClose: () => void }) {
  const id = useId();
  const done = useDone(onClose);
  const [amount, setAmount] = useState(paisaToInput(owed.refundable.amount_minor));
  const [method, setMethod] = useState<Refund["method"]>("bank_transfer");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const save = useMutation({
    mutationFn: (amount_minor: number) => requestRefund(owed.booking_reference, { amount_minor, method, reason: reason.trim() }),
    onSuccess: () => done(`Refund recorded for ${owed.booking_reference}. Approve it, then mark it paid once the money is sent.`),
  });
  const paisa = rupeesToPaisa(amount);
  return (
    <Dialog open onOpenChange={open => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record refund</DialogTitle>
          <DialogDescription>{owed.booking_reference} · up to {formatMoney(owed.refundable)} can be refunded (card fees are not refunded).</DialogDescription>
        </DialogHeader>
        <form id={id} className="flex flex-col gap-3" onSubmit={event => {
          event.preventDefault(); setTouched(true);
          if (paisa && reason.trim()) save.mutate(paisa);
        }}>
          <FieldShell id={`${id}-amount`} label="Amount (Rs)" error={touched && !paisa ? "Enter the amount to refund." : undefined}>
            <Input id={`${id}-amount`} inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} />
          </FieldShell>
          <LabeledSelect id={`${id}-method`} label="Paid back by" value={method} onChange={value => setMethod(value as Refund["method"])}
            options={Object.entries(REFUND_METHOD_LABEL).map(([value, label]) => ({ value, label }))} />
          <FieldShell id={`${id}-reason`} label="Reason" error={touched && !reason.trim() ? "Say why the customer is refunded." : undefined}>
            <Textarea id={`${id}-reason`} value={reason} maxLength={500} onChange={event => setReason(event.target.value)} />
          </FieldShell>
          {save.error && <Notice tone="critical">{save.error.message}</Notice>}
        </form>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form={id} variant="primary" disabled={save.isPending}>{save.isPending ? "Saving…" : "Record refund"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The next step for an open refund: approve (requested), mark paid (approved), or reject (either). */
export function RefundStepDialog({ refund, step, onClose }: { refund: Refund; step: "approve" | "paid" | "reject"; onClose: () => void }) {
  const id = useId();
  const done = useDone(onClose);
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(pktDay(new Date()));
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const paidAt = receivedAtIso(date, time);
  const save = useMutation({
    mutationFn: async () => step === "approve" ? approveRefund(refund.id)
      : step === "paid" ? markRefundPaid(refund.id, { payout_reference: reference.trim(), paid_at: paidAt! })
        : rejectRefund(refund.id, reason.trim()),
    onSuccess: () => done(step === "approve" ? "Refund approved." : step === "paid" ? "Refund marked paid." : "Refund rejected."),
  });
  const valid = step === "approve" || (step === "paid" ? !!reference.trim() && !!paidAt : !!reason.trim());
  const title = step === "approve" ? "Approve refund" : step === "paid" ? "Mark refund paid" : "Reject refund";
  return (
    <Dialog open onOpenChange={open => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {refund.booking_reference} · {formatMoney(refund.amount)} by {REFUND_METHOD_LABEL[refund.method]}. Reason: {refund.reason}
          </DialogDescription>
        </DialogHeader>
        <form id={id} className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); setTouched(true); if (valid) save.mutate(); }}>
          {step === "approve" && <p className="text-body text-muted-foreground">Approving doesn't send money. Send it, then mark the refund paid.</p>}
          {step === "paid" && (
            <>
              <p className="text-body text-muted-foreground">Record a payout you already made. Travelian doesn't send the money.</p>
              <FieldShell id={`${id}-ref`} label="Payout reference" error={touched && !reference.trim() ? "Enter the bank or PayFast transaction reference." : undefined}>
                <Input id={`${id}-ref`} value={reference} maxLength={120} onChange={event => setReference(event.target.value)} />
              </FieldShell>
              <div className="grid grid-cols-2 gap-2">
                <FieldShell id={`${id}-date`} label="Paid on" error={touched && !paidAt ? "Enter a date and time (24-hour)." : undefined}>
                  <Input id={`${id}-date`} type="date" value={date} onChange={event => setDate(event.target.value)} />
                </FieldShell>
                <FieldShell id={`${id}-time`} label="Time"><Input id={`${id}-time`} value={time} onChange={event => setTime(event.target.value)} /></FieldShell>
              </div>
            </>
          )}
          {step === "reject" && (
            <FieldShell id={`${id}-reason`} label="Why is it rejected?" error={touched && !reason.trim() ? "Say why, in plain words." : undefined}>
              <Textarea id={`${id}-reason`} value={reason} maxLength={500} onChange={event => setReason(event.target.value)} />
            </FieldShell>
          )}
          {save.error && <Notice tone="critical">{save.error.message}</Notice>}
        </form>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form={id} variant={step === "reject" ? "destructive" : "primary"} disabled={save.isPending}>
            {save.isPending ? "Saving…" : title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
