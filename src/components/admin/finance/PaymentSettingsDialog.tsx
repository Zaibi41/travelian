// Card fee setting (travelian#74): the rate charged on card / 1Link payments and whether group fares carry it. The
// gateway validates, stores and audits the change; new checkouts use it. The fee is never refunded (owner's decision).
import { useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Notice } from "@/components/admin/ui/feedback";
import { FieldShell, Input } from "@/components/admin/ui/field";
import { Checkbox } from "@/components/admin/ui/choice";
import { bpsLabel, percentToBps, updatePaymentSettings, type PaymentSettings } from "@/lib/finance/api";

export function PaymentSettingsDialog({ settings, onClose }: { settings: PaymentSettings; onClose: () => void }) {
  const id = useId();
  const queryClient = useQueryClient();
  const [percent, setPercent] = useState(bpsLabel(settings.card_fee_bps).replace("%", ""));
  const [onGroup, setOnGroup] = useState(settings.card_fee_on_group);
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const bps = percentToBps(percent);
  const save = useMutation({
    mutationFn: () => updatePaymentSettings({ card_fee_bps: bps, card_fee_on_group: onGroup, reason: reason.trim() || null }),
    onSuccess: () => {
      toast.success("Card fee saved. New checkouts use it.");
      void queryClient.invalidateQueries({ queryKey: ["finance", "payment-settings"] });
      onClose();
    },
  });
  return (
    <Dialog open onOpenChange={open => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Card fee</DialogTitle>
          <DialogDescription>Charged on card and 1Link payments, shown to the customer before they pay. Not refunded.</DialogDescription>
        </DialogHeader>
        <form id={id} className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); setTouched(true); if (bps !== null) save.mutate(); }}>
          <FieldShell id={`${id}-percent`} label="Fee (%)" error={touched && bps === null ? "Enter 0 to 10, for example 3 or 2.5." : undefined}>
            <Input id={`${id}-percent`} inputMode="decimal" value={percent} onChange={event => setPercent(event.target.value)} />
          </FieldShell>
          <label className="flex items-center gap-2 text-body">
            <Checkbox checked={onGroup} onCheckedChange={value => setOnGroup(value === true)} /> Also on group fares
          </label>
          <FieldShell id={`${id}-reason`} label="Reason (kept in the audit log)">
            <Input id={`${id}-reason`} value={reason} maxLength={500} onChange={event => setReason(event.target.value)} />
          </FieldShell>
          {save.error && <Notice tone="critical">{save.error.message}</Notice>}
        </form>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form={id} variant="primary" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
