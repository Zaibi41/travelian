import { useId, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Search, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent } from "@/components/admin/ui/card";
import { EmptyState, LoadingCards, Notice } from "@/components/admin/ui/feedback";
import { FilterSelect } from "@/components/admin/ui/FilterSelect";
import { Input } from "@/components/admin/ui/field";
import { Pagination } from "@/components/admin/ui/pagination";
import { StatusBadge, Tag } from "@/components/admin/ui/StatusBadge";
import { TABLE } from "@/components/admin/ui/classes";
import { NotAvailableNotice } from "@/components/admin/bookings/NotAvailable";
import { PaymentSettingsDialog } from "@/components/admin/finance/PaymentSettingsDialog";
import { REFUND_METHOD_LABEL, REFUND_STATUS_LABEL, RefundStepDialog, RequestRefundDialog } from "@/components/admin/finance/RefundDialogs";
import { SlipReviewDialog } from "@/components/admin/finance/SlipReviewDialog";
import { fetchPaymentAccounts } from "@/lib/admin-bookings/api";
import { formatDateTime, formatMoney } from "@/lib/admin-bookings/format";
import { PAYMENT_METHOD_LABEL } from "@/lib/admin-bookings/payments";
import { DATE_FILTERS, dateFilterFromParam, dateRange } from "@/lib/finance/date-range";
import {
  bpsLabel, exportFinancePayments, fetchFinancePayments, fetchPaymentSettings, fetchRefundsDue,
  type FinancePayment, type PaymentList, type PaymentListQuery, type Refund, type RefundsDue,
} from "@/lib/finance/api";
import { GatewayError } from "@/lib/gateway/client";
import { cn } from "@/lib/utils";

// Finance > Payments (travelian#69): every incoming payment across bookings (gateway), slips to check (gateway#56) and
// refunds due. Filters live in the URL; Date defaults to All. All amounts and totals come from the gateway.
const PAGE_SIZE = 50;
const TABS = [
  { value: "all", label: "All payments" },
  { value: "awaiting", label: "Awaiting confirmation" },
  { value: "refunds", label: "Refunds due" },
] as const;
type Tab = (typeof TABS)[number]["value"];
const METHOD_OPTIONS = [{ value: "all", label: "All" }, ...Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => ({ value, label }))];
const STATUS_OPTIONS = [{ value: "all", label: "All" }, { value: "awaiting_check", label: "Awaiting check" }, { value: "confirmed", label: "Confirmed" },
  { value: "rejected", label: "Rejected" }];
const STATUS_LABEL: Record<FinancePayment["status"], string> = { awaiting_check: "Awaiting check", confirmed: "Confirmed", rejected: "Rejected" };
const SEVERITY: Record<FinancePayment["status"], "action" | "fine" | "critical"> = { awaiting_check: "action", confirmed: "fine", rejected: "critical" };

