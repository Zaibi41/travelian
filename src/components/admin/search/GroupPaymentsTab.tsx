import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { FieldLabel, Input } from "@/components/admin/ui/field";
import { LabeledSelect } from "@/components/admin/ui/LabeledSelect";
import { Notice } from "@/components/admin/ui/feedback";
import { StatusBadge, Tag } from "@/components/admin/ui/StatusBadge";
import { TABLE } from "@/components/admin/ui/classes";
import { HoldCountdown, useHoldOver } from "./GroupBookingSteps";
import { fetchPaymentAccounts, recordPayment } from "@/lib/admin-bookings/api";
import { formatMoney } from "@/lib/admin-bookings/format";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL, rupeesToPaisa } from "@/lib/admin-bookings/payments";
import type { PaymentMethod } from "@/lib/admin-bookings/types";
import {
  gatewayMessage, issueGroupTickets, priceChangeFrom, releaseGroupHold, type GroupHoldView, type GroupIssueResult, type GroupMoney, type PriceChange,
} from "@/lib/admin-search/group-holds";
import { cn } from "@/lib/utils";

const NO_ACCOUNT = "none";
const CARD = "flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card px-card py-4 shadow-card";
const SEARCH = "/admin/search?tab=group-ticketing";
export const groupHoldKey = (bookingId: string) => ["group-holds", bookingId];

/** "+ Rs 7,000" / "− Rs 2,000". */
export function signedMoney(money: GroupMoney) {
  const sign = money.amount_minor < 0 ? "− " : "+ ";
  return `${sign}${formatMoney({ ...money, amount_minor: Math.abs(money.amount_minor) })}`;
}

