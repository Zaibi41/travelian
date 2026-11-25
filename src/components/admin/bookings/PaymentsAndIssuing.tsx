import { PaymentDifference } from "@/components/admin/bookings/BookingFinanceOps";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { FieldLabel, Input, Textarea } from "@/components/admin/ui/field";
import { LabeledSelect } from "@/components/admin/ui/LabeledSelect";
import { Notice } from "@/components/admin/ui/feedback";
import { TABLE } from "@/components/admin/ui/classes";
import { StatusBadge, Tag } from "@/components/admin/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { GatewayError } from "@/lib/gateway/client";
import { fetchIssuance, fetchPaymentAccounts, issueTicket, recordPayment, requestIssuance, resolveIssuance, verifyIssuance } from "@/lib/admin-bookings/api";
import { formatDateTime, formatMoney, formatTimeLeft } from "@/lib/admin-bookings/format";
import { bookingDetailPath } from "@/lib/admin-bookings/tabs";
import {
  PAYMENT_METHODS, PAYMENT_METHOD_LABEL, isClockTime, paisaToInput, receivedAtIso, recordedByLabel, rupeesToPaisa,
} from "@/lib/admin-bookings/payments";
import type { BookingDetail, BookingPassenger, IssuanceChecklist, IssuanceResult, PaymentMethod, TicketNumber } from "@/lib/admin-bookings/types";
import { cn } from "@/lib/utils";
import { CopyPnr } from "@/components/CopyPnr";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { titleText } from "@/lib/passenger-details";
import { SlipPreview } from "@/components/admin/finance/SlipReviewDialog";
import { ReholdAtSupplier } from "./ReholdAtSupplier";
import { TravelersAndContact } from "./TravelersAndContact";

// Booking detail > Payments (spec 7, mockup booking-payment-issue): 1 · record the customer's
// payment, 2 · issue the ticket, then the result. The gateway decides everything (amounts due,
// whether issuing is allowed, the outcome); the page shows what it says and offers only the
// actions the booking detail allows (can_record_payments, can_issue_tickets).

const NO_ACCOUNT = "none";
const CARD = "flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card px-card py-3.5 shadow-card";
const issuanceKey = (bookingId: string) => ["admin-bookings", "issuance", bookingId];

function gatewayMessage(error: unknown, fallback: string) {
  return error instanceof GatewayError ? error.message : fallback;
}

const name = (passenger: BookingPassenger) => `${titleText(passenger.title)} ${passenger.first_name} ${passenger.last_name}`.trim();
const travelersOf = (booking: BookingDetail) => [...(booking.passengers ?? [])].sort((a, b) => a.position - b.position);

export function PaymentsAndIssuing({ booking }: { booking: BookingDetail }) {
  const checklist = useQuery({
    queryKey: issuanceKey(booking.booking_id),
    queryFn: ({ signal }) => fetchIssuance(booking.booking_id, { signal }),
    staleTime: 30_000, refetchInterval: 60_000, retry: 1,
  });
  const [result, setResult] = useState<IssuanceResult | null>(null);
  const [reheld, setReheld] = useState<string | null>(null);
  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      {booking.statuses.payment !== "paid" && <TravelersAndContact booking={booking} />}
      <div className="grid grid-cols-1 items-start gap-card-gap xl:grid-cols-2">
        <RecordPayment booking={booking} />
        <IssueTicket booking={booking} checklist={checklist.data} loading={checklist.isPending} error={checklist.error} onResult={setResult} />
      </div>
      <PaymentDifference booking={booking} />
      <CustomerSlips booking={booking} />
      {reheld && <Notice tone="fine">{reheld}</Notice>}
      <IssuanceOutcome booking={booking} checklist={checklist.data} result={result} onResult={setResult} onReheld={setReheld} />
      <Notice>
        After any issuing error the PNR is always checked first. Every step (payment recorded, issuance requested, issued, checked,
        resolved) appears on the Audit tab with who did it and when.
      </Notice>
    </div>
  );
}

// ---------- The customer's chosen account and payment slips (#76, gateway#56) ----------

const SLIP_STATUS: Record<NonNullable<BookingDetail["payment_slips"]>[number]["status"], [string, "action" | "fine" | "critical"]> = {
  awaiting_check: ["Awaiting check", "action"], confirmed: ["Confirmed", "fine"], rejected: ["Rejected", "critical"],
};

