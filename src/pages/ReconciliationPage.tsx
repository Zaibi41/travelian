import { useId, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent } from "@/components/admin/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Chip, EmptyState, LoadingCards, Notice } from "@/components/admin/ui/feedback";
import { FieldShell, Textarea } from "@/components/admin/ui/field";
import { StatusBadge, Tag } from "@/components/admin/ui/StatusBadge";
import { TABLE } from "@/components/admin/ui/classes";
import { NotAvailableNotice } from "@/components/admin/bookings/NotAvailable";
import { ImportStatementDialog } from "@/components/admin/finance/ImportStatementDialog";
import { formatDateTime, formatMoney } from "@/lib/admin-bookings/format";
import {
  MISMATCH_LABEL, decideBankMatch, fetchMismatches, fetchStatementImports, fetchStatementLines, resolveMismatch, runSupplierCheck,
  type Mismatch, type StatementImport,
} from "@/lib/finance/api";
import { GatewayError } from "@/lib/gateway/client";
import { cn } from "@/lib/utils";

// Finance > Reconciliation (travelian#71): import PayFast settlements, bank statements and supplier statements, confirm
// suggested matches, and work through one mismatch list (explained / resolved with a reason). Nothing here changes a
// payment or booking; the gateway matches and audits.
const TABS = [
  { value: "mismatches", label: "Mismatches" }, { value: "payfast", label: "PayFast" }, { value: "bank", label: "Bank" }, { value: "supplier", label: "Suppliers" },
] as const;
type Tab = (typeof TABS)[number]["value"];
const KEY = ["finance", "recon"];

export default function ReconciliationPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.some(t => t.value === params.get("tab")) ? params.get("tab") as Tab : "mismatches";
  const status = (["open", "explained", "resolved", "all"].includes(params.get("status") ?? "") ? params.get("status") : "open") as "open" | "explained" | "resolved" | "all";
  const mismatches = useQuery({ queryKey: [...KEY, "mismatches", status], queryFn: ({ signal }) => fetchMismatches(status, { signal }) });
  const forbidden = mismatches.error instanceof GatewayError && mismatches.error.kind === "forbidden";
  const set = (key: string, value: string, fallback: string) => {
    const next = new URLSearchParams(params);
    if (value === fallback) next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  };
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-page-title font-bold font-display">Reconciliation</h1>
        <p className="text-body text-muted-foreground">Find money differences before they become losses: PayFast, bank statements and suppliers.</p>
      </div>
      {forbidden ? (
        <NotAvailableNotice title="Not available for your role">Reconciliation needs the Finance permission. A super admin can grant it.</NotAvailableNotice>
      ) : (
        <>
          <div role="tablist" aria-label="Reconciliation" className="-mx-1 flex gap-2 overflow-x-auto border-b px-1">
            {TABS.map(item => (
              <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} onClick={() => set("tab", item.value, "mismatches")}
                className={cn("inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-body font-medium",
                  tab === item.value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
                {item.label}
                {item.value === "mismatches" && status === "open" && !!mismatches.data?.total && <Tag tone="navy">{mismatches.data.total}</Tag>}
              </button>
            ))}
          </div>
          {tab === "mismatches" ? <Mismatches status={status} onStatus={value => set("status", value, "open")} query={mismatches} />
            : <Statements kind={tab} />}
        </>
      )}
    </div>
  );
}

