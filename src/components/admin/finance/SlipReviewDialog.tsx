// Check a customer's payment slip (gateway#56, travelian#69): see the file through a short-lived signed link, then
// confirm what actually arrived (records the payment) or reject it with a reason. The gateway records and audits it.
import { useEffect, useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { LoadingCards, Notice } from "@/components/admin/ui/feedback";
import { FieldShell, Input, Textarea } from "@/components/admin/ui/field";
import { LabeledSelect } from "@/components/admin/ui/LabeledSelect";
import { fetchPaymentAccounts } from "@/lib/admin-bookings/api";
import { formatMoney } from "@/lib/admin-bookings/format";
import { PAYMENT_METHOD_LABEL, paisaToInput, receivedAtIso, rupeesToPaisa } from "@/lib/admin-bookings/payments";
import { confirmSlip, fetchSlipLink, rejectSlip, type FinancePayment } from "@/lib/finance/api";
import { pktDay } from "@/lib/finance/date-range";

export function SlipPreview({ slipId }: { slipId: string }) {
  const link = useQuery({ queryKey: ["finance", "slip-link", slipId], queryFn: () => fetchSlipLink(slipId), staleTime: 60_000, gcTime: 120_000 });
  if (link.isPending) return <LoadingCards count={1} label="Opening the slip" itemClassName="h-64" />;
  if (link.error) return <Notice tone="critical">{link.error.message}</Notice>;
  const { url, content_type: type } = link.data;
  return (
    <div className="flex flex-col gap-2">
      {type === "application/pdf" ? (
        <iframe src={url} title="Payment slip (PDF)" className="h-[35vh] w-full rounded-lg border bg-white" />
      ) : (
        <img src={url} alt="Payment slip" className="max-h-[35vh] w-full rounded-lg border bg-white object-contain" />
      )}
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 self-start text-body font-medium text-primary underline-offset-2 hover:underline">
        <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open in a new tab (link works for 5 minutes)
      </a>
    </div>
  );
}

export function SlipReviewDialog({ payment, onClose }: { payment: FinancePayment; onClose: () => void }) {
  const queryClient = useQueryClient();
  const formId = useId();
  const awaiting = payment.status === "awaiting_check";
  const [mode, setMode] = useState<"confirm" | "reject">("confirm");
  const [amount, setAmount] = useState(paisaToInput(payment.amount.amount_minor));
  const [accountId, setAccountId] = useState(payment.account_id ?? payment.chosen_account_id ?? "");
  const [reference, setReference] = useState(payment.payer_reference ?? "");
  const [date, setDate] = useState(pktDay(new Date()));
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const accounts = useQuery({ queryKey: ["admin-bookings", "payment-accounts"], queryFn: ({ signal }) => fetchPaymentAccounts({ signal }), enabled: awaiting });
  const options = (accounts.data?.accounts ?? []).filter(account => account.method === payment.method);
  useEffect(() => { if (!accountId && options.length === 1) setAccountId(options[0].id); }, [accountId, options]);

  const done = (message: string) => {
    toast.success(message);
    void queryClient.invalidateQueries({ queryKey: ["finance"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    onClose();
  };
  const confirm = useMutation({
    mutationFn: (body: Parameters<typeof confirmSlip>[1]) => confirmSlip(payment.slip_id!, body),
    onSuccess: () => done(`Payment confirmed on ${payment.booking_reference}.`),
  });
  const reject = useMutation({
    mutationFn: () => rejectSlip(payment.slip_id!, reason.trim()),
    onSuccess: () => done(`Slip rejected on ${payment.booking_reference}. Nothing was recorded as paid.`),
  });
  const paisa = rupeesToPaisa(amount);
  const receivedAt = receivedAtIso(date, time);
  const submit = () => {
    setTouched(true);
    if (mode === "reject") { if (reason.trim()) reject.mutate(); return; }
    if (paisa && accountId && receivedAt) confirm.mutate({ amount_minor: paisa, account_id: accountId, payer_reference: reference.trim() || null, received_at: receivedAt });
  };
  const pending = confirm.isPending || reject.isPending;
  const error = confirm.error ?? reject.error;

  return (
    <Dialog open onOpenChange={open => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{awaiting ? "Check payment slip" : "Payment slip"}</DialogTitle>
          <DialogDescription>
            {payment.booking_reference} · {PAYMENT_METHOD_LABEL[payment.method]} · customer says {formatMoney(payment.amount)}
            {payment.account_label ? ` into ${payment.account_label}` : ""}{payment.payer_reference ? ` · ref ${payment.payer_reference}` : ""}
          </DialogDescription>
        </DialogHeader>
        {payment.slip_id && <SlipPreview slipId={payment.slip_id} />}
        {payment.status === "rejected" && payment.rejection_reason && <Notice tone="critical">Rejected: {payment.rejection_reason}</Notice>}
        {awaiting && (
          <form id={formId} className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); submit(); }}>
            <div role="radiogroup" aria-label="Decision" className="flex gap-2">
              {(["confirm", "reject"] as const).map(value => (
                <Button key={value} type="button" role="radio" aria-checked={mode === value} variant={mode === value ? "secondary" : "outline"} size="sm"
                  onClick={() => setMode(value)}>
                  {value === "confirm" ? "The money arrived" : "Reject the slip"}
                </Button>
              ))}
            </div>
            {mode === "confirm" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldShell id={`${formId}-amount`} label="Amount received (Rs)" error={touched && !paisa ? "Enter the amount that arrived." : undefined}>
                  <Input id={`${formId}-amount`} inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} />
                </FieldShell>
                <LabeledSelect id={`${formId}-account`} label="Received into" value={accountId || "none"} onChange={value => setAccountId(value === "none" ? "" : value)}
                  options={[{ value: "none", label: accounts.isPending ? "Loading accounts…" : "Choose the account" },
                    ...options.map(account => ({ value: account.id, label: account.label }))]}
                  note={touched && !accountId ? "Choose the account the money arrived in." : undefined} />
                <FieldShell id={`${formId}-reference`} label="Bank / JazzCash reference">
                  <Input id={`${formId}-reference`} value={reference} maxLength={64} onChange={event => setReference(event.target.value)} />
                </FieldShell>
                <div className="grid grid-cols-2 gap-2">
                  <FieldShell id={`${formId}-date`} label="Received on" error={touched && !receivedAt ? "Enter a date and time (24-hour)." : undefined}>
                    <Input id={`${formId}-date`} type="date" value={date} onChange={event => setDate(event.target.value)} />
                  </FieldShell>
                  <FieldShell id={`${formId}-time`} label="Time">
                    <Input id={`${formId}-time`} value={time} placeholder="14:05" onChange={event => setTime(event.target.value)} />
                  </FieldShell>
                </div>
              </div>
            ) : (
              <FieldShell id={`${formId}-reason`} label="Why is it rejected?" error={touched && !reason.trim() ? "Say why, in plain words." : undefined}>
                <Textarea id={`${formId}-reason`} value={reason} maxLength={500} onChange={event => setReason(event.target.value)}
                  placeholder="For example: no money arrived in Meezan Bank by 5 pm" />
              </FieldShell>
            )}
            {error && <Notice tone="critical">{error.message}</Notice>}
          </form>
        )}
        <DialogFooter className="sticky bottom-0 -mb-1 gap-2 border-t bg-background pt-3">
          <Button variant="outline" onClick={onClose} disabled={pending}>{awaiting ? "Cancel" : "Close"}</Button>
          {awaiting && (
            <Button type="submit" form={formId} variant={mode === "reject" ? "destructive" : "primary"} disabled={pending}>
              {pending ? "Saving…" : mode === "reject" ? "Reject slip" : "Confirm payment"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