export default function PaymentsPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.some(t => t.value === params.get("tab")) ? params.get("tab") as Tab : "all";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settings = useQuery({ queryKey: ["finance", "payment-settings"], queryFn: ({ signal }) => fetchPaymentSettings({ signal }) });
  const forbidden = settings.error instanceof GatewayError && settings.error.kind === "forbidden";
  const setTab = (next: Tab) => setParams(next === "all" ? {} : { tab: next }, { replace: true });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-page-title font-bold font-display">Payments</h1>
          <p className="text-body text-muted-foreground">Money received on every booking, slips to check, and refunds owed.</p>
        </div>
        {settings.data && (
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings2 aria-hidden="true" /> Card fee: {bpsLabel(settings.data.card_fee_bps)}
          </Button>
        )}
      </div>

      {forbidden ? (
        <NotAvailableNotice title="Not available for your role">
          Finance → Payments needs the Finance permission. A super admin can grant it. Each booking's Payments tab still shows its payments.
        </NotAvailableNotice>
      ) : (
        <>
          <div role="tablist" aria-label="Payments" className="-mx-1 flex gap-2 overflow-x-auto border-b px-1">
            {TABS.map(item => (
              <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} onClick={() => setTab(item.value)}
                className={cn("whitespace-nowrap border-b-2 px-4 py-2 text-body font-medium",
                  tab === item.value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
                {item.label}
              </button>
            ))}
          </div>
          {tab === "refunds" ? <RefundsDueTab /> : <PaymentsTab awaitingOnly={tab === "awaiting"} />}
        </>
      )}
      {settingsOpen && settings.data && <PaymentSettingsDialog settings={settings.data} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function PaymentsTab({ awaitingOnly }: { awaitingOnly: boolean }) {
  const [params, setParams] = useSearchParams();
  const searchId = useId();
  const date = dateFilterFromParam(params.get("date"));
  const method = params.get("method") ?? "all";
  const status = awaitingOnly ? "awaiting_check" : params.get("status") ?? "all";
  const account = params.get("account") ?? "all";
  const q = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [draft, setDraft] = useState(q);
  const [reviewing, setReviewing] = useState<FinancePayment | null>(null);
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (!value || value === "all") next.delete(key); else next.set(key, value);
    }
    if (!("page" in changes)) next.delete("page");
    setParams(next, { replace: true });
  };
  const filters: Omit<PaymentListQuery, "limit" | "offset"> = {
    ...dateRange(date), method: method === "all" ? undefined : method, status: status === "all" ? undefined : status,
    account_id: account === "all" ? undefined : account, q: q || undefined,
  };
  const query = { ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
  const list = useQuery({ queryKey: ["finance", "payments", query], queryFn: ({ signal }) => fetchFinancePayments(query, { signal }) });
  const accounts = useQuery({ queryKey: ["admin-bookings", "payment-accounts"], queryFn: ({ signal }) => fetchPaymentAccounts({ signal }) });
  const exporting = useMutation({
    mutationFn: () => exportFinancePayments(filters),
    onSuccess: blob => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `travelian-payments-${filters.date_from ?? "all"}-${filters.date_to ?? "all"}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    },
    onError: error => toast.error(error.message),
  });
  const rows = list.data?.payments ?? [];
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / PAGE_SIZE));
  const filtered = date !== "all" || method !== "all" || (!awaitingOnly && status !== "all") || account !== "all" || !!q;

  return (
    <Card className="shadow-card">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect id="pay-date" label="Date" value={date} options={[...DATE_FILTERS]} onChange={value => update({ date: value })} />
          <FilterSelect id="pay-method" label="Method" value={method} options={METHOD_OPTIONS} onChange={value => update({ method: value })} />
          {!awaitingOnly && <FilterSelect id="pay-status" label="Status" value={status} options={STATUS_OPTIONS} onChange={value => update({ status: value })} />}
          <FilterSelect id="pay-account" label="Account" value={account} onChange={value => update({ account: value })}
            options={[{ value: "all", label: "All" }, ...(accounts.data?.accounts ?? []).map(a => ({ value: a.id, label: a.label }))]} />
          <form role="search" className="relative w-full sm:w-72" onSubmit={event => { event.preventDefault(); update({ q: draft.trim() }); }}>
            <label htmlFor={searchId} className="sr-only">Search by booking, PNR or customer</label>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id={searchId} value={draft} onChange={event => setDraft(event.target.value)} onBlur={() => draft.trim() !== q && update({ q: draft.trim() })}
              placeholder="Booking, PNR or customer" className="pl-9" />
          </form>
          <Button variant="outline" size="sm" className="sm:ml-auto" onClick={() => exporting.mutate()} disabled={exporting.isPending || !list.data?.total}>
            <Download aria-hidden="true" /> {exporting.isPending ? "Exporting…" : "Export CSV"}
          </Button>
        </div>

        {list.isPending && <LoadingCards count={4} label="Loading payments" itemClassName="h-12" />}
        {list.error && <Notice tone="critical">{list.error.message || "Payments couldn't be loaded. Try again in a moment."}</Notice>}
        {list.data && (
          <>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Summary label="Confirmed" value={formatMoney(list.data.confirmed)} note={`${list.data.confirmed_count} payment${list.data.confirmed_count === 1 ? "" : "s"}`} />
              <Summary label="Awaiting check" value={formatMoney(list.data.awaiting)} note={`${list.data.awaiting_count} slip${list.data.awaiting_count === 1 ? "" : "s"}`}
                tone={list.data.awaiting_count ? "action" : "fine"} />
              <Summary label="Shown" value={String(list.data.total)} note={filtered ? "Matching the filters" : "All payments and slips"} />
            </dl>
            {rows.length === 0 ? (
              <EmptyState title={awaitingOnly ? "No slips waiting for a check." : filtered ? "No payments match these filters." : "No payments yet."}>
                {awaitingOnly ? "When a customer uploads a bank transfer or JazzCash slip, it appears here." : filtered ? "Try All dates or clear the search." : null}
              </EmptyState>
            ) : (
              <>
                <PaymentTable rows={rows} onReview={setReviewing} />
                <Pagination page={page} pages={pages} onPage={next => update({ page: String(next) })} label="Payment pages" />
              </>
            )}
            {!awaitingOnly && list.data.daily_totals.length > 0 && <DailyTotals days={list.data.daily_totals} />}
          </>
        )}
      </CardContent>
      {reviewing && <SlipReviewDialog payment={reviewing} onClose={() => setReviewing(null)} />}
    </Card>
  );
}

function Summary({ label, value, note, tone }: { label: string; value: string; note: string; tone?: "action" | "fine" }) {
  return (
    <div className={cn("rounded-lg border p-3", tone === "action" && "border-l-4 border-l-status-action", tone === "fine" && "border-l-4 border-l-status-fine")}>
      <dt className="text-label text-muted-foreground">{label}</dt>
      <dd className="text-kpi-sm font-bold tabular-nums">{value}</dd>
      <dd className="text-label text-muted-foreground">{note}{tone === "action" ? " · needs action" : ""}</dd>
    </div>
  );
}

function BookingLink({ reference }: { reference: string }) {
  return <Link to={`/admin/bookings/${encodeURIComponent(reference)}/payments`} className="font-medium text-primary underline-offset-2 hover:underline">{reference}</Link>;
}

function Amount({ row }: { row: FinancePayment }) {
  return (
    <span className="flex shrink-0 flex-col items-end">
      <span className="whitespace-nowrap font-semibold tabular-nums">{formatMoney(row.amount)}</span>
      {row.card_fee.amount_minor > 0 && <span className="text-label text-muted-foreground">+ card fee {formatMoney(row.card_fee)}</span>}
    </span>
  );
}

function Action({ row, onReview }: { row: FinancePayment; onReview: (row: FinancePayment) => void }) {
  if (!row.slip_id) return null;
  return row.status === "awaiting_check"
    ? <Button variant="primary" size="sm" onClick={() => onReview(row)}>Check slip</Button>
    : <Button variant="outline" size="sm" onClick={() => onReview(row)}>View slip</Button>;
}

function PaymentTable({ rows, onReview }: { rows: FinancePayment[]; onReview: (row: FinancePayment) => void }) {
  const account = (row: FinancePayment) => row.account_label ?? "—";
  return (
    <>
      <div className={cn(TABLE.wrap, "hidden shadow-none lg:block")}>
        <table className={cn(TABLE.table, "table-fixed")} aria-label="Payments">
          <thead>
            <tr className={TABLE.headRow}>
              <th scope="col" className={cn(TABLE.th, "w-36")}>Date</th>
              <th scope="col" className={cn(TABLE.th, "w-36")}>Booking</th>
              <th scope="col" className={TABLE.th}>Customer</th>
              <th scope="col" className={cn(TABLE.th, "w-28")}>Method</th>
              <th scope="col" className={TABLE.th}>Account · reference</th>
              <th scope="col" className={cn(TABLE.th, "w-36 text-right")}>Amount</th>
              <th scope="col" className={cn(TABLE.th, "w-40")}>Status</th>
              <th scope="col" className={cn(TABLE.th, "w-28")}><span className="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={`${row.kind}-${row.id}`} className={cn(TABLE.row, "align-top")}>
                <td className={cn(TABLE.td, "whitespace-nowrap tabular-nums")}>{formatDateTime(row.at)}</td>
                <td className={TABLE.td}>
                  <BookingLink reference={row.booking_reference} />
                  {row.pnr && <span className="block text-label text-muted-foreground">PNR {row.pnr}</span>}
                  {row.is_test && <Tag>Test</Tag>}
                </td>
                <td className={cn(TABLE.td, "max-w-0")}><span className="block truncate" title={row.customer_name ?? undefined}>{row.customer_name ?? "—"}</span></td>
                <td className={TABLE.td}>{PAYMENT_METHOD_LABEL[row.method]}</td>
                <td className={cn(TABLE.td, "max-w-0")}>
                  <span className="block truncate" title={account(row)}>{account(row)}</span>
                  {row.payer_reference && <span className="block truncate text-label text-muted-foreground" title={row.payer_reference}>{row.payer_reference}</span>}
                </td>
                <td className={cn(TABLE.td, "text-right")}><Amount row={row} /></td>
                <td className={TABLE.td}>
                  <StatusBadge severity={SEVERITY[row.status]}>{STATUS_LABEL[row.status]}</StatusBadge>
                  {row.status === "rejected" && row.rejection_reason && <span className="mt-1 block truncate text-label text-muted-foreground" title={row.rejection_reason}>{row.rejection_reason}</span>}
                </td>
                <td className={cn(TABLE.td, "text-right")}><Action row={row} onReview={onReview} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-2 lg:hidden" aria-label="Payments">
        {rows.map(row => (
          <li key={`${row.kind}-${row.id}`} className="flex min-w-0 flex-col gap-2 rounded-lg border border-border p-3 text-body">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <BookingLink reference={row.booking_reference} />
              <StatusBadge severity={SEVERITY[row.status]}>{STATUS_LABEL[row.status]}</StatusBadge>
            </div>
            <div className="flex items-end justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate">{row.customer_name ?? "—"}</span>
                <span className="block truncate text-label text-muted-foreground">{PAYMENT_METHOD_LABEL[row.method]} · {account(row)}</span>
                <span className="block text-label tabular-nums text-muted-foreground">{formatDateTime(row.at)}</span>
              </span>
              <Amount row={row} />
            </div>
            {row.slip_id && <div className="flex justify-end"><Action row={row} onReview={onReview} /></div>}
          </li>
        ))}
      </ul>
    </>
  );
}

function DailyTotals({ days }: { days: PaymentList["daily_totals"] }) {
  return (
    <section aria-labelledby="daily-totals" className="flex flex-col gap-2">
      <h2 id="daily-totals" className="text-section-title font-semibold font-display">Daily totals (confirmed)</h2>
      <div className={cn(TABLE.wrap, "shadow-none")}>
        <table className={TABLE.table}>
          <thead>
            <tr className={TABLE.headRow}>
              <th scope="col" className={TABLE.th}>Day</th>
              <th scope="col" className={TABLE.th}>Method</th>
              <th scope="col" className={cn(TABLE.th, "text-right")}>Payments</th>
              <th scope="col" className={cn(TABLE.th, "text-right")}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {days.slice(0, 60).map(day => (
              <tr key={`${day.day}-${day.method}`} className={TABLE.row}>
                <td className={cn(TABLE.td, "whitespace-nowrap tabular-nums")}>{day.day}</td>
                <td className={TABLE.td}>{PAYMENT_METHOD_LABEL[day.method]}</td>
                <td className={cn(TABLE.td, "text-right tabular-nums")}>{day.count}</td>
                <td className={cn(TABLE.td, "text-right tabular-nums")}>
                  {formatMoney(day.amount)}
                  {day.card_fee.amount_minor > 0 && <span className="block text-label text-muted-foreground">+ card fees {formatMoney(day.card_fee)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RefundsDueTab() {
  const due = useQuery({ queryKey: ["finance", "refunds-due"], queryFn: ({ signal }) => fetchRefundsDue({ signal }) });
  const [recording, setRecording] = useState<RefundsDue["owed"][number] | null>(null);
  const [step, setStep] = useState<{ refund: Refund; step: "approve" | "paid" | "reject" } | null>(null);
  return (
    <div className="flex flex-col gap-6">
      {due.isPending && <LoadingCards count={3} label="Loading refunds due" itemClassName="h-14" />}
      {due.error && <Notice tone="critical">{due.error.message}</Notice>}
      {due.data && (
        <>
          <Card className="shadow-card">
            <CardContent className="flex flex-col gap-3 p-5">
              <h2 className="text-section-title font-semibold font-display">Owed, no refund recorded</h2>
              {due.data.owed.length === 0 ? (
                <EmptyState title="No paid booking is waiting for a refund." />
              ) : (
                <ul className="flex flex-col gap-2" aria-label="Refunds owed">
                  {due.data.owed.map(item => (
                    <li key={item.booking_reference} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-l-4 border-l-status-action p-3 text-body">
                      <span className="min-w-0">
                        <BookingLink reference={item.booking_reference} /> {item.is_test && <Tag>Test</Tag>}
                        <span className="block truncate text-muted-foreground">
                          {[item.customer_name, item.booking_status.replace(/_/g, " "), item.reason?.replace(/_/g, " ")].filter(Boolean).join(" · ")}
                        </span>
                        <span className="block text-label text-muted-foreground">Paid {formatMoney(item.paid)} · can refund {formatMoney(item.refundable)}</span>
                      </span>
                      <Button variant="primary" size="sm" onClick={() => setRecording(item)}>Record refund</Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="flex flex-col gap-3 p-5">
              <h2 className="text-section-title font-semibold font-display">Refunds in progress</h2>
              {due.data.open.length === 0 ? (
                <EmptyState title="No refund is waiting for approval or payout." />
              ) : (
                <ul className="flex flex-col gap-2" aria-label="Refunds in progress">
                  {due.data.open.map(refund => (
                    <li key={refund.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-body">
                      <span className="min-w-0">
                        <BookingLink reference={refund.booking_reference} />{" "}
                        <StatusBadge severity="action">{REFUND_STATUS_LABEL[refund.status]}</StatusBadge>
                        <span className="block truncate text-muted-foreground" title={refund.reason}>
                          {formatMoney(refund.amount)} by {REFUND_METHOD_LABEL[refund.method]} · {refund.reason}
                        </span>
                        <span className="block text-label text-muted-foreground">Requested {formatDateTime(refund.requested_at)}</span>
                      </span>
                      <span className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => setStep({ refund, step: "reject" })}>Reject</Button>
                        {refund.status === "requested"
                          ? <Button variant="primary" size="sm" onClick={() => setStep({ refund, step: "approve" })}>Approve</Button>
                          : <Button variant="primary" size="sm" onClick={() => setStep({ refund, step: "paid" })}>Mark paid</Button>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
      {recording && <RequestRefundDialog owed={recording} onClose={() => setRecording(null)} />}
      {step && <RefundStepDialog refund={step.refund} step={step.step} onClose={() => setStep(null)} />}
    </div>
  );
}