// Booking > Payments for a group hold (mockup pages 12 and 13): payment summary, Record a payment,
// recorded payments, Issue tickets with the hold countdown. The gateway decides every amount and
// whether recording or issuing is allowed; once the hold expires both are disabled here too.
export function GroupPaymentsTab({ view, onChange }: { view: GroupHoldView; onChange: (next: GroupHoldView) => void }) {
  const over = useHoldOver(view.status === "held" ? view.hold_expires_at : null);
  const expired = view.status === "expired" || (view.status === "held" && over);
  const held = view.status === "held" && !expired;
  const paidInFull = view.amount_due.amount_minor <= 0;
  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      {expired && (
        <Notice tone="critical" title="This hold has expired">
          Payments can't be recorded and tickets can't be issued. This booking can't be held again:{" "}
          <Link to={SEARCH} className="font-medium text-teal hover:underline">search again</Link> and hold new seats.
        </Notice>
      )}
      <section aria-labelledby="payment-summary-title" className={CARD}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="payment-summary-title" className="font-display text-section font-semibold text-brand-navy">Payment summary</h2>
          {paidInFull ? <StatusBadge severity="fine">Paid in full</StatusBadge>
            : view.amount_paid.amount_minor > 0 ? <StatusBadge severity="action">Part-paid</StatusBadge> : <StatusBadge severity="action">Unpaid</StatusBadge>}
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-label sm:grid-cols-3">
          {([["Total", view.total], ["Received", view.amount_paid], ["Due", view.amount_due]] as const).map(([label, money]) => (
            <div key={label} className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-semibold tabular-nums text-foreground">{formatMoney(money)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <RecordPayment view={view} enabled={held && view.can_record_payments} onChange={onChange} />
      <section aria-labelledby="recorded-payments-title" className={cn(CARD, "gap-2")}>
        <h2 id="recorded-payments-title" className="font-display text-section font-semibold text-brand-navy">Recorded payments</h2>
        {view.payments.length === 0 ? (
          <p className="text-body text-muted-foreground">No payment recorded yet.</p>
        ) : (
          <div className="-mx-card overflow-x-auto px-card">
            <table className={cn(TABLE.table, "min-w-[28rem]")}>
              <caption className="sr-only">Recorded payments</caption>
              <thead>
                <tr className={TABLE.headRow}>
                  <th scope="col" className={TABLE.th}>Method</th>
                  <th scope="col" className={TABLE.th}>Received into</th>
                  <th scope="col" className={cn(TABLE.th, "text-right")}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {view.payments.map(payment => (
                  <tr key={payment.id} className={TABLE.row}>
                    <td className={TABLE.td}><Tag tone="navy">{PAYMENT_METHOD_LABEL[payment.method]}</Tag></td>
                    <td className={cn(TABLE.td, "max-w-[18rem] truncate")} title={payment.received_into}>{payment.received_into}</td>
                    <td className={cn(TABLE.td, "whitespace-nowrap text-right tabular-nums")}>{formatMoney(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <IssueTickets view={view} held={held} onChange={onChange} />
    </div>
  );
}

function RecordPayment({ view, enabled, onChange }: { view: GroupHoldView; enabled: boolean; onChange: (next: GroupHoldView) => void }) {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const accounts = useQuery({
    queryKey: ["admin-bookings", "payment-accounts"],
    queryFn: ({ signal }) => fetchPaymentAccounts({ signal }),
    enabled: view.can_record_payments,
    staleTime: 5 * 60_000,
  });
  const forMethod = (accounts.data?.accounts ?? []).filter(account => account.method === method);
  const chosen = forMethod.some(account => account.id === accountId) ? accountId : forMethod[0]?.id ?? "";
  const save = useMutation({
    mutationFn: () => recordPayment(view.booking_id, {
      amount: { amount_minor: rupeesToPaisa(amount) ?? 0, currency: view.total.currency }, method, account_id: chosen,
    }),
    onSuccess: async response => {
      setSaved(`Payment of ${formatMoney(response.payment.amount)} recorded.`);
      setAmount("");
      await queryClient.invalidateQueries({ queryKey: groupHoldKey(view.booking_id) });
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      const next = queryClient.getQueryData<GroupHoldView>(groupHoldKey(view.booking_id));
      if (next) onChange(next);
    },
    onError: error => setProblem(gatewayMessage(error, "The payment couldn't be recorded. Nothing was saved.")),
  });
  const submit = () => {
    setSaved(null);
    if (rupeesToPaisa(amount) === null) return setProblem("Enter the amount received in Rs, e.g. 118,500.");
    if (!chosen) return setProblem("Choose the account the money was received into.");
    setProblem(null);
    save.mutate();
  };
  return (
    <section aria-labelledby="record-payment-title" className={CARD}>
      <div>
        <h2 id="record-payment-title" className="font-display text-section font-semibold text-brand-navy">Record a payment</h2>
        <p className="text-body text-muted-foreground">Choose how the customer paid and which Travelian account received it.</p>
      </div>
      {!view.can_record_payments && view.status === "held" && view.amount_due.amount_minor > 0 ? (
        <p className="text-body text-muted-foreground">Recording payments needs the record payments permission.</p>
      ) : (
        <form noValidate aria-label="Record a payment" className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); submit(); }}>
          <fieldset disabled={!enabled || save.isPending} className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)_minmax(0,0.8fr)]">
            <LabeledSelect id="group-payment-method" label="Method" value={method} options={PAYMENT_METHODS} disabled={!enabled}
              onChange={value => { setMethod(value as PaymentMethod); setAccountId(""); }} />
            <LabeledSelect id="group-payment-into" label="Received into" value={chosen || NO_ACCOUNT} disabled={!enabled || accounts.isPending || forMethod.length === 0}
              note={accounts.error ? "The receiving accounts couldn't be loaded. Try again in a moment."
                : enabled && !accounts.isPending && forMethod.length === 0 ? `No ${PAYMENT_METHOD_LABEL[method]} account is set up yet. An administrator adds the receiving accounts.` : undefined}
              options={[...(chosen ? [] : [{ value: NO_ACCOUNT, label: accounts.isPending ? "Loading accounts…" : "Choose the account" }]),
                ...forMethod.map(account => ({ value: account.id, label: account.label }))]}
              onChange={value => setAccountId(value === NO_ACCOUNT ? "" : value)} />
            <div className="flex min-w-0 flex-col gap-1">
              <FieldLabel htmlFor="group-payment-amount">Amount (Rs)</FieldLabel>
              <Input id="group-payment-amount" inputMode="decimal" autoComplete="off" value={amount} placeholder="0" className="tabular-nums"
                onChange={event => setAmount(event.target.value)} />
            </div>
          </fieldset>
          {problem && <p role="alert" className="text-body text-status-critical-text">{problem}</p>}
          {saved && <p role="status" className="text-body text-status-fine-text">{saved}</p>}
          <div>
            <Button type="submit" variant="outline" disabled={!enabled || save.isPending}>{save.isPending ? "Recording…" : "Record payment"}</Button>
          </div>
        </form>
      )}
    </section>
  );
}

function IssueTickets({ view, held, onChange }: { view: GroupHoldView; held: boolean; onChange: (next: GroupHoldView) => void }) {
  const queryClient = useQueryClient();
  const [change, setChange] = useState<PriceChange | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [result, setResult] = useState<GroupIssueResult | null>(null);
  const settle = (next: GroupHoldView) => {
    queryClient.setQueryData(groupHoldKey(view.booking_id), next);
    void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    onChange(next);
  };
  const issue = useMutation({
    mutationFn: (accepted?: GroupMoney) => issueGroupTickets(view.booking_id, accepted),
    onSuccess: outcome => { setChange(null); setResult(outcome); settle(outcome.hold); },
    onError: error => {
      const moved = priceChangeFrom(error);
      if (moved) { setChange(moved); return; }
      setChange(null);
      setProblem(gatewayMessage(error, "Tickets couldn't be issued. Nothing was issued."));
      void queryClient.invalidateQueries({ queryKey: groupHoldKey(view.booking_id) });
    },
  });
  const release = useMutation({
    mutationFn: () => releaseGroupHold(view.booking_id),
    onSuccess: next => { setChange(null); settle(next); },
    onError: error => { setChange(null); setProblem(gatewayMessage(error, "The hold couldn't be released. Nothing was changed.")); },
  });
  const due = view.amount_due.amount_minor > 0;
  const canIssue = held && !due && view.can_issue_tickets;
  const text = view.issue_unavailable_reason && view.status === "held" ? view.issue_unavailable_reason
    : view.status === "issued" ? "Tickets are issued."
    : view.status === "unknown" ? "The tickets' status is unknown. Don't issue again: check with the supplier."
    : view.status === "processing" ? "Issuing is in progress."
    : !held ? "The hold is no longer open."
    : due ? `Record the full payment first: ${formatMoney(view.amount_due)} is still due.`
    : !view.can_issue_tickets ? "Issuing tickets needs the issue tickets permission."
    : "Payment is complete. Issue the tickets before the hold expires.";
  return (
    <section aria-labelledby="issue-tickets-title" className={cn(CARD, "sm:flex-row sm:items-center sm:justify-between")}>
      <div className="min-w-0">
        <h2 id="issue-tickets-title" className="font-display text-section font-semibold text-brand-navy">Issue tickets</h2>
        <p className="text-body text-muted-foreground">{text}</p>
        {result && <p role="status" className="mt-1 text-body text-foreground">{result.message}</p>}
        {problem && <p role="alert" className="mt-1 text-body text-status-critical-text">{problem}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {view.status === "held" && <HoldCountdown expiresAt={view.hold_expires_at} expired={!held} />}
        <Button type="button" variant="primary" disabled={!canIssue || issue.isPending} title={view.issue_unavailable_reason ?? undefined}
          onClick={() => { setProblem(null); setResult(null); issue.mutate(undefined); }}>
          {issue.isPending ? "Issuing…" : "Issue tickets"}
        </Button>
      </div>
      <PriceChangedDialog change={change} busy={issue.isPending || release.isPending}
        onClose={() => setChange(null)} onRelease={() => release.mutate()} onContinue={() => change && issue.mutate(change.newTotal)} />
    </section>
  );
}

/** "The price has changed" (mockup page 13): held price, new price, difference; Release hold or Customer agrees, continue. */
export function PriceChangedDialog({ change, busy, onClose, onRelease, onContinue }: {
  change: PriceChange | null; busy: boolean; onClose: () => void; onRelease: () => void; onContinue: () => void;
}) {
  return (
    <Dialog open={change !== null} onOpenChange={next => { if (!next && !busy) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-section text-brand-navy">The price has changed</DialogTitle>
          <DialogDescription>The supplier price changed when we checked it again. Tell the customer, and continue only if they agree.</DialogDescription>
        </DialogHeader>
        {change && (
          <dl className="flex flex-col rounded-lg border border-border bg-muted/40 px-3 py-1 text-label">
            {([["Held price", formatMoney(change.heldTotal)], ["New price", formatMoney(change.newTotal)], ["Difference", signedMoney(change.difference)]] as const).map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3 py-1.5">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-semibold tabular-nums text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" disabled={busy} onClick={onRelease}>Release hold</Button>
          <Button type="button" variant="primary" disabled={busy} onClick={onContinue}>Customer agrees, continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