function CustomerSlips({ booking }: { booking: BookingDetail }) {
  const [viewing, setViewing] = useState<string | null>(null);
  const slips = booking.payment_slips ?? [];
  if (!booking.chosen_account && !slips.length) return null;
  return (
    <section aria-labelledby="customer-slips" className={CARD}>
      <h2 id="customer-slips" className="text-section-title font-semibold font-display">Customer payment</h2>
      {booking.chosen_account && <p className="text-body">Customer chose to pay into: <strong className="font-semibold">{booking.chosen_account}</strong></p>}
      {slips.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Payment slips">
          {slips.map(slip => (
            <li key={slip.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-body">
              <span className="min-w-0">
                <span className="font-semibold tabular-nums">{formatMoney(slip.amount)}</span>{" "}
                <span className="text-muted-foreground">{PAYMENT_METHOD_LABEL[slip.method]}{slip.account_label ? ` into ${slip.account_label}` : ""}</span>
                <span className="block text-label text-muted-foreground">
                  Uploaded {formatDateTime(slip.submitted_at)}{slip.payer_reference ? ` · ref ${slip.payer_reference}` : ""}
                  {slip.rejection_reason ? ` · ${slip.rejection_reason}` : ""}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <StatusBadge severity={SLIP_STATUS[slip.status][1]}>{SLIP_STATUS[slip.status][0]}</StatusBadge>
                <Button variant="outline" size="sm" onClick={() => setViewing(slip.id)}>View slip</Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {slips.some(slip => slip.status === "awaiting_check") && (
        <p className="text-label text-muted-foreground">
          Confirm or reject slips in <Link to="/admin/payments?tab=awaiting" className="font-medium text-primary underline-offset-2 hover:underline">Finance → Payments</Link>.
        </p>
      )}
      <Dialog open={!!viewing} onOpenChange={open => !open && setViewing(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Payment slip</DialogTitle><DialogDescription>{booking.booking_id}</DialogDescription></DialogHeader>
          {viewing && <SlipPreview slipId={viewing} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ---------- 1 · Record the customer's payment ----------

const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const nowClock = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

function RecordPayment({ booking }: { booking: BookingDetail }) {
  const queryClient = useQueryClient();
  const due = booking.amount_due ?? null;
  const paid = booking.amount_paid ?? null;
  const currency = booking.amount.currency;
  const [amount, setAmount] = useState(() => (due && due.amount_minor > 0 ? paisaToInput(due.amount_minor) : ""));
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [accountId, setAccountId] = useState("");
  const accounts = useQuery({
    queryKey: ["admin-bookings", "payment-accounts"],
    queryFn: ({ signal }) => fetchPaymentAccounts({ signal }),
    enabled: booking.can_record_payments,
    staleTime: 5 * 60_000,
  });
  const forMethod = (accounts.data?.accounts ?? []).filter(account => account.method === method);
  const [reference, setReference] = useState("");
  const [date, setDate] = useState<string | undefined>(today);
  const [time, setTime] = useState(nowClock);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const minor = rupeesToPaisa(amount);
      const receivedAt = receivedAtIso(date, time);
      return recordPayment(booking.booking_id, {
        amount: { amount_minor: minor ?? 0, currency }, method, account_id: accountId, reference: reference.trim(), received_at: receivedAt ?? "",
      });
    },
    onSuccess: response => {
      setSaved(`Payment of ${formatMoney(response.payment.amount)} recorded.`);
      setReference("");
      setAmount("");
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: error => setProblem(gatewayMessage(error, "The payment couldn't be recorded. Nothing was saved.")),
  });

  const submit = () => {
    setSaved(null);
    const minor = rupeesToPaisa(amount);
    const receivedAt = receivedAtIso(date, time);
    if (minor === null) return setProblem("Enter the amount received in Rs, e.g. 15,316.");
    if (!forMethod.some(account => account.id === accountId)) return setProblem("Choose the account the money was received into.");
    if (!reference.trim()) return setProblem("Enter the payer's reference or transaction ID.");
    if (!receivedAt || !isClockTime(time)) return setProblem("Enter the date and time the money was received (time as 24-hour, e.g. 14:05).");
    if (new Date(receivedAt) > new Date()) return setProblem("The time received can't be in the future.");
    setProblem(null);
    save.mutate();
  };

  const payments = [...(booking.payments ?? [])].sort((a, b) => a.received_at.localeCompare(b.received_at));
  const nothingDue = due !== null && due.amount_minor <= 0;

  return (
    <section aria-labelledby="record-payment-title" className={CARD}>
      <div>
        <h2 id="record-payment-title" className="text-section font-semibold text-foreground">1 · Record the customer's payment</h2>
        <p className="mt-1 text-body text-muted-foreground">
          Payments are made outside the system (bank transfer, JazzCash, 1Link). Staff confirm the money has arrived, then record it here.
        </p>
      </div>
      <dl className="flex flex-col">
        <div className="flex items-baseline justify-between gap-3 border-y border-border py-2">
          <dt className="text-body text-muted-foreground">Booking total</dt>
          <dd className="text-kpi-sm font-bold tabular-nums text-foreground">{formatMoney(booking.amount)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-b border-border py-2">
          <dt className="text-body text-muted-foreground">Recorded so far</dt>
          <dd className="text-body font-semibold tabular-nums text-foreground">{paid ? formatMoney(paid) : "—"}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-b border-border py-2">
          <dt className="text-body text-muted-foreground">Still to receive</dt>
          <dd className="text-body font-semibold tabular-nums text-foreground">{due ? formatMoney(due) : "—"}</dd>
        </div>
      </dl>

      {!booking.can_record_payments ? (
        <p className="text-body text-muted-foreground">Recording payments needs the record payments permission.</p>
      ) : nothingDue ? (
        <p role="status" className="text-body text-muted-foreground">Paid in full. Nothing more to record.</p>
      ) : (
        <form noValidate aria-label="Record payment" className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); submit(); }}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1">
              <FieldLabel htmlFor="payment-amount">Amount received</FieldLabel>
              <div className="relative">
                <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-body text-muted-foreground">Rs</span>
                <Input id="payment-amount" inputMode="decimal" autoComplete="off" value={amount} onChange={event => setAmount(event.target.value)}
                  placeholder="0" className="pl-9 tabular-nums" />
              </div>
            </div>
            <LabeledSelect id="payment-method" label="Method" value={method} options={PAYMENT_METHODS}
              onChange={value => { setMethod(value as PaymentMethod); setAccountId(""); }} />
            {/* Travelian's receiving accounts for this method, from the gateway. */}
            <LabeledSelect id="payment-into" label="Received into" value={accountId || NO_ACCOUNT}
              disabled={accounts.isPending || forMethod.length === 0}
              note={accounts.error ? "The receiving accounts couldn't be loaded. Try again in a moment."
                : !accounts.isPending && forMethod.length === 0
                  ? `No ${PAYMENT_METHOD_LABEL[method]} account is set up yet. An administrator adds the receiving accounts.` : undefined}
              options={[{ value: NO_ACCOUNT, label: accounts.isPending ? "Loading accounts…" : "Choose the account" },
                ...forMethod.map(account => ({ value: account.id, label: account.label }))]}
              onChange={value => setAccountId(value === NO_ACCOUNT ? "" : value)} />
            <div className="flex min-w-0 flex-col gap-1">
              <FieldLabel htmlFor="payment-reference">Reference or transaction ID</FieldLabel>
              <Input id="payment-reference" maxLength={120} value={reference} onChange={event => setReference(event.target.value)} placeholder="Reference" />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <FieldLabel htmlFor="payment-date">Received on</FieldLabel>
              <DatePickerField id="payment-date" appearance="admin" value={date} max={today()} placeholder="Select date" onChange={setDate} />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <FieldLabel htmlFor="payment-time">Time (24-hour)</FieldLabel>
              <Input id="payment-time" inputMode="numeric" maxLength={5} value={time} onChange={event => setTime(event.target.value)} placeholder="14:05" className="tabular-nums" />
            </div>
          </div>
          {problem && <p role="alert" className="rounded-md border border-status-critical/40 bg-status-critical-soft px-3 py-2 text-body text-status-critical-text">{problem}</p>}
          {saved && <p role="status" className="text-body text-status-fine-text">{saved}</p>}
          <div>
            <Button type="submit" variant="primary" disabled={save.isPending}>{save.isPending ? "Recording…" : "Record payment"}</Button>
          </div>
        </form>
      )}

      {payments.length > 0 && (
        <div className="overflow-x-auto">
          <table className={cn(TABLE.table, "min-w-[32rem]")}>
            <caption className="sr-only">Payments recorded</caption>
            <thead>
              <tr className={TABLE.headRow}>
                {["Date", "Method", "Reference", "Amount", "Recorded by"].map(column => <th key={column} scope="col" className={TABLE.th}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {payments.map(payment => (
                <tr key={payment.id} className={TABLE.row}>
                  <td className={cn(TABLE.td, "whitespace-nowrap tabular-nums")}>{formatDateTime(payment.received_at)}</td>
                  <td className={TABLE.td}>{PAYMENT_METHOD_LABEL[payment.method]}</td>
                  <td className={cn(TABLE.td, "max-w-[10rem] truncate")} title={payment.reference}>{payment.reference}</td>
                  <td className={cn(TABLE.td, "whitespace-nowrap tabular-nums")}>
                    {formatMoney(payment.amount)}
                    {payment.card_fee && <span className="block text-label text-muted-foreground">+ card fee {formatMoney(payment.card_fee)}</span>}
                  </td>
                  <td className={TABLE.td}>{recordedByLabel(payment.recorded_by_role)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ---------- 2 · Issue the ticket ----------

function CheckRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2">
      <dt className="text-body text-foreground">{label}</dt>
      <dd className="shrink-0">{children}</dd>
    </div>
  );
}

const holdExpired = (checklist: IssuanceChecklist) =>
  !checklist.hold_expires_at || new Date(checklist.hold_expires_at).getTime() <= Date.now()
  || checklist.blockers.some(blocker => /hold has expired/i.test(blocker));
/** The gateway's hold reason ("The hold has expired.", "… or is about to expire.", "The booking isn't on hold."). */
const HOLD_BLOCKER = /^The hold has expired|^The booking isn't on hold/i;
/** A flight whose hold ran out gets one message, the "Hold expired" card below with its action (gateway#44): the hold
 *  reason isn't repeated in "Not ready to issue". */
const holdCardShown = (booking: BookingDetail, checklist: IssuanceChecklist) =>
  booking.product === "flight" && holdExpired(checklist) && checklist.issuance_status !== "issued";

function IssueTicket({ booking, checklist, loading, error, onResult }: {
  booking: BookingDetail; checklist?: IssuanceChecklist; loading: boolean; error: unknown; onResult: (result: IssuanceResult) => void;
}) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });

  const request = useMutation({
    mutationFn: () => requestIssuance(booking.booking_id),
    onSuccess: result => { setProblem(null); onResult(result); refresh(); },
    onError: failure => setProblem(gatewayMessage(failure, "Issuance couldn't be requested. Nothing was changed.")),
  });
  // The airline's price moved since the hold: the selling price stays; the issuer confirms the new cost (shown with
  // the new profit to cost and margin users only) and issues again with it.
  const [costChange, setCostChange] = useState<{ accepted: Money; previous?: Money; next?: Money; profit?: Money } | null>(null);
  const issue = useMutation({
    mutationFn: (accepted?: Money) => issueTicket(booking.booking_id, undefined, accepted ?? null),
    onSuccess: result => { setConfirming(false); setCostChange(null); setProblem(null); onResult(result); refresh(); },
    onError: failure => {
      setConfirming(false);
      const extra = failure instanceof GatewayError ? failure.extra : {};
      if (failure instanceof GatewayError && failure.code === "supplier_cost_changed" && isMoney(extra.accepted_supplier_cost)) {
        setProblem(null);
        setCostChange({ accepted: extra.accepted_supplier_cost, previous: isMoney(extra.previous_supplier_cost) ? extra.previous_supplier_cost : undefined,
          next: isMoney(extra.new_supplier_cost) ? extra.new_supplier_cost : undefined, profit: isMoney(extra.profit) ? extra.profit : undefined });
      } else {
        setCostChange(null);
        setProblem(gatewayMessage(failure, "Issuing didn't start. Nothing was issued."));
      }
      refresh();
    },
  });

  const status = checklist?.issuance_status;
  const travelers = travelersOf(booking).length;
  const admin = checklist && (checklist.supplier_amount || checklist.supplier_balance || checklist.margin);
  const blockers = !checklist ? [] : holdCardShown(booking, checklist)
    ? checklist.blockers.filter(blocker => !HOLD_BLOCKER.test(blocker)) : checklist.blockers;

  return (
    <section aria-labelledby="issue-ticket-title" className={CARD}>
      <div>
        <h2 id="issue-ticket-title" className="text-section font-semibold text-foreground">2 · Issue the ticket</h2>
        <p className="mt-1 text-body text-muted-foreground">
          Issuing sends the booking to the airline for ticketing. It happens once and is never retried automatically.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading the checks before issuing">
          {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-8 rounded-md" />)}
        </div>
      ) : error || !checklist ? (
        <Notice tone="critical">{gatewayMessage(error, "The checks before issuing couldn't be loaded.")}</Notice>
      ) : (
        <>
          <dl className="flex flex-col border-t border-border">
            <CheckRow label="Payment recorded in full">
              {checklist.full_payment_recorded ? <StatusBadge severity="fine">Done</StatusBadge>
                : <StatusBadge severity="action">{`${formatMoney(checklist.amount_due)} still due`}</StatusBadge>}
            </CheckRow>
            <CheckRow label="Hold still valid">
              {status === "issued" ? <Tag>Not needed</Tag>
                : holdExpired(checklist) ? <StatusBadge severity="critical">Expired</StatusBadge>
                : <StatusBadge severity="fine">{formatTimeLeft(checklist.hold_expires_at)}</StatusBadge>}
            </CheckRow>
            <CheckRow label="Total matches the held fare"><Tag>Checked when issuing</Tag></CheckRow>
            <CheckRow label="Approval to issue">
              {status === "issued" ? <StatusBadge severity="fine">Issued</StatusBadge>
                : status === "requested" ? <StatusBadge severity="action">Waiting for approver</StatusBadge>
                : status === "processing" ? <StatusBadge severity="action">Issuing in progress</StatusBadge>
                : status === "unknown" ? <StatusBadge severity="critical">Unknown issuance</StatusBadge>
                : <Tag>Not requested</Tag>}
            </CheckRow>
          </dl>

          {checklist.last_attempt && status !== "issued" && status !== "unknown" && (
            <LastAttempt booking={booking} checklist={checklist} onResult={onResult} />
          )}

          {blockers.length > 0 && status !== "issued" && (
            <Notice tone="action" title="Not ready to issue">
              <ul className="list-disc pl-5">{blockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul>
            </Notice>
          )}
          {checklist.balance_warning && status !== "issued" && (
            <Notice tone="critical" title="Supplier balance">
              {checklist.balance_warning}{" "}
              <Link to="/admin/wallet" className="font-medium underline underline-offset-2">Open Wallets</Link>
            </Notice>
          )}
          {/* The gateway leaves the note out while the hold is gone: the hold is the reason then, not the switch. */}
          {!checklist.ticketing_enabled && checklist.ticketing_note && status !== "issued" && (
            <Notice title="Tickets can't be issued from Travelian for this booking">{checklist.ticketing_note}</Notice>
          )}

          {admin && (
            <div aria-label="Admin only" className="rounded-lg border border-dashed border-border px-3 py-2.5 text-body">
              <p className="font-semibold text-foreground">Admin only</p>
              <p className="text-muted-foreground">
                {[
                  checklist.supplier_amount && `Amount charged by the supplier: ${formatMoney(checklist.supplier_amount)}`,
                  checklist.supplier_balance && `Supplier balance: ${formatMoney(checklist.supplier_balance)}`,
                  checklist.margin && `Profit ${formatMoney(checklist.margin)}`,
                ].filter(Boolean).join(" · ")}
              </p>
            </div>
          )}

          {status !== "issued" && status !== "unknown" && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                {booking.can_issue_tickets ? (
                  <Button type="button" variant="primary" disabled={!checklist.can_issue || issue.isPending} onClick={() => { setProblem(null); setConfirming(true); }}>
                    Issue ticket
                  </Button>
                ) : (
                  <Button type="button" variant="outline" disabled={!checklist.can_request || request.isPending} onClick={() => request.mutate()}>
                    {request.isPending ? "Requesting…" : "Request issuance"}
                  </Button>
                )}
              </div>
              <p className="text-label text-muted-foreground">
                {booking.can_issue_tickets
                  ? "Issue ticket stays disabled until every check above is done and ticketing is on."
                  : "Issuing needs the issue tickets permission: Request issuance sends it to an approver. It stays disabled until every check above is done."}
              </p>
            </div>
          )}
          {problem && <p role="alert" className="rounded-md border border-status-critical/40 bg-status-critical-soft px-3 py-2 text-body text-status-critical-text">{problem}</p>}
        </>
      )}

      <Dialog open={confirming} onOpenChange={open => { if (!issue.isPending) setConfirming(open); }}>
        <DialogContent className="max-w-md" aria-busy={issue.isPending}>
          {issue.isPending ? (
            <DialogHeader>
              <DialogTitle>Issuing…</DialogTitle>
              <DialogDescription>Please wait and don't close this page. This can take up to a minute.</DialogDescription>
            </DialogHeader>
          ) : (
            <DialogHeader>
              <DialogTitle>Issue ticket now?</DialogTitle>
              <DialogDescription>
                This sends {travelers ? `${travelers} ${travelers === 1 ? "traveler" : "travelers"}` : "the travelers"} to the airline for ticketing
                for {formatMoney(booking.amount)}. It can't be undone and won't be retried automatically. If something goes wrong, the PNR is checked first.
              </DialogDescription>
            </DialogHeader>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={issue.isPending} onClick={() => setConfirming(false)}>Cancel</Button>
            <Button type="button" variant="primary" disabled={issue.isPending} onClick={() => issue.mutate(undefined)}>Issue now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={costChange !== null} onOpenChange={open => { if (!open && !issue.isPending) setCostChange(null); }}>
        <DialogContent className="max-w-md" aria-busy={issue.isPending}>
          <DialogHeader>
            <DialogTitle>The airline's price has changed</DialogTitle>
            <DialogDescription>The customer's price stays {formatMoney(booking.amount)}. Confirm the new cost to issue the ticket.</DialogDescription>
          </DialogHeader>
          {costChange && (costChange.previous || costChange.next || costChange.profit) && (
            <dl className="flex flex-col rounded-lg border border-border bg-muted/40 px-3 py-1 text-label">
              {([["Supplier cost before", costChange.previous], ["Supplier cost now", costChange.next], ["Profit", costChange.profit]] as const)
                .filter(([, value]) => value).map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-3 py-1.5">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-semibold tabular-nums text-foreground">{formatMoney(value as Money)}</dd>
                  </div>
                ))}
            </dl>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={issue.isPending} onClick={() => setCostChange(null)}>Cancel</Button>
            <Button type="button" variant="primary" disabled={issue.isPending} onClick={() => costChange && issue.mutate(costChange.accepted)}>
              {issue.isPending ? "Issuing…" : "Confirm and issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

type Money = { amount_minor: number; currency: string };
const isMoney = (value: unknown): value is Money =>
  typeof value === "object" && value !== null && typeof (value as Money).amount_minor === "number" && typeof (value as Money).currency === "string";

// ---------- Results ----------

function ResultCard({ tone, tag, title, children }: { tone: "fine" | "action" | "critical"; tag: string; title: string; children: React.ReactNode }) {
  const stripe = { fine: "border-l-status-fine", action: "border-l-status-action", critical: "border-l-status-critical" }[tone];
  return (
    <section aria-label={title} className={cn(CARD, "border-l-[length:var(--status-stripe)]", stripe)}>
      <div className="flex flex-col items-start gap-1.5">
        <StatusBadge severity={tone}>{tag}</StatusBadge>
        <h3 className="text-section font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function TicketTable({ booking, tickets }: { booking: BookingDetail; tickets: TicketNumber[] }) {
  const travelers = travelersOf(booking);
  const rows = tickets.length ? tickets : travelers.filter(traveler => traveler.ticket_number).map(traveler => ({ position: traveler.position, ticket_number: traveler.ticket_number! }));
  if (!rows.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className={cn(TABLE.table, "min-w-[20rem]")}>
        <caption className="sr-only">Ticket numbers</caption>
        <thead><tr className={TABLE.headRow}><th scope="col" className={TABLE.th}>Traveler</th><th scope="col" className={TABLE.th}>Ticket number</th></tr></thead>
        <tbody>
          {rows.map(row => {
            const traveler = travelers.find(entry => entry.position === row.position);
            return (
              <tr key={row.position} className={TABLE.row}>
                <td className={cn(TABLE.td, "max-w-[16rem] truncate")}>{traveler ? name(traveler) : `Traveler ${row.position}`}</td>
                <td className={cn(TABLE.td, "font-mono")}>{row.ticket_number}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function IssuanceOutcome({ booking, checklist, result, onResult, onReheld }: {
  booking: BookingDetail; checklist?: IssuanceChecklist; result: IssuanceResult | null; onResult: (result: IssuanceResult) => void;
  onReheld?: (message: string) => void;
}) {
  const status = result?.issuance_status ?? checklist?.issuance_status;
  const pnr = booking.pnr ?? booking.booking_id;
  if (!status) return null;

  if (status === "issued") {
    return (
      <ResultCard tone="fine" tag="Issued" title="Tickets issued">
        <p className="text-body text-muted-foreground">PNR {pnr} <CopyPnr pnr={pnr} />. Ticket numbers are saved on the Tickets tab.</p>
        <TicketTable booking={booking} tickets={result?.tickets ?? []} />
        <div><Button asChild variant="primary"><Link to={bookingDetailPath(booking.booking_id, "tickets")}>View tickets</Link></Button></div>
      </ResultCard>
    );
  }
  if (status === "unknown") return <UnknownIssuance booking={booking} checklist={checklist} message={result?.message} onResult={onResult} />;
  if (status === "processing") {
    return (
      <ResultCard tone="action" tag="Checking" title="Issuing is in progress">
        <p className="text-body text-muted-foreground">The airline is being asked, or the PNR is being checked. No second attempt is made; this page updates when it's settled.</p>
      </ResultCard>
    );
  }
  if (result?.result === "not_issued") {
    return (
      <ResultCard tone="critical" tag="Not issued" title="The ticket wasn't issued">
        <p className="text-body text-muted-foreground">{result.message}</p>
      </ResultCard>
    );
  }
  if (result?.result === "requested") {
    return (
      <ResultCard tone="action" tag="Waiting for approver" title="Issuance requested">
        <p className="text-body text-muted-foreground">{result.message || "Someone with the issue tickets permission can now issue it."}</p>
      </ResultCard>
    );
  }
  if (checklist && holdCardShown(booking, checklist)) {
    if (booking.supplier_booking?.can_rehold) {
      return (
        <ResultCard tone="critical" tag="Hold expired" title="The hold ran out before issuing">
          <p className="text-body text-muted-foreground">
            SooperFare no longer holds PNR {booking.pnr ?? "—"}, so it can't be issued. Re-hold the same flights and fare for these travelers; you'll see the price before anything changes.
          </p>
          <div className="flex flex-wrap gap-2">
            <ReholdAtSupplier booking={booking} onHeld={onReheld} />
            <Button asChild variant="outline" className="h-11 sm:h-10"><Link to="/admin/search?tab=flights">Search again</Link></Button>
          </div>
        </ResultCard>
      );
    }
    return (
      <ResultCard tone="critical" tag="Hold expired" title="The hold ran out before issuing">
        <p className="text-body text-muted-foreground">The seats were released. The payment stays recorded on the booking. Search again and choose a fare for the customer.</p>
        <div><Button asChild variant="primary"><Link to="/admin/search?tab=flights">Search again</Link></Button></div>
      </ResultCard>
    );
  }
  return null;
}

function useCheckWithSupplier(booking: BookingDetail, onResult: (result: IssuanceResult) => void, failed: string) {
  const queryClient = useQueryClient();
  const [problem, setProblem] = useState<string | null>(null);
  const check = useMutation({
    mutationFn: () => verifyIssuance(booking.booking_id),
    onSuccess: result => { setProblem(result.issuance_status === "unknown" ? result.message : null); onResult(result); void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }); },
    onError: failure => setProblem(gatewayMessage(failure, failed)),
  });
  return { check, problem };
}

/** What the last issuing attempt (or supplier check) did, with the real reason; "Check with supplier" after a failure. */
function AttemptReason({ attempt }: { attempt: NonNullable<IssuanceChecklist["last_attempt"]> }) {
  return (
    <>
      <p>{attempt.reason}</p>
      <p className="text-label text-muted-foreground">
        {[`Last attempt ${formatDateTime(attempt.at)}`, attempt.pnr_status && `PNR status at the supplier: ${attempt.pnr_status}`].filter(Boolean).join(" · ")}
      </p>
    </>
  );
}

function LastAttempt({ booking, checklist, onResult }: { booking: BookingDetail; checklist: IssuanceChecklist; onResult: (result: IssuanceResult) => void }) {
  const attempt = checklist.last_attempt!;
  const { check, problem } = useCheckWithSupplier(booking, onResult, "The PNR couldn't be checked with the supplier. Nothing was changed.");
  const failed = attempt.outcome === "aborted" || attempt.outcome === "not_issued";
  return (
    <Notice tone={failed ? "action" : "info"} title={failed ? "Last issuing attempt didn't issue a ticket" : "Last check with the supplier"}>
      <div className="flex flex-col gap-2">
        <AttemptReason attempt={attempt} />
        {checklist.can_check && (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={check.isPending} onClick={() => check.mutate()}>
              {check.isPending ? "Checking…" : "Check with supplier"}
            </Button>
            <span className="text-label text-muted-foreground">Read-only: looks up the PNR and ticket. Never issues.</span>
          </div>
        )}
        {problem && <p role="alert" className="text-status-critical-text">{problem}</p>}
      </div>
    </Notice>
  );
}

function UnknownIssuance({ booking, checklist, message, onResult }: {
  booking: BookingDetail; checklist?: IssuanceChecklist; message?: string; onResult: (result: IssuanceResult) => void;
}) {
  const [resolving, setResolving] = useState<"issued" | "not_issued" | null>(null);
  const { check: verify, problem } = useCheckWithSupplier(booking, onResult, "The PNR couldn't be checked. The issuance stays unknown.");
  const attempt = checklist?.last_attempt;
  return (
    <ResultCard tone="critical" tag="Unknown issuance" title="We can't tell whether the ticket was issued">
      <p className="text-body text-muted-foreground">
        Do not issue again. Check with the supplier first: issuing is blocked until the ticket is found or someone with permission resolves this.
        {message ? ` ${message}` : ""}
      </p>
      {attempt && (
        <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-body">
          <p className="font-semibold text-foreground">Why it's unknown</p>
          <AttemptReason attempt={attempt} />
        </div>
      )}
      {booking.can_issue_tickets ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="primary" disabled={verify.isPending} onClick={() => verify.mutate()}>{verify.isPending ? "Checking…" : "Check with supplier"}</Button>
          <Button type="button" variant="outline" onClick={() => setResolving("issued")}>Mark as issued</Button>
          <Button type="button" variant="outline" onClick={() => setResolving("not_issued")}>Mark as not issued</Button>
        </div>
      ) : (
        <p className="text-label text-muted-foreground">Resolving needs the issue tickets permission.</p>
      )}
      {problem && <p role="alert" className="text-body text-status-critical-text">{problem}</p>}
      {resolving && <ResolveDialog booking={booking} outcome={resolving} onClose={() => setResolving(null)} onResult={onResult} />}
    </ResultCard>
  );
}

function ResolveDialog({ booking, outcome, onClose, onResult }: {
  booking: BookingDetail; outcome: "issued" | "not_issued"; onClose: () => void; onResult: (result: IssuanceResult) => void;
}) {
  const queryClient = useQueryClient();
  const travelers = travelersOf(booking);
  const [tickets, setTickets] = useState<Record<number, string>>({});
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const resolve = useMutation({
    mutationFn: () => resolveIssuance(booking.booking_id, {
      outcome, reason: reason.trim(),
      ...(outcome === "issued" ? { ticket_numbers: travelers.map(traveler => ({ position: traveler.position, ticket_number: (tickets[traveler.position] ?? "").trim() })) } : {}),
    }),
    onSuccess: result => { onResult(result); void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }); onClose(); },
    onError: failure => setProblem(gatewayMessage(failure, "This couldn't be saved. The issuance stays unknown.")),
  });
  const missingTicket = outcome === "issued" && (!travelers.length || travelers.some(traveler => !(tickets[traveler.position] ?? "").trim()));
  const submit = () => {
    if (outcome === "issued" && !travelers.length) return setProblem("The travelers aren't saved on this booking, so ticket numbers can't be entered here.");
    if (missingTicket) return setProblem("Give a ticket number for every traveler.");
    if (reason.trim().length < 5) return setProblem("Give a reason (what the airline confirmed).");
    setProblem(null);
    resolve.mutate();
  };
  return (
    <Dialog open onOpenChange={open => { if (!open && !resolve.isPending) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{outcome === "issued" ? "Mark as issued" : "Mark as not issued"}</DialogTitle>
          <DialogDescription>
            {outcome === "issued"
              ? "Only after the airline confirms the tickets. Enter the ticket number for every traveler."
              : "Only after the airline confirms no ticket was issued. The booking can then be issued again."}
          </DialogDescription>
        </DialogHeader>
        <form noValidate className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); submit(); }}>
          {outcome === "issued" && travelers.map(traveler => (
            <div key={traveler.position} className="flex min-w-0 flex-col gap-1">
              <FieldLabel htmlFor={`ticket-${traveler.position}`}>{`Ticket number, ${name(traveler)}`}</FieldLabel>
              <Input id={`ticket-${traveler.position}`} maxLength={32} value={tickets[traveler.position] ?? ""} className="font-mono"
                onChange={event => setTickets({ ...tickets, [traveler.position]: event.target.value })} />
            </div>
          ))}
          <div className="flex min-w-0 flex-col gap-1">
            <FieldLabel htmlFor="resolve-reason">Reason</FieldLabel>
            <Textarea id="resolve-reason" maxLength={500} value={reason} onChange={event => setReason(event.target.value)}
              placeholder="What the airline confirmed, and who you spoke to" />
          </div>
          {problem && <p role="alert" className="text-body text-status-critical-text">{problem}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={resolve.isPending} onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={resolve.isPending}>{resolve.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Tickets tab ----------

/** Ticket numbers per traveler, from the booking's travelers (set when issued). */
export function TicketsTab({ booking }: { booking: BookingDetail }) {
  const travelers = travelersOf(booking);
  const issued = travelers.some(traveler => traveler.ticket_number);
  if (!issued) {
    return <Notice title="No tickets yet">Ticket numbers appear here after the booking is issued on the Payments tab.</Notice>;
  }
  return (
    <section aria-label="Tickets" className={cn(TABLE.wrap, "px-card py-3.5")}>
      <table className={cn(TABLE.table, "min-w-[28rem]")}>
        <thead>
          <tr className={TABLE.headRow}>{["Passenger", "Ticket number", "Status"].map(column => <th key={column} scope="col" className={TABLE.th}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {travelers.map(traveler => (
            <tr key={traveler.position} className={TABLE.row}>
              <td className={cn(TABLE.td, "max-w-[18rem] truncate")} title={name(traveler)}>{name(traveler)}</td>
              <td className={cn(TABLE.td, "font-mono")}>{traveler.ticket_number ?? "—"}</td>
              <td className={TABLE.td}>{traveler.ticket_number ? <StatusBadge severity="fine">Issued</StatusBadge> : <Tag>Not issued</Tag>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
