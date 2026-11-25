import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Notice } from "@/components/admin/ui/feedback";
import { FieldShell, Input, Textarea } from "@/components/admin/ui/field";
import { LabeledSelect } from "@/components/admin/ui/LabeledSelect";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { formatDateTime, formatMoney } from "@/lib/admin-bookings/format";
import { paisaToInput, rupeesToPaisa } from "@/lib/admin-bookings/payments";
import type { BookingDetail } from "@/lib/admin-bookings/types";
import { SHORTFALL_REASONS, acceptPaymentShortfall, setSoldThrough, setSupplierBillable, settleSupplierBilling } from "@/lib/finance/ops-api";

// Booking detail, issue 202: the supplier billable amount and its settlement (Supplier payment tab), an accepted payment
// difference (Payments tab, D57) and the channel the booking was sold through (Overview). The gateway decides who may
// change them (can_edit / can_accept_shortfall / can_edit_sold_through) and enforces the negative-balance block (D52).
const CARD = "flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card px-card py-3.5 shadow-card";
const NONE = "none";

function useRefresh() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    void queryClient.invalidateQueries({ queryKey: ["finance"] });
  };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="contents">
      <dt className="border-b border-border bg-muted px-2.5 py-2 text-body font-semibold text-foreground">{label}</dt>
      <dd className="min-w-0 break-words border-b border-border px-2.5 py-2 text-body text-foreground">{children}</dd>
    </div>
  );
}

/** Supplier payment tab: what the supplier actually bills (one figure the Fare and Payments tabs read) and how it was paid. */
export function SupplierPaymentPanel({ booking }: { booking: BookingDetail }) {
  const payment = booking.supplier_payment!;
  const [editing, setEditing] = useState(false);
  const [settling, setSettling] = useState(false);
  const settled = !!payment.settled_at;
  const canEdit = payment.available && payment.can_edit && !settled;
  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      <section aria-label="Supplier payment" className="rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
        <dl className="grid grid-cols-1 sm:grid-cols-[minmax(10rem,16rem)_minmax(0,1fr)]">
          <Row label="Amount due"><span className="tabular-nums">{payment.amount_due ? formatMoney(payment.amount_due) : "—"}</span></Row>
          <Row label="Hold deadline"><span className="tabular-nums">{formatDateTime(payment.hold_deadline)}</span></Row>
          {payment.available && (
            <>
              <Row label="Supplier billable amount">
                {payment.billable_amount ? <span className="font-semibold tabular-nums">{formatMoney(payment.billable_amount)}</span> : <span className="text-muted-foreground">Not set (the hold-time cost is used)</span>}
              </Row>
              <Row label="Supplier">{payment.supplier_name ?? "—"}</Row>
              {payment.note && <Row label="Note">{payment.note}</Row>}
              <Row label="Settlement">
                {settled ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <StatusBadge severity="fine">Settled</StatusBadge>
                    {payment.settlement_method === "refund_credit"
                      ? <span>Refund credit #{payment.refund_number}{payment.credit_used ? ` (${formatMoney(payment.credit_used)})` : ""}{payment.credit_used && payment.billable_amount && payment.credit_used.amount_minor < payment.billable_amount.amount_minor ? ", rest from the supplier balance" : ""}</span>
                      : <span>Fresh payment from the supplier balance</span>}
                    <span className="text-label text-muted-foreground">{formatDateTime(payment.settled_at)}</span>
                  </span>
                ) : <span className="text-muted-foreground">Not settled yet</span>}
              </Row>
            </>
          )}
        </dl>
      </section>
      {!payment.available && <Notice>Recording the supplier billable amount needs the Finance update on the server (migration 0037).</Notice>}
      {canEdit && (
        <section aria-labelledby="supplier-billing-title" className={CARD}>
          <div>
            <h2 id="supplier-billing-title" className="text-section font-semibold">Supplier billable amount</h2>
            <p className="text-body text-muted-foreground">What the supplier actually bills for this PNR (for example after a negotiated discount). The Fare and Payments tabs use it.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={payment.billable_amount ? "outline" : "primary"} onClick={() => setEditing(true)}><Pencil aria-hidden="true" /> {payment.billable_amount ? "Change amount" : "Set amount"}</Button>
            {payment.billable_amount && <Button variant="primary" onClick={() => setSettling(true)}>Settle with supplier</Button>}
          </div>
        </section>
      )}
      {editing && <BillableDialog booking={booking} onClose={() => setEditing(false)} />}
      {settling && <SettleDialog booking={booking} onClose={() => setSettling(false)} />}
    </div>
  );
}

