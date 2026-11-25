import { useId, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { EmptyState, LoadingCards, Notice } from "@/components/admin/ui/feedback";
import { FieldShell, Input, Textarea } from "@/components/admin/ui/field";
import { FilterSelect } from "@/components/admin/ui/FilterSelect";
import { LabeledSelect } from "@/components/admin/ui/LabeledSelect";
import { StatusBadge, Tag } from "@/components/admin/ui/StatusBadge";
import { TABLE } from "@/components/admin/ui/classes";
import { StatusKpiCard } from "@/components/admin/StatusKpiCard";
import { FinanceForbidden, FinancePageHeader, isForbidden, moneyOrDash } from "@/components/admin/finance/FinanceShared";
import { rupeesToPaisa } from "@/lib/admin-bookings/payments";
import {
  REFUND_STATUS, applySupplierRefund, fetchSuppliers, fetchSupplierRefunds, moveSupplierRefund, openSupplierRefund, type SupplierRefund,
} from "@/lib/finance/ops-api";
import { cn } from "@/lib/utils";

// Finance > Supplier Refunds: money a supplier owes Travelian back (a cancelled or changed ticket). Requested → Chased →
// Received → Written off. "Apply as credit" pays a booking's supplier charge from it instead of fresh cash (D56).
const ALL = "all";
const STATUS_TONE: Record<SupplierRefund["status"], "action" | "critical" | "fine" | undefined> = { requested: "action", chased: "critical", received: "fine", written_off: undefined };

export default function SupplierRefundsPage() {
  const [params, setParams] = useSearchParams();
  const status = (["requested", "chased", "received", "written_off"] as const).find(value => value === params.get("status"));
  const supplierId = params.get("supplier") ?? undefined;
  const refunds = useQuery({
    queryKey: ["finance", "supplier-refunds", status ?? ALL, supplierId ?? ALL],
    queryFn: ({ signal }) => fetchSupplierRefunds({ status, supplier_id: supplierId }, { signal }),
  });
  const suppliers = useQuery({ queryKey: ["finance", "suppliers"], queryFn: ({ signal }) => fetchSuppliers({ signal }), enabled: !isForbidden(refunds.error) });
  const [opening, setOpening] = useState(false);
  const [moving, setMoving] = useState<{ refund: SupplierRefund; to: string } | null>(null);
  const [applying, setApplying] = useState<SupplierRefund | null>(null);
  const setParam = (key: string, value: string) => setParams(current => { const next = new URLSearchParams(current); if (value === ALL) next.delete(key); else next.set(key, value); return next; }, { replace: true });
  const items = refunds.data?.items ?? [];
  return (
    <div className="min-w-0 space-y-6 animate-fade-in">
      <FinancePageHeader title="Supplier Refunds" description="Money suppliers owe Travelian back, from request to receipt. An open refund can pay a booking's supplier charge as credit."
        action={!isForbidden(refunds.error) && <Button variant="primary" onClick={() => setOpening(true)}><Plus aria-hidden="true" /> Log refund</Button>} />
      {isForbidden(refunds.error) ? <FinanceForbidden /> : (
        <>
          {refunds.data && (
            <div className="grid grid-cols-2 gap-card-gap sm:max-w-lg">
              <StatusKpiCard size="sm" label="Pending refunds" value={String(refunds.data.pending_count)} severity={refunds.data.pending_count ? "action" : "fine"} />
              <StatusKpiCard size="sm" label="Pending total" value={moneyOrDash(refunds.data.pending_total)} severity={refunds.data.pending_count ? "action" : "fine"} showBadge={false} />
            </div>
          )}
          <div role="group" aria-label="Supplier refund filters" className="flex flex-wrap gap-2">
            <FilterSelect id="refunds-status" label="Status" value={status ?? ALL} onChange={value => setParam("status", value)}
              options={[{ value: ALL, label: "All" }, ...Object.entries(REFUND_STATUS).map(([value, label]) => ({ value, label }))]} />
            <FilterSelect id="refunds-supplier" label="Supplier" value={supplierId ?? ALL} onChange={value => setParam("supplier", value)}
              options={[{ value: ALL, label: "All" }, ...(suppliers.data?.suppliers ?? []).map(s => ({ value: s.id, label: s.name }))]} />
          </div>
          {refunds.isPending && <LoadingCards count={3} label="Loading supplier refunds" itemClassName="h-12" />}
          {refunds.error && <Notice tone="critical">{refunds.error.message}</Notice>}
          {refunds.data && items.length === 0 && <EmptyState title="No supplier refunds here.">Log a refund when a supplier owes Travelian money back.</EmptyState>}
          {items.length > 0 && (
            <div className={cn(TABLE.wrap, "relative")}>
              <table className={cn(TABLE.table, "min-w-[62rem]")}>
                <thead>
                  <tr className={TABLE.headRow}>
                    {["#", "Supplier", "Linked booking", "Amount", "Left to use", "Reason", "Status", "Opened", "Days outstanding", ""].map(column => (
                      <th key={column || "actions"} scope="col" className={cn(TABLE.th, ["Amount", "Left to use", "Days outstanding"].includes(column) && "text-right")}>{column || <span className="sr-only">Actions</span>}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(refund => (
                    <tr key={refund.id} className={TABLE.row}>
                      <td className={cn(TABLE.td, "tabular-nums")}>{refund.number}</td>
                      <td className={cn(TABLE.td, "max-w-[10rem] truncate font-medium")} title={refund.supplier_name}>{refund.supplier_name}</td>
                      <td className={cn(TABLE.td, "whitespace-nowrap")}>
                        {refund.booking_reference
                          ? <Link to={`/admin/bookings/${encodeURIComponent(refund.booking_reference)}`} className="text-primary underline-offset-2 hover:underline">{refund.booking_reference}</Link>
                          : <span className="text-muted-foreground">{refund.reference ?? "—"}</span>}
                      </td>
                      <td className={cn(TABLE.td, "whitespace-nowrap text-right tabular-nums")}>{moneyOrDash(refund.amount)}</td>
                      <td className={cn(TABLE.td, "whitespace-nowrap text-right tabular-nums")}>{moneyOrDash(refund.remaining)}</td>
                      <td className={cn(TABLE.td, "max-w-[14rem] truncate")} title={refund.reason}>{refund.reason}</td>
                      <td className={TABLE.td}>
                        {STATUS_TONE[refund.status] ? <StatusBadge severity={STATUS_TONE[refund.status]!}>{REFUND_STATUS[refund.status]}</StatusBadge> : <Tag>{REFUND_STATUS[refund.status]}</Tag>}
                      </td>
                      <td className={cn(TABLE.td, "whitespace-nowrap tabular-nums")}>{refund.opened_on}</td>
                      <td className={cn(TABLE.td, "text-right tabular-nums")}>{refund.status === "requested" || refund.status === "chased" ? refund.days_outstanding : "—"}</td>
                      <td className={cn(TABLE.td, "whitespace-nowrap text-right")}>
                        <span className="flex justify-end gap-1">
                          {refund.can_apply_credit && <Button size="sm" variant="primary" onClick={() => setApplying(refund)}>Apply as credit</Button>}
                          {refund.next_statuses.map(next => (
                            <Button key={next} size="sm" variant="outline" onClick={() => setMoving({ refund, to: next })}>{next === "written_off" ? "Write off" : `Mark ${REFUND_STATUS[next as SupplierRefund["status"]].toLowerCase()}`}</Button>
                          ))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {opening && <OpenRefundDialog suppliers={(suppliers.data?.suppliers ?? []).map(s => ({ value: s.id, label: s.name }))} onClose={() => setOpening(false)} />}
      {moving && <MoveDialog refund={moving.refund} to={moving.to as "chased" | "received" | "written_off"} onClose={() => setMoving(null)} />}
      {applying && <ApplyCreditDialog refund={applying} onClose={() => setApplying(null)} />}
    </div>
  );
}

function OpenRefundDialog({ suppliers, onClose }: { suppliers: { value: string; label: string }[]; onClose: () => void }) {
  const id = useId();
  const queryClient = useQueryClient();
  const [supplier, setSupplier] = useState("none");
  const [booking, setBooking] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const paisa = rupeesToPaisa(amount);
  const problem = supplier === "none" ? "Choose the supplier." : !paisa ? "Enter the amount." : !reason.trim() ? "Say why the supplier owes it." : null;
  const save = useMutation({
    mutationFn: () => openSupplierRefund({ supplier_id: supplier, booking_reference: booking.trim().toUpperCase() || null, reference: reference.trim() || null, amount_minor: paisa!, reason: reason.trim() }),
    onSuccess: refund => { toast.success(`Supplier refund #${refund.number} logged.`); void queryClient.invalidateQueries({ queryKey: ["finance"] }); onClose(); },
  });
  return (
    <Dialog open onOpenChange={open => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log supplier refund</DialogTitle>
          <DialogDescription>Money a supplier owes Travelian back. It doesn't change the supplier balance until it's used as credit.</DialogDescription>
        </DialogHeader>
        <form id={id} className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); setTouched(true); if (!problem) save.mutate(); }}>
          <LabeledSelect id={`${id}-supplier`} label="Supplier" value={supplier} onChange={setSupplier} options={[{ value: "none", label: "Choose the supplier" }, ...suppliers]} />
          <div className="grid grid-cols-2 gap-2">
            <FieldShell id={`${id}-booking`} label="Linked booking (optional)"><Input id={`${id}-booking`} value={booking} maxLength={32} placeholder="TRV-…" onChange={event => setBooking(event.target.value)} /></FieldShell>
            <FieldShell id={`${id}-ref`} label="Supplier reference (optional)"><Input id={`${id}-ref`} value={reference} maxLength={64} onChange={event => setReference(event.target.value)} /></FieldShell>
          </div>
          <FieldShell id={`${id}-amount`} label="Amount (Rs)"><Input id={`${id}-amount`} inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} /></FieldShell>
          <FieldShell id={`${id}-reason`} label="Reason"><Textarea id={`${id}-reason`} rows={2} value={reason} maxLength={1000} onChange={event => setReason(event.target.value)} /></FieldShell>
          {touched && problem && <Notice tone="critical">{problem}</Notice>}
          {save.error && <Notice tone="critical">{save.error.message}</Notice>}
        </form>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form={id} variant="primary" disabled={save.isPending}>{save.isPending ? "Saving…" : "Log refund"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MoveDialog({ refund, to, onClose }: { refund: SupplierRefund; to: "chased" | "received" | "written_off"; onClose: () => void }) {
  const id = useId();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const writeOff = to === "written_off";
  const save = useMutation({
    mutationFn: () => moveSupplierRefund(refund.id, { status: to, note: note.trim() || null }),
    onSuccess: () => { toast.success(`Refund #${refund.number}: ${REFUND_STATUS[to]}.`); void queryClient.invalidateQueries({ queryKey: ["finance"] }); onClose(); },
  });
  return (
    <Dialog open onOpenChange={open => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{writeOff ? `Write off refund #${refund.number}?` : `Mark refund #${refund.number} ${REFUND_STATUS[to].toLowerCase()}`}</DialogTitle>
          <DialogDescription>
            {writeOff ? `${moneyOrDash(refund.remaining)} from ${refund.supplier_name} won't be collected. This can't be undone.`
              : to === "received" ? `${refund.supplier_name} paid ${moneyOrDash(refund.remaining)} back.` : `You followed up with ${refund.supplier_name}.`}
          </DialogDescription>
        </DialogHeader>
        <form id={id} onSubmit={event => { event.preventDefault(); if (!writeOff || note.trim()) save.mutate(); }}>
          <FieldShell id={`${id}-note`} label={writeOff ? "Why it's written off" : "Note (optional)"}>
            <Input id={`${id}-note`} value={note} maxLength={500} onChange={event => setNote(event.target.value)} />
          </FieldShell>
          {save.error && <Notice tone="critical" className="mt-3">{save.error.message}</Notice>}
        </form>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form={id} variant={writeOff ? "destructive" : "primary"} disabled={save.isPending || (writeOff && !note.trim())}>
            {save.isPending ? "Saving…" : writeOff ? "Write off" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApplyCreditDialog({ refund, onClose }: { refund: SupplierRefund; onClose: () => void }) {
  const id = useId();
  const queryClient = useQueryClient();
  const [booking, setBooking] = useState("");
  const [billable, setBillable] = useState("");
  const [touched, setTouched] = useState(false);
  const billablePaisa = billable.trim() ? rupeesToPaisa(billable) : null;
  const problem = !/^TRV-[A-Z0-9-]{3,}$/i.test(booking.trim()) ? "Enter the booking reference (TRV-…)." : billable.trim() && !billablePaisa ? "Enter the amount in rupees, or leave it empty." : null;
  const save = useMutation({
    mutationFn: () => applySupplierRefund(refund.id, { booking_reference: booking.trim().toUpperCase(), billable_minor: billablePaisa }),
    onSuccess: updated => {
      toast.success(`Credit applied. ${moneyOrDash(updated.remaining)} left on refund #${refund.number}.`);
      void queryClient.invalidateQueries({ queryKey: ["finance"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-booking"] });
      onClose();
    },
  });
  return (
    <Dialog open onOpenChange={open => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply refund #{refund.number} as credit</DialogTitle>
          <DialogDescription>
            Pays a booking's {refund.supplier_name} charge from this refund ({moneyOrDash(refund.remaining)} left) instead of fresh payment.
            If the charge is more, the supplier balance pays the rest, and it's refused if that would take it below zero.
          </DialogDescription>
        </DialogHeader>
        <form id={id} className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); setTouched(true); if (!problem) save.mutate(); }}>
          <FieldShell id={`${id}-booking`} label="Booking reference"><Input id={`${id}-booking`} value={booking} maxLength={32} placeholder="TRV-…" onChange={event => setBooking(event.target.value)} /></FieldShell>
          <FieldShell id={`${id}-billable`} label="Supplier billable amount (Rs). Leave empty if already set on the booking.">
            <Input id={`${id}-billable`} inputMode="decimal" value={billable} onChange={event => setBillable(event.target.value)} />
          </FieldShell>
          {touched && problem && <Notice tone="critical">{problem}</Notice>}
          {save.error && <Notice tone="critical">{save.error.message}</Notice>}
        </form>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form={id} variant="primary" disabled={save.isPending}>{save.isPending ? "Applying…" : "Apply as credit"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
