import { PageHeading } from "@/components/admin/TabbedAdminPage";
import { useId, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/admin/ui/card";
import { EmptyState, LoadingCards, Notice } from "@/components/admin/ui/feedback";
import { FilterSelect } from "@/components/admin/ui/FilterSelect";
import { Input } from "@/components/admin/ui/field";
import { Pagination } from "@/components/admin/ui/pagination";
import { Tag } from "@/components/admin/ui/StatusBadge";
import { TABLE } from "@/components/admin/ui/classes";
import { NotAvailableNotice } from "@/components/admin/bookings/NotAvailable";
import { formatDateTime } from "@/lib/admin-bookings/format";
import { DATE_FILTERS, dateFilterFromParam, dateRange } from "@/lib/finance/date-range";
import { AUDIT_ACTION_LABEL, auditActionLabel, describeChange, fetchAuditLog, type AuditEntry } from "@/lib/finance/api";
import { GatewayError } from "@/lib/gateway/client";
import { cn } from "@/lib/utils";

// Users & Access > Audit Log (spec 11: who, when, what, old value, new value; read-only). Today it lists finance
// actions (travelian#91), which the gateway records for every money change. Filters live in the URL.
const PAGE_SIZE = 50;
const ACTION_OPTIONS = [{ value: "all", label: "All" }, ...Object.entries(AUDIT_ACTION_LABEL).map(([value, label]) => ({ value, label }))];

export default function AuditLogPage() {
  const [params, setParams] = useSearchParams();
  const searchId = useId();
  const date = dateFilterFromParam(params.get("date"));
  const action = params.get("action") ?? "all";
  const booking = params.get("booking") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [draft, setDraft] = useState(booking);
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (!value || value === "all") next.delete(key); else next.set(key, value);
    }
    if (!("page" in changes)) next.delete("page");
    setParams(next, { replace: true });
  };
  const query = {
    ...dateRange(date), action: action === "all" ? undefined : action, booking_reference: booking || undefined,
    limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE,
  };
  const log = useQuery({ queryKey: ["finance", "audit-log", query], queryFn: ({ signal }) => fetchAuditLog(query, { signal }) });
  const forbidden = log.error instanceof GatewayError && log.error.kind === "forbidden";
  const entries = log.data?.entries ?? [];
  const pages = Math.max(1, Math.ceil((log.data?.total ?? 0) / PAGE_SIZE));
  const filtered = date !== "all" || action !== "all" || !!booking;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <PageHeading className="text-page-title font-bold font-display">Audit Log</PageHeading>
        <p className="text-body text-muted-foreground">Every finance action: who did it, when, and what changed. Entries can't be edited or deleted.</p>
      </div>

      {forbidden ? (
        <NotAvailableNotice title="Not available for your role">
          The audit log needs the Finance permission. A super admin can grant it.
        </NotAvailableNotice>
      ) : (
        <Card className="shadow-card">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect id="audit-date" label="Date" value={date} options={[...DATE_FILTERS]} onChange={value => update({ date: value })} />
              <FilterSelect id="audit-action" label="Action" value={action} options={ACTION_OPTIONS} onChange={value => update({ action: value })} />
              <form role="search" className="relative w-full sm:w-64" onSubmit={event => { event.preventDefault(); update({ booking: draft.trim() }); }}>
                <label htmlFor={searchId} className="sr-only">Booking reference</label>
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id={searchId} value={draft} onChange={event => setDraft(event.target.value)} onBlur={() => draft.trim() !== booking && update({ booking: draft.trim() })}
                  placeholder="Booking reference" className="pl-9" />
              </form>
            </div>

            {log.isPending && <LoadingCards count={4} label="Loading the audit log" itemClassName="h-12" />}
            {log.error && !forbidden && <Notice tone="critical">{log.error.message || "The audit log couldn't be loaded. Try again in a moment."}</Notice>}
            {log.data && entries.length === 0 && (
              <EmptyState title={filtered ? "No entries match these filters." : "No finance actions yet."}>
                {filtered ? "Try All dates or clear the booking reference." : "Refunds, fees and supplier charges appear here as soon as someone records them."}
              </EmptyState>
            )}
            {entries.length > 0 && (
              <>
                <AuditTable entries={entries} />
                <Pagination page={page} pages={pages} onPage={next => update({ page: String(next) })} label="Audit log pages" />
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Who({ entry }: { entry: AuditEntry }) {
  if (entry.actor_role === "system") return <span>Automatic</span>;
  return <span className="block truncate" title={entry.actor_user_id ?? undefined}>{(entry.actor_role ?? "Unknown").replace(/_/g, " ")}</span>;
}

function BookingLink({ reference }: { reference?: string | null }) {
  return reference ? <Link to={`/admin/bookings/${encodeURIComponent(reference)}`} className="font-medium text-primary underline-offset-2 hover:underline">{reference}</Link> : <span>—</span>;
}

function Change({ entry }: { entry: AuditEntry }) {
  const lines = describeChange(entry.before, entry.after);
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      {lines.map(line => <span key={line} className="truncate" title={line}>{line}</span>)}
      {entry.reason && <span className="truncate text-muted-foreground" title={entry.reason}>Reason: {entry.reason}</span>}
    </span>
  );
}

function AuditTable({ entries }: { entries: AuditEntry[] }) {
  return (
    <>
      <div className={cn(TABLE.wrap, "hidden shadow-none md:block")}>
        <table className={cn(TABLE.table, "table-fixed")} aria-label="Audit log">
          <thead>
            <tr className={TABLE.headRow}>
              <th scope="col" className={cn(TABLE.th, "w-40")}>When</th>
              <th scope="col" className={cn(TABLE.th, "w-32")}>Who</th>
              <th scope="col" className={cn(TABLE.th, "w-48")}>Action</th>
              <th scope="col" className={cn(TABLE.th, "w-32")}>Booking</th>
              <th scope="col" className={TABLE.th}>What changed</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id} className={cn(TABLE.row, "align-top")}>
                <td className={cn(TABLE.td, "whitespace-nowrap tabular-nums")}>{formatDateTime(entry.at)}</td>
                <td className={cn(TABLE.td, "max-w-0 capitalize")}><Who entry={entry} /></td>
                <td className={TABLE.td}><Tag tone="navy">{auditActionLabel(entry.action)}</Tag></td>
                <td className={TABLE.td}><BookingLink reference={entry.booking_reference} /></td>
                <td className={cn(TABLE.td, "max-w-0")}><Change entry={entry} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-2 md:hidden" aria-label="Audit log">
        {entries.map(entry => (
          <li key={entry.id} className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-border p-3 text-body">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Tag tone="navy">{auditActionLabel(entry.action)}</Tag>
              <span className="text-label tabular-nums text-muted-foreground">{formatDateTime(entry.at)}</span>
            </div>
            <div className="flex flex-wrap gap-x-3 text-label text-muted-foreground">
              <span className="capitalize"><Who entry={entry} /></span>
              <BookingLink reference={entry.booking_reference} />
            </div>
            <Change entry={entry} />
          </li>
        ))}
      </ul>
    </>
  );
}