function BillableDialog({ booking, onClose }: { booking: BookingDetail; onClose: () => void }) {
  const id = useId();
  const refresh = useRefresh();
  const payment = booking.supplier_payment!;
  const suppliers = payment.suppliers as { id: string; name: string }[];
  const [amount, setAmount] = useState(payment.billable_amount ? paisaToInput(payment.billable_amount.amount_minor) : "");
  const [supplier, setSupplier] = useState(payment.supplier_id ?? NONE);
  const [note, setNote] = useState(payment.note ?? "");
  const [touched, setTouched] = useState(false);
  const paisa = rupeesToPaisa(amount);
  const save = useMutation({
    mutationFn: () => setSupplierBillable(booking.booking_id, { billable_minor: paisa!, supplier_id: supplier === NONE ? null : supplier, note: note.trim() || null }),
    onSuccess: () => { toast.success("Supplier billable amount saved."); refresh(); onClose(); },
  });
  return (
    <Dialog open onOpenChange={open => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Supplier billable amount</DialogTitle>
          <DialogDescription>Editable until it's settled. Nothing is paid or deducted yet.</DialogDescription>
        </DialogHeader>
        <form id={id} className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); setTouched(true); if (paisa) save.mutate(); }}>
          <FieldShell id={`${id}-amount`} label="Amount (Rs)" error={touched && !paisa ? "Enter the amount the supplier bills." : undefined}>
            <Input id={`${id}-amount`} inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} />
          </FieldShell>
          <LabeledSelect id={`${id}-supplier`} label="Supplier" value={supplier} onChange={setSupplier}
            options={[{ value: NONE, label: "Not on Supplier Balances" }, ...suppliers.map(s => ({ value: s.id, label: s.name }))]} />
          <FieldShell id={`${id}-note`} label="Note (optional)"><Input id={`${id}-note`} value={note} maxLength={500} placeholder="For example: 3% PIA discount confirmed for this PNR" onChange={event => setNote(event.target.value)} /></FieldShell>
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