function Mismatches({ status, onStatus, query }: { status: string; onStatus: (value: string) => void; query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof fetchMismatches>>>> }) {
  const [acting, setActing] = useState<Mismatch | null>(null);
  const rows = query.data?.mismatches ?? [];
  return (
    <Card className="shadow-card">
      <CardContent className="flex flex-col gap-4 p-5">
        <div role="group" aria-label="Status" className="flex flex-wrap gap-2">
          {(["open", "explained", "resolved", "all"] as const).map(value => (
            <Chip key={value} pressed={status === value} onClick={() => onStatus(value)}>{value[0].toUpperCase() + value.slice(1)}</Chip>
          ))}
        </div>
        {query.isPending && <LoadingCards count={3} label="Loading mismatches" itemClassName="h-16" />}
        {query.error && <Notice tone="critical">{query.error.message}</Notice>}
        {query.data && rows.length === 0 && (
          <EmptyState title={status === "open" ? "No open mismatches." : "Nothing here."}>
            {status === "open" ? "Import a PayFast settlement or a bank statement to check the money against Travelian's records." : null}
          </EmptyState>
        )}
        {rows.length > 0 && (
          <ul className="flex flex-col gap-2" aria-label="Mismatches">
            {rows.map(m => (
              <li key={m.id} className={cn("flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3 text-body", m.status === "open" && "border-l-4 border-l-status-action")}>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <Tag tone="navy">{MISMATCH_LABEL[m.kind] ?? m.kind.replace(/_/g, " ")}</Tag>
                    {m.status === "open" ? <StatusBadge severity="action">Open</StatusBadge>
                      : <StatusBadge severity="fine">{m.status === "explained" ? "Explained" : "Resolved"}</StatusBadge>}
                    {m.booking_reference && <Link to={`/admin/bookings/${encodeURIComponent(m.booking_reference)}`} className="font-medium text-primary underline-offset-2 hover:underline">{m.booking_reference}</Link>}
                  </span>
                  <span className="break-words">{m.detail}</span>
                  {(m.expected || m.actual) && (
                    <span className="text-label text-muted-foreground">
                      {m.expected && <>Travelian: {formatMoney(m.expected)}</>}{m.expected && m.actual && " · "}{m.actual && <>Statement: {formatMoney(m.actual)}</>}
                    </span>
                  )}
                  {m.explanation && <span className="text-label text-muted-foreground">Explained {formatDateTime(m.explained_at)}: {m.explanation}</span>}
                  {m.resolution_reason && <span className="text-label text-muted-foreground">Resolved {formatDateTime(m.resolved_at)}: {m.resolution_reason}</span>}
                </span>
                {m.status !== "resolved" && <Button variant={m.status === "open" ? "primary" : "outline"} size="sm" onClick={() => setActing(m)}>{m.status === "open" ? "Explain or resolve" : "Resolve"}</Button>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {acting && <ResolveDialog mismatch={acting} onClose={() => setActing(null)} />}
    </Card>
  );
}

function ResolveDialog({ mismatch, onClose }: { mismatch: Mismatch; onClose: () => void }) {
  const id = useId();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"explained" | "resolved">(mismatch.status === "open" ? "explained" : "resolved");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const save = useMutation({
    mutationFn: () => resolveMismatch(mismatch.id, status, reason.trim()),
    onSuccess: () => { toast.success(status === "explained" ? "Explanation saved." : "Mismatch resolved."); void queryClient.invalidateQueries({ queryKey: KEY }); onClose(); },
  });
  return (
    <Dialog open onOpenChange={open => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{MISMATCH_LABEL[mismatch.kind] ?? "Mismatch"}</DialogTitle>
          <DialogDescription>{mismatch.detail}</DialogDescription>
        </DialogHeader>
        <form id={id} className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); setTouched(true); if (reason.trim()) save.mutate(); }}>
          {mismatch.status === "open" && (
            <div role="radiogroup" aria-label="Outcome" className="flex gap-2">
              {(["explained", "resolved"] as const).map(value => (
                <Button key={value} type="button" role="radio" aria-checked={status === value} size="sm" variant={status === value ? "secondary" : "outline"}
                  onClick={() => setStatus(value)}>{value === "explained" ? "Explained (still to settle)" : "Resolved"}</Button>
              ))}
            </div>
          )}
          <FieldShell id={`${id}-reason`} label={status === "explained" ? "What happened" : "How it was settled"} error={touched && !reason.trim() ? "Write it in plain words." : undefined}>
            <Textarea id={`${id}-reason`} value={reason} maxLength={1000} onChange={event => setReason(event.target.value)} />
          </FieldShell>
          <p className="text-label text-muted-foreground">Kept in the audit log; it can't be edited later.</p>
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

const IMPORT_HELP: Record<StatementImport["kind"], string> = {
  payfast: "Import PayFast's settlement report. Lines match card payments by transaction id; PayFast's fee is recorded on each payment.",
  bank: "Import a statement for one receiving account. Each credit gets a suggested payment; confirm or reject it.",
  supplier: "Check issued tickets against recorded supplier charges, or import a supplier statement.",
};

function Statements({ kind }: { kind: StatementImport["kind"] }) {
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);
  const [open, setOpen] = useState<StatementImport | null>(null);
  const imports = useQuery({ queryKey: [...KEY, "imports", kind], queryFn: ({ signal }) => fetchStatementImports(kind, { signal }) });
  const check = useMutation({
    mutationFn: runSupplierCheck,
    onSuccess: data => { toast.success(`${(data as { mismatches_added: number }).mismatches_added} new mismatch(es) listed.`); void queryClient.invalidateQueries({ queryKey: KEY }); },
    onError: error => toast.error(error.message),
  });
  const rows = imports.data?.imports ?? [];
  return (
    <Card className="shadow-card">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-body text-muted-foreground">{IMPORT_HELP[kind]}</p>
          <span className="flex flex-wrap gap-2">
            {kind === "supplier" && <Button variant="outline" onClick={() => check.mutate()} disabled={check.isPending}><CheckCircle2 aria-hidden="true" /> {check.isPending ? "Checking…" : "Check supplier charges"}</Button>}
            <Button variant="primary" onClick={() => setImporting(true)}><Upload aria-hidden="true" /> Import CSV</Button>
          </span>
        </div>
        {imports.isPending && <LoadingCards count={2} label="Loading imports" itemClassName="h-12" />}
        {imports.error && <Notice tone="critical">{imports.error.message}</Notice>}
        {imports.data && rows.length === 0 && <EmptyState title="Nothing imported yet." />}
        {rows.length > 0 && (
          <ul className="flex flex-col gap-2" aria-label="Imports">
            {rows.map(item => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-body">
                <span className="min-w-0">
                  <span className="block truncate font-medium" title={item.file_name}>{item.file_name}</span>
                  <span className="block text-label text-muted-foreground">
                    {[item.account_label, formatDateTime(item.imported_at), `${item.row_count} lines`].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  {item.matched > 0 && <StatusBadge severity="fine">{item.matched} matched</StatusBadge>}
                  {item.suggested > 0 && <StatusBadge severity="action">{item.suggested} to confirm</StatusBadge>}
                  {item.unmatched > 0 && <StatusBadge severity="critical">{item.unmatched} not matched</StatusBadge>}
                  <Button variant="outline" size="sm" onClick={() => setOpen(item)}>Open</Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {importing && <ImportStatementDialog kind={kind} onClose={() => setImporting(false)} />}
      {open && <LinesDialog item={open} onClose={() => setOpen(null)} />}
    </Card>
  );
}

const LINE_STATUS = { matched: ["Matched", "fine"], suggested: ["Suggested", "action"], unmatched: ["Not matched", "critical"], ignored: ["Ignored", "fine"] } as const;

function LinesDialog({ item, onClose }: { item: StatementImport; onClose: () => void }) {
  const queryClient = useQueryClient();
  const lines = useQuery({ queryKey: [...KEY, "lines", item.id], queryFn: ({ signal }) => fetchStatementLines(item.id, { signal }) });
  const decide = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) => decideBankMatch(id, accept),
    onSuccess: (_, { accept }) => { toast.success(accept ? "Match confirmed." : "Match rejected; it's on the mismatch list."); void queryClient.invalidateQueries({ queryKey: KEY }); },
    onError: error => toast.error(error.message),
  });
  return (
    <Dialog open onOpenChange={value => !value && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate">{item.file_name}</DialogTitle>
          <DialogDescription>{item.row_count} lines imported {formatDateTime(item.imported_at)}.</DialogDescription>
        </DialogHeader>
        {lines.isPending && <LoadingCards count={3} label="Loading lines" itemClassName="h-10" />}
        {lines.error && <Notice tone="critical">{lines.error.message}</Notice>}
        {lines.data && (
          <ul className="flex flex-col gap-2" aria-label="Statement lines">
            {lines.data.lines.map(line => (
              <li key={line.id} className="flex flex-col gap-2 rounded-lg border p-3 text-body sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0 flex-1">
                  <span className="whitespace-nowrap font-semibold tabular-nums">{formatMoney(line.amount)}</span>
                  {line.fee && <span className="text-muted-foreground"> · fee {formatMoney(line.fee)}</span>}
                  <span className="block truncate text-label text-muted-foreground" title={[line.reference, line.description].filter(Boolean).join(" · ")}>
                    Row {line.line_no}{line.occurred_on ? ` · ${line.occurred_on}` : ""}{line.reference ? ` · ${line.reference}` : ""}{line.description ? ` · ${line.description}` : ""}
                  </span>
                  {line.booking_reference && (
                    <span className="block text-label">
                      → <Link to={`/admin/bookings/${encodeURIComponent(line.booking_reference)}`} className="font-medium text-primary underline-offset-2 hover:underline">{line.booking_reference}</Link>
                      {line.payment_reference ? ` · payment ${line.payment_reference}` : ""}
                    </span>
                  )}
                </span>
                <span className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <StatusBadge severity={LINE_STATUS[line.status][1]}>{LINE_STATUS[line.status][0]}</StatusBadge>
                  {line.status === "suggested" && (
                    <>
                      <Button variant="outline" size="sm" disabled={decide.isPending} onClick={() => decide.mutate({ id: line.id, accept: false })}>Reject</Button>
                      <Button variant="primary" size="sm" disabled={decide.isPending} onClick={() => decide.mutate({ id: line.id, accept: true })}>Confirm</Button>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
