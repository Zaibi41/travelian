import { useEffect, useId, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ListChecks, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { EmptyState, LoadingCards, Notice, Panel, PanelHeader } from "@/components/admin/ui/feedback";
import { FieldShell, Input, Textarea } from "@/components/admin/ui/field";
import { LabeledSelect } from "@/components/admin/ui/LabeledSelect";
import { StatusBadge, Tag } from "@/components/admin/ui/StatusBadge";
import { TABLE } from "@/components/admin/ui/classes";
import { PersonTypeahead } from "@/components/admin/people/PersonTypeahead";
import { PersonFormDialog } from "@/components/admin/people/PersonDialogs";
import { FinanceForbidden, FinancePageHeader, isForbidden, moneyOrDash } from "@/components/admin/finance/FinanceShared";
import { formatDateTime } from "@/lib/admin-bookings/format";
import { rupeesToPaisa } from "@/lib/admin-bookings/payments";
import {
  CHANNEL_LABEL, confirmTicketSale, fetchSaleOptions, fetchTicketSales, previewTicketSale, rejectTicketSale, roleName, saveTicketSale,
  type SaleRequest, type TicketSale,
} from "@/lib/finance/ops-api";
import { fetchPerson } from "@/lib/saved-people/api";
import { fullName } from "@/lib/saved-people/states";
import { cn } from "@/lib/utils";

// Finance > Ticket Sale Entry: a ticket sold outside the booking flow (replaces the Excel sheet). The gateway works out the
// profit and what saving will do ("This entry will also"), checks the negative-balance block (D52), and decides who
// saves it confirmed (Finance, D55) and who submits it for Finance to confirm.
const NONE = "none";
const SALES_KEY = ["finance", "ticket-sales"];

interface Draft {
  channel: SaleRequest["channel"]; partner: string; customer: { id: string; name: string } | null; travelDate: string; route: string; pnr: string;
  supplier: string; cost: string; sale: string; received: string; account: string; status: "issued" | "on_hold"; notes: string;
}
const BLANK: Draft = { channel: "direct", partner: NONE, customer: null, travelDate: "", route: "", pnr: "", supplier: NONE, cost: "", sale: "", received: "", account: NONE, status: "issued", notes: "" };

/** Rupees typed → paisa; empty or zero → 0; not a rupee amount → null. */
const paisaOr0 = (text: string) => (!text.trim() || /^\s*0+(\.0{1,2})?\s*$/.test(text) ? 0 : rupeesToPaisa(text));

function toRequest(draft: Draft): SaleRequest | null {
  const cost = paisaOr0(draft.cost), sale = paisaOr0(draft.sale), received = paisaOr0(draft.received);
  if (cost === null || sale === null || received === null) return null;
  return {
    channel: draft.channel, agency_id: draft.channel === "b2b" && draft.partner !== NONE ? draft.partner : null,
    customer_person_id: draft.customer?.id ?? null, passenger_name: draft.customer?.name ?? null, travel_date: draft.travelDate || null,
    route: draft.route.trim() || null, pnr: draft.pnr.trim().toUpperCase() || null, supplier_id: draft.supplier === NONE ? null : draft.supplier,
    cost_minor: cost, sale_minor: sale, received_minor: received, payment_account_id: draft.account === NONE ? null : draft.account,
    ticket_status: draft.status, notes: draft.notes.trim() || null,
  };
}

/** The request 300 ms after typing stops (the preview follows it). */
function useSettled<T>(value: T, delay = 300) {
  const [settled, setSettled] = useState(value);
  useEffect(() => { const timer = window.setTimeout(() => setSettled(value), delay); return () => window.clearTimeout(timer); }, [value, delay]);
  return settled;
}

export default function TicketSaleEntryPage() {
  const options = useQuery({ queryKey: ["finance", "sale-options"], queryFn: ({ signal }) => fetchSaleOptions({ signal }) });
  if (isForbidden(options.error)) return <div className="min-w-0 space-y-6"><FinancePageHeader title="Ticket Sale Entry" description="Record a ticket sold outside the booking flow." /><FinanceForbidden /></div>;
  const finance = options.data?.is_finance ?? false;
  return (
    <div className="min-w-0 space-y-6 animate-fade-in">
      <FinancePageHeader title="Ticket Sale Entry"
        description={finance ? "Record a ticket sold outside the booking flow. Saving it updates the supplier balance, the account and Customer Dues at once."
          : "Record a ticket sold outside the booking flow. It goes to Finance to confirm; nothing changes until they do."} />
      {options.isPending && <LoadingCards count={2} label="Loading the form" itemClassName="h-64" />}
      {options.error && <Notice tone="critical">{options.error.message}</Notice>}
      {options.data && <SaleForm />}
      {options.data && <SalesList />}
    </div>
  );
}

function SaleForm() {
  const id = useId();
  const queryClient = useQueryClient();
  const options = useQuery({ queryKey: ["finance", "sale-options"], queryFn: ({ signal }) => fetchSaleOptions({ signal }) }).data!;
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [adding, setAdding] = useState(false);
  const [touched, setTouched] = useState(false);
  const set = (patch: Partial<Draft>) => setDraft(current => ({ ...current, ...patch }));
  const request = useMemo(() => toRequest(draft), [draft]);
  const settled = useSettled(request);
  const preview = useQuery({
    queryKey: ["finance", "sale-preview", settled],
    queryFn: ({ signal }) => previewTicketSale(settled!, { signal }),
    enabled: !!settled, placeholderData: previous => previous, staleTime: 5_000,
  });
  const save = useMutation({
    mutationFn: () => saveTicketSale(request!),
    onSuccess: sale => {
      toast.success(sale.state === "confirmed" ? `Ticket Sale Entry #${sale.number} saved.` : `Ticket Sale Entry #${sale.number} sent to Finance to confirm.`);
      void queryClient.invalidateQueries({ queryKey: ["finance"] });
      setDraft(BLANK);
      setTouched(false);
    },
  });
  const amountError = (text: string) => (paisaOr0(text) === null ? "Enter an amount in rupees." : undefined);
  const problems = preview.data?.problems ?? [];
  const missing = !draft.customer ? "Find or add the passenger." : !draft.cost.trim() || !draft.sale.trim() ? "Enter the cost and the sale price." : null;
  const finance = options.is_finance;
  const submit = () => { setTouched(true); if (request && !missing && !problems.length && !preview.isFetching) save.mutate(); };
  const accountOptions = [{ value: NONE, label: "Not received yet" }, ...options.accounts.map(account => ({ value: account.id, label: account.detail === "personal" ? `${account.name} (personal)` : account.name }))];
  return (
    <form id={id} aria-label="Ticket Sale Entry" className="grid gap-card-gap lg:grid-cols-[minmax(0,1fr)_22rem]" onSubmit={event => { event.preventDefault(); submit(); }}>
      <Panel className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-label font-medium text-muted-foreground">Channel</legend>
          <div role="radiogroup" aria-label="Channel" className="flex flex-wrap gap-2">
            {(["direct", "b2b", "other"] as const).map(value => (
              <Button key={value} type="button" role="radio" aria-checked={draft.channel === value} size="sm" variant={draft.channel === value ? "secondary" : "outline"}
                onClick={() => set({ channel: value })}>{CHANNEL_LABEL[value]}</Button>
            ))}
          </div>
        </fieldset>
        {draft.channel === "b2b" && (
          <LabeledSelect id={`${id}-partner`} label="B2B partner" value={draft.partner} onChange={partner => set({ partner })}
            options={[{ value: NONE, label: options.partners.length ? "Choose the partner" : "No partners yet" }, ...options.partners.map(partner => ({ value: partner.id, label: partner.name }))]} />
        )}
        <div className="flex flex-col gap-1.5">
          <span className="text-label font-medium text-muted-foreground" id={`${id}-passenger-label`}>Passenger</span>
          {draft.customer ? (
            <div className="flex min-h-control items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3">
              <span className="truncate font-medium" title={draft.customer.name}>{draft.customer.name}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => set({ customer: null })} aria-label="Change passenger"><X aria-hidden="true" /> Change</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="min-w-0 flex-1">
                <PersonTypeahead id={`${id}-passenger`} label="Find passenger" kind="customer" placeholder="Name, phone, email, or passport or CNIC number"
                  emptyText="No saved customer matches. Add them as new." onPick={person => set({ customer: { id: person.id, name: fullName(person) } })} />
              </div>
              <Button type="button" variant="outline" onClick={() => setAdding(true)}><UserPlus aria-hidden="true" /> Add new</Button>
            </div>
          )}
          {touched && !draft.customer && <p className="text-label text-status-critical-text">Find the passenger, or add them as a new customer.</p>}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <FieldShell id={`${id}-date`} label="Travel date"><Input id={`${id}-date`} type="date" value={draft.travelDate} onChange={event => set({ travelDate: event.target.value })} /></FieldShell>
          <FieldShell id={`${id}-route`} label="Route"><Input id={`${id}-route`} value={draft.route} maxLength={80} placeholder="LHE-JED" onChange={event => set({ route: event.target.value })} /></FieldShell>
          <FieldShell id={`${id}-pnr`} label="PNR"><Input id={`${id}-pnr`} value={draft.pnr} maxLength={20} onChange={event => set({ pnr: event.target.value })} /></FieldShell>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <LabeledSelect id={`${id}-supplier`} label="Airline ID (optional)" value={draft.supplier} onChange={supplier => set({ supplier })}
            note="Its balance is reduced by the cost when the entry is saved."
            options={[{ value: NONE, label: "None" }, ...options.suppliers.map(supplier => ({ value: supplier.id, label: supplier.name }))]} />
          <LabeledSelect id={`${id}-status`} label="Status" value={draft.status} onChange={status => set({ status: status as Draft["status"] })}
            options={[{ value: "issued", label: "Issued" }, { value: "on_hold", label: "On hold (nothing deducted)" }]} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <FieldShell id={`${id}-cost`} label="Cost (Rs)" error={amountError(draft.cost)}><Input id={`${id}-cost`} inputMode="decimal" value={draft.cost} onChange={event => set({ cost: event.target.value })} /></FieldShell>
          <FieldShell id={`${id}-sale`} label="Sale price (Rs)" error={amountError(draft.sale)}><Input id={`${id}-sale`} inputMode="decimal" value={draft.sale} onChange={event => set({ sale: event.target.value })} /></FieldShell>
          <FieldShell id={`${id}-received`} label="Amount received (Rs)" error={amountError(draft.received)}><Input id={`${id}-received`} inputMode="decimal" value={draft.received} onChange={event => set({ received: event.target.value })} /></FieldShell>
        </div>
        <LabeledSelect id={`${id}-account`} label="Payment account" value={draft.account} onChange={account => set({ account })} options={accountOptions} />
        <FieldShell id={`${id}-notes`} label="Notes (optional)"><Textarea id={`${id}-notes`} value={draft.notes} maxLength={1000} rows={2} onChange={event => set({ notes: event.target.value })} /></FieldShell>
      </Panel>
      <div className="flex flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
        <Panel aria-live="polite" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-label text-muted-foreground">Profit</span>
            <span className={cn("text-kpi-sm font-semibold tabular-nums", preview.data && preview.data.profit.amount_minor < 0 && "text-status-critical-text")}>
              {preview.data ? moneyOrDash(preview.data.profit) : "—"}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2 border-t border-border pt-2">
            <span className="text-label text-muted-foreground">Still due from the customer</span>
            <span className="font-semibold tabular-nums">{preview.data ? moneyOrDash(preview.data.due) : "—"}</span>
          </div>
          <div className="border-t border-border pt-2">
            <h2 className="text-body font-semibold">This entry will also</h2>
            {!request ? <p className="text-label text-muted-foreground">Fix the amounts to see what saving will do.</p>
              : preview.error ? <p className="text-label text-status-critical-text">{preview.error.message}</p>
              : !preview.data ? <p className="text-label text-muted-foreground">Working it out…</p>
              : (
                <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-body">
                  {preview.data.effects.map(effect => <li key={effect} className="break-words">{effect}</li>)}
                </ul>
              )}
          </div>
          {problems.length > 0 && <Notice tone="critical" title="Can't save yet">{problems.join(" ")}</Notice>}
          {touched && missing && <Notice tone="critical">{missing}</Notice>}
          {save.error && <Notice tone="critical">{save.error.message}</Notice>}
          <Button type="submit" variant="primary" disabled={save.isPending} className="w-full">
            {save.isPending ? "Saving…" : finance ? "Save entry" : "Submit for Finance to confirm"}
          </Button>
        </Panel>
      </div>
      <PersonFormDialog open={adding} onOpenChange={setAdding} onSaved={async (personId, message) => {
        setAdding(false);
        toast.success(message);
        try {
          const person = await fetchPerson(personId);
          set({ customer: { id: personId, name: fullName(person) } });
        } catch {
          set({ customer: { id: personId, name: "Saved customer" } });
        }
      }} />
    </form>
  );
}