function SettleDialog({ booking, onClose }: { booking: BookingDetail; onClose: () => void }) {
  const id = useId();
  const refresh = useRefresh();
  const payment = booking.supplier_payment!;
  const credits = payment.refund_credits ?? [];
  const [method, setMethod] = useState<"fresh" | "refund_credit">("fresh");
  const [refund, setRefund] = useState(credits[0]?.id ?? NONE);
  const save = useMutation({
    mutationFn: () => settleSupplierBilling(booking.booking_id, { method, refund_id: method === "refund_credit" ? refund : null }),
    onSuccess: () => { toast.success("Settled with the supplier."); refresh(); onClose(); },
  });
  const blocked = method === "refund_credit" && refund === NONE;
  return (
    <Dialog open onOpenChange={open => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settle {payment.billable_amount ? formatMoney(payment.billable_amount) : ""} with {payment.supplier_name ?? "the supplier"}</DialogTitle>
          <DialogDescription>
            Records how the supplier was paid and deducts it from the supplier's balance (or the refund credit). It's refused if the balance would go below zero, and can't be changed afterwards.
          </DialogDescription>
        </DialogHeader>
        <form id={id} className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); if (!blocked) save.mutate(); }}>
          <div role="radiogroup" aria-label="Settlement method" className="flex flex-wrap gap-2">
            <Button type="button" role="radio" aria-checked={method === "fresh"} size="sm" variant={method === "fresh" ? "secondary" : "outline"} onClick={() => setMethod("fresh")}>Fresh payment</Button>
            <Button type="button" role="radio" aria-checked={method === "refund_credit"} size="sm" variant={method === "refund_credit" ? "secondary" : "outline"}
              onClick={() => setMethod("refund_credit")}>Offset against a refund credit</Button>
          </div>
          {method === "refund_credit" && (credits.length ? (
            <LabeledSelect id={`${id}-refund`} label="Refund credit" value={refund} onChange={setRefund}
              options={credits.map(c => ({ value: c.id, label: `#${c.number} · ${formatMoney(c.remaining)} left · ${c.reason}` }))} />
          ) : (
            <Notice tone="action">
              {payment.supplier_name ?? "This supplier"} holds no open refund credit. <Link to="/admin/finance/supplier-refunds" className="font-medium text-primary underline-offset-2 hover:underline">Log one on Supplier Refunds</Link>.
            </Notice>
          ))}
          {save.error && <Notice tone="critical">{save.error.message}</Notice>}
        </form>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form={id} variant="primary" disabled={save.isPending || blocked}>{save.isPending ? "Settling…" : "Settle"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Payments tab (D57): accept less than the total, with a reason, so issuance can go ahead without a false amount. */
export function PaymentDifference({ booking }: { booking: BookingDetail }) {
  const id = useId();
  const refresh = useRefresh();
  const [kind, setKind] = useState<string>(NONE);
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const save = useMutation({
    mutationFn: () => acceptPaymentShortfall(booking.booking_id, { reason_kind: kind as "discount" | "goodwill" | "channel_rate", note: note.trim() }),
    onSuccess: () => { toast.success("Difference accepted. The booking counts as paid."); refresh(); },
  });
  const shortfall = booking.payment_shortfall;
  if (shortfall) {
    return (
      <Notice tone="fine" title={`Difference of ${formatMoney(shortfall.amount)} accepted: ${shortfall.reason}`}>
        {shortfall.note} <span className="text-muted-foreground">({formatDateTime(shortfall.recorded_at)})</span>
      </Notice>
    );
  }
  if (!booking.can_accept_shortfall) return null;
  const problem = kind === NONE ? "Choose the reason." : !note.trim() ? "Explain the difference." : null;
  return (
    <section aria-labelledby="difference-title" className={CARD}>
      <div>
        <h2 id="difference-title" className="text-section font-semibold">Received less than the total?</h2>
        <p className="text-body text-muted-foreground">
          {booking.amount_due ? `${formatMoney(booking.amount_due)} is still to receive. ` : ""}If that's agreed (a discount, goodwill or a reseller's rate), accept it here instead of recording money that didn't arrive. Issuing can then go ahead.
        </p>
      </div>
      <form id={id} noValidate className="grid gap-3 sm:grid-cols-[14rem_minmax(0,1fr)]" onSubmit={event => { event.preventDefault(); setTouched(true); if (!problem) save.mutate(); }}>
        <LabeledSelect id={`${id}-kind`} label="Reason" value={kind} onChange={setKind}
          options={[{ value: NONE, label: "Choose the reason" }, ...SHORTFALL_REASONS.map(r => ({ value: r.value, label: r.label }))]} />
        <FieldShell id={`${id}-note`} label="Explanation"><Textarea id={`${id}-note`} rows={2} maxLength={500} value={note} onChange={event => setNote(event.target.value)} placeholder="For example: reseller rate agreed on WhatsApp" /></FieldShell>
        {touched && problem && <Notice tone="critical" className="sm:col-span-2">{problem}</Notice>}
        {save.error && <Notice tone="critical" className="sm:col-span-2">{save.error.message}</Notice>}
        <div className="sm:col-span-2"><Button type="submit" variant="outline" disabled={save.isPending}>{save.isPending ? "Saving…" : "Accept difference"}</Button></div>
      </form>
    </section>
  );
}

/** Overview: the reseller or channel the booking was sold through (not the customer). */
export function SoldThroughValue({ booking }: { booking: BookingDetail }) {
  const refresh = useRefresh();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(booking.sold_through ?? "");
  const save = useMutation({
    mutationFn: () => setSoldThrough(booking.booking_id, value.trim() || null),
    onSuccess: () => { toast.success("Sold through saved."); setEditing(false); refresh(); },
  });
  if (!editing) {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <span className={booking.sold_through ? undefined : "text-muted-foreground"}>{booking.sold_through ?? "Direct (not recorded)"}</span>
        {booking.can_edit_sold_through && <Button size="sm" variant="ghost" onClick={() => { setValue(booking.sold_through ?? ""); setEditing(true); }}><Pencil aria-hidden="true" /> Edit</Button>}
      </span>
    );
  }
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
      <Input aria-label="Sold through" value={value} maxLength={160} onChange={event => setValue(event.target.value)} placeholder="Reseller or channel name" className="w-64 max-w-full" autoFocus />
      <Button type="submit" size="sm" variant="primary" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
      <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)} disabled={save.isPending}>Cancel</Button>
      {save.error && <span role="alert" className="w-full text-label text-status-critical-text">{save.error.message}</span>}
    </form>
  );
}