const STATE_BADGE: Record<TicketSale["state"], { label: string; severity: "fine" | "action" | "critical" }> = {
  confirmed: { label: "Confirmed", severity: "fine" }, pending: { label: "Waiting for Finance", severity: "action" }, rejected: { label: "Rejected", severity: "critical" },
};

function SalesList() {
  const [params, setParams] = useSearchParams();
  const filter = (["pending", "confirmed", "rejected"] as const).find(value => value === params.get("state")) ?? "all";
  const highlighted = Number(params.get("entry")) || null;
  const sales = useQuery({ queryKey: [...SALES_KEY, filter], queryFn: ({ signal }) => fetchTicketSales(filter === "all" ? undefined : filter, { signal }) });
  const [rejecting, setRejecting] = useState<TicketSale | null>(null);
  const queryClient = useQueryClient();
  const confirm = useMutation({
    mutationFn: (sale: TicketSale) => confirmTicketSale(sale.id),
    onSuccess: sale => { toast.success(`Ticket Sale Entry #${sale.number} confirmed.`); void queryClient.invalidateQueries({ queryKey: ["finance"] }); },
    onError: error => toast.error(error.message),
  });
  const items = sales.data?.items ?? [];
  const setFilter = (value: string) => setParams(current => { const next = new URLSearchParams(current); if (value === "all") next.delete("state"); else next.set("state", value); next.delete("entry"); return next; }, { replace: true });
  return (
    <section aria-labelledby="sales-heading" className="space-y-3">
      <PanelHeader id="sales-heading" title={sales.data?.can_confirm ? "Ticket sales" : "Your entries"}
        action={<LabeledSelect id="sales-state" label="Show" value={filter} onChange={setFilter} triggerClassName="h-control w-44"
          options={[{ value: "all", label: "All" }, { value: "pending", label: "Waiting for Finance" }, { value: "confirmed", label: "Confirmed" }, { value: "rejected", label: "Rejected" }]} />} />
      {sales.isPending && <LoadingCards count={3} label="Loading ticket sales" itemClassName="h-12" />}
      {sales.error && <Notice tone="critical">{sales.error.message}</Notice>}
      {sales.data && items.length === 0 && <EmptyState title="No ticket sales here yet." />}
      {items.length > 0 && (
        <div className={cn(TABLE.wrap, "relative")}>
          <table className={cn(TABLE.table, "min-w-[64rem]")}>
            <thead>
              <tr className={TABLE.headRow}>
                {["#", "Passenger", "Channel", "Route / PNR", "Airline ID", "Cost", "Sale", "Received", "Profit", "Status", "Logged", ""].map(column => (
                  <th key={column || "actions"} scope="col" className={cn(TABLE.th, ["Cost", "Sale", "Received", "Profit"].includes(column) && "text-right")}>{column || <span className="sr-only">Actions</span>}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(sale => (
                <tr key={sale.id} className={cn(TABLE.row, highlighted === sale.number && "bg-accent/60")} aria-current={highlighted === sale.number ? "true" : undefined}>
                  <td className={cn(TABLE.td, "tabular-nums")}>{sale.number}</td>
                  <td className={cn(TABLE.td, "max-w-[12rem] truncate")} title={sale.passenger_name}>{sale.passenger_name}</td>
                  <td className={cn(TABLE.td, "max-w-[10rem] truncate")} title={sale.agency_name ?? undefined}>{sale.agency_name ?? CHANNEL_LABEL[sale.channel]}</td>
                  <td className={cn(TABLE.td, "whitespace-nowrap")}>{[sale.route, sale.pnr].filter(Boolean).join(" · ") || "—"}</td>
                  <td className={cn(TABLE.td, "max-w-[9rem] truncate")} title={sale.supplier_name ?? undefined}>{sale.supplier_name ?? "—"}{sale.ticket_status === "on_hold" && <Tag className="ml-1">On hold</Tag>}</td>
                  <td className={cn(TABLE.td, "whitespace-nowrap text-right tabular-nums")}>{moneyOrDash(sale.cost)}</td>
                  <td className={cn(TABLE.td, "whitespace-nowrap text-right tabular-nums")}>{moneyOrDash(sale.sale)}</td>
                  <td className={cn(TABLE.td, "whitespace-nowrap text-right tabular-nums")}>{moneyOrDash(sale.received)}</td>
                  <td className={cn(TABLE.td, "whitespace-nowrap text-right font-semibold tabular-nums", sale.profit.amount_minor < 0 && "text-status-critical-text")}>{moneyOrDash(sale.profit)}</td>
                  <td className={TABLE.td}>
                    <StatusBadge severity={STATE_BADGE[sale.state].severity}>{STATE_BADGE[sale.state].label}</StatusBadge>
                    {sale.rejected_reason && <span className="mt-0.5 block max-w-[12rem] truncate text-label text-muted-foreground" title={sale.rejected_reason}>{sale.rejected_reason}</span>}
                  </td>
                  <td className={cn(TABLE.td, "whitespace-nowrap text-label text-muted-foreground")}>{formatDateTime(sale.submitted_at)}<br />{roleName(sale.submitted_by_role)}</td>
                  <td className={cn(TABLE.td, "whitespace-nowrap text-right")}>
                    {sales.data?.can_confirm && sale.state === "pending" && (
                      <span className="flex justify-end gap-1">
                        <Button size="sm" variant="primary" onClick={() => confirm.mutate(sale)} disabled={confirm.isPending}><CheckCircle2 aria-hidden="true" /> Confirm</Button>
                        <Button size="sm" variant="outline" onClick={() => setRejecting(sale)}>Reject</Button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!sales.data?.can_confirm && sales.data && <p className="flex items-center gap-1.5 text-label text-muted-foreground"><ListChecks className="h-4 w-4" aria-hidden="true" /> Only the entries you submitted are shown.</p>}
      {rejecting && <RejectDialog sale={rejecting} onClose={() => setRejecting(null)} />}
    </section>
  );
}

function RejectDialog({ sale, onClose }: { sale: TicketSale; onClose: () => void }) {
  const id = useId();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const save = useMutation({
    mutationFn: () => rejectTicketSale(sale.id, reason.trim()),
    onSuccess: () => { toast.success(`Ticket Sale Entry #${sale.number} rejected.`); void queryClient.invalidateQueries({ queryKey: ["finance"] }); onClose(); },
  });
  return (
    <Dialog open onOpenChange={open => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Ticket Sale Entry #{sale.number}?</DialogTitle>
          <DialogDescription>Nothing was deducted or recorded for it. The person who submitted it sees the reason.</DialogDescription>
        </DialogHeader>
        <form id={id} onSubmit={event => { event.preventDefault(); setTouched(true); if (reason.trim()) save.mutate(); }}>
          <FieldShell id={`${id}-reason`} label="Reason" error={touched && !reason.trim() ? "Say why it's rejected." : undefined}>
            <Input id={`${id}-reason`} value={reason} maxLength={500} onChange={event => setReason(event.target.value)} />
          </FieldShell>
          {save.error && <Notice tone="critical" className="mt-3">{save.error.message}</Notice>}
        </form>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form={id} variant="destructive" disabled={save.isPending}>{save.isPending ? "Rejecting…" : "Reject entry"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
