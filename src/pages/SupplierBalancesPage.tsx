import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookText, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { EmptyState, LoadingCards, Notice, Panel, PanelHeader } from "@/components/admin/ui/feedback";
import { FieldShell, Input } from "@/components/admin/ui/field";
import { LabeledSelect } from "@/components/admin/ui/LabeledSelect";
import { StatusBadge, Tag } from "@/components/admin/ui/StatusBadge";
import { TABLE } from "@/components/admin/ui/classes";
import { Fact, FinanceForbidden, FinancePageHeader, SideDrawer, isForbidden, moneyOrDash } from "@/components/admin/finance/FinanceShared";
import { formatDateTime } from "@/lib/admin-bookings/format";
import { paisaToInput, receivedAtIso, rupeesToPaisa } from "@/lib/admin-bookings/payments";
import { pktDay } from "@/lib/finance/date-range";
import { refreshSouthair } from "@/lib/finance/api";
import {
  LEDGER_KIND, SUPPLIER_STATUS, addSupplier, addSupplierTopUp, fetchSaleOptions, fetchSupplierLedger, fetchSuppliers, roleName,
  setSupplierOpening, setSupplierThreshold, type SupplierRow,
} from "@/lib/finance/ops-api";
import { cn } from "@/lib/utils";

// Finance > Supplier Balances. Every figure comes from the gateway; the balance only moves three ways (a top-up, a Ticket
// Sale Entry, a real booking's issuance or its Supplier payment settlement) and never below zero (D52).
const KEY = ["finance", "suppliers"];
type Action = "opening" | "top_up" | "adjustment" | "threshold";

export default function SupplierBalancesPage() {
  const suppliers = useQuery({ queryKey: KEY, queryFn: ({ signal }) => fetchSuppliers({ signal }) });
  const [ledgerFor, setLedgerFor] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const rows = suppliers.data?.suppliers ?? [];
  const selected = rows.find(row => row.id === ledgerFor) ?? null;
  return (
    <div className="min-w-0 space-y-6 animate-fade-in">
      <FinancePageHeader title="Supplier Balances"
        description="Travelian's balance at each supplier. It goes up with a top-up and down with each ticket sold or issued through it, and never below zero."
        action={!isForbidden(suppliers.error) && <Button variant="primary" onClick={() => setAdding(true)}><Plus aria-hidden="true" /> Add Supplier</Button>} />
      {isForbidden(suppliers.error) ? <FinanceForbidden /> : (
        <>
          {suppliers.isPending && <LoadingCards count={2} label="Loading supplier balances" itemClassName="h-48" />}
          {suppliers.error && <Notice tone="critical">{suppliers.error.message}</Notice>}
          {suppliers.data && SECTIONS.map(section => (
            <SupplierSection key={section} section={section} rows={rows.filter(row => row.section === section)} onLedger={setLedgerFor} />
          ))}
        </>
      )}
      {selected && <LedgerDrawer supplier={selected} onClose={() => setLedgerFor(null)} />}
      {adding && <AddSupplierDialog onClose={() => setAdding(false)} />}
    </div>
  );
}

const SECTIONS = ["api", "direct", "b2b", "hotels"] as const;
type Section = (typeof SECTIONS)[number];
const SECTION_TEXT: Record<Section, { title: string; hint: string }> = {
  api: { title: "API-integrated", hint: "Flights booked through Travelian's connection to the supplier." },
  direct: { title: "Direct airline IDs", hint: "Booked on the airline's own portal with Travelian's ID; the balance is calculated here." },
  b2b: { title: "B2B portals", hint: "B2B flight and group ticketing portals not connected by API (for example AeroGlobe); the balance is calculated here." },
  hotels: { title: "Hotels", hint: "Hotel suppliers. RateHawk is booked by API; its balance is calculated here until its API provides one." },
};

function ModeBadges({ row }: { row: SupplierRow }) {
  return (
    <span className="flex flex-wrap gap-1">
      <Tag>Booking: {row.booking_mode === "api" ? "API" : "Manual"}</Tag>
      <Tag>Balance: {row.balance_mode === "api" ? "API" : "Manual"}</Tag>
      {row.settlement_tag && <Tag>{row.settlement_tag}</Tag>}
    </span>
  );
}

function StatusPill({ row }: { row: SupplierRow }) {
  const status = SUPPLIER_STATUS[row.status];
  return status.severity ? <StatusBadge severity={status.severity}>{status.label}</StatusBadge> : <Tag>{status.label}</Tag>;
}

function SupplierSection({ section, rows, onLedger }: { section: Section; rows: SupplierRow[]; onLedger: (id: string) => void }) {
  const text = SECTION_TEXT[section];
  const headingId = `suppliers-${section}`;
  return (
    <section aria-labelledby={headingId} className="min-w-0 space-y-3">
      <div>
        <h2 id={headingId} className="text-section font-semibold">{text.title}</h2>
        <p className="text-label text-muted-foreground">{text.hint}</p>
      </div>
      {rows.length === 0 ? <EmptyState title="No suppliers here yet." /> : (
        <>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:hidden" aria-label={text.title}>
            {rows.map(row => (
              <li key={row.id}>
                <Panel className={cn("flex flex-col gap-3", stripe(row))}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-semibold" title={row.name}>{row.name}</p>
                      <ModeBadges row={row} />
                    </div>
                    <StatusPill row={row} />
                  </div>
                  <dl className="grid grid-cols-2 gap-2">
                    <Fact label="Current balance"><span className={cn("text-section", row.status === "negative" && "text-status-critical-text")}>{moneyOrDash(row.current_balance)}</span></Fact>
                    <Fact label="Low below">{moneyOrDash(row.low_threshold)}</Fact>
                    <Fact label="Topped up">{moneyOrDash(row.total_topped_up)}</Fact>
                    <Fact label="Deducted">{moneyOrDash(row.total_deducted)}</Fact>
                  </dl>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-label text-muted-foreground">Updated {formatDateTime(row.last_updated)}</span>
                    <Button variant="outline" size="sm" onClick={() => onLedger(row.id)}><BookText aria-hidden="true" /> Ledger</Button>
                  </div>
                </Panel>
              </li>
            ))}
          </ul>
          <div className={cn(TABLE.wrap, "relative hidden md:block")}>
            <table className={cn(TABLE.table, "min-w-[52rem]")}>
              <thead>
                <tr className={TABLE.headRow}>
                  {["Supplier", "Opening Balance", "Total Topped Up", "Total Deducted", "Current Balance", "Status", "Low below", "Last updated", ""].map(column => (
                    <th key={column || "actions"} scope="col" className={cn(TABLE.th, "whitespace-normal leading-tight", column && column !== "Supplier" && column !== "Status" && column !== "Last updated" && "text-right")}>
                      {column || <span className="sr-only">Actions</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className={TABLE.row}>
                    <td className={cn(TABLE.td, "min-w-[12.5rem]")}>
                      <span className="block max-w-[14rem] truncate font-semibold" title={row.name}>{row.name}</span>
                      <ModeBadges row={row} />
                    </td>
                    <td className={cn(TABLE.td, "whitespace-nowrap text-right tabular-nums")}>{row.balance_mode === "api" ? "—" : moneyOrDash(row.opening_balance)}</td>
                    <td className={cn(TABLE.td, "whitespace-nowrap text-right tabular-nums")}>{moneyOrDash(row.total_topped_up)}</td>
                    <td className={cn(TABLE.td, "whitespace-nowrap text-right tabular-nums")}>{moneyOrDash(row.total_deducted)}</td>
                    <td className={cn(TABLE.td, "whitespace-nowrap text-right font-semibold tabular-nums", row.status === "negative" && "text-status-critical-text")}>
                      {moneyOrDash(row.current_balance)}
                    </td>
                    <td className={TABLE.td}><StatusPill row={row} /></td>
                    <td className={cn(TABLE.td, "whitespace-nowrap text-right tabular-nums")}>{moneyOrDash(row.low_threshold)}</td>
                    <td className={cn(TABLE.td, "tabular-nums text-muted-foreground")}>{formatDateTime(row.last_updated)}</td>
                    <td className={cn(TABLE.td, "text-right")}>
                      <Button variant="outline" size="sm" onClick={() => onLedger(row.id)} aria-label={`${row.name} ledger`}><BookText aria-hidden="true" /> Ledger</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

const stripe = (row: SupplierRow) =>
  row.status === "negative" ? "border-l-4 border-l-status-critical" : row.status === "low" ? "border-l-4 border-l-status-action" : undefined;

function LedgerDrawer({ supplier, onClose }: { supplier: SupplierRow; onClose: () => void }) {
  const queryClient = useQueryClient();
  const ledger = useQuery({ queryKey: ["finance", "supplier-ledger", supplier.id], queryFn: ({ signal }) => fetchSupplierLedger(supplier.id, { signal }) });
  const [action, setAction] = useState<Action | null>(null);
  const manual = supplier.balance_mode === "manual";
  const refresh = useMutation({
    mutationFn: refreshSouthair,
    onSuccess: () => { toast.success(`${supplier.name} balance read.`); void queryClient.invalidateQueries({ queryKey: ["finance"] }); },
    onError: error => toast.error(error.message),
  });
  const items = [...(ledger.data?.items ?? [])].reverse(); // newest first
  return (
    <SideDrawer open onClose={onClose} wide title={`${supplier.name} ledger`}
      description="Every change to this balance, newest first, with what caused it.">
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact label="Current balance"><span className={cn(supplier.status === "negative" && "text-status-critical-text")}>{moneyOrDash(supplier.current_balance)}</span></Fact>
          <Fact label="Status"><StatusPill row={supplier} /></Fact>
          <Fact label="Low below">{moneyOrDash(supplier.low_threshold)}</Fact>
          <Fact label="Balance from">{manual ? "Calculated here" : `${supplier.name}'s system`}</Fact>
        </dl>
        <div className="flex flex-wrap gap-2">
          {manual && !supplier.opening_balance && <Button size="sm" variant="primary" onClick={() => setAction("opening")}>Set opening balance</Button>}
          {manual && <Button size="sm" variant={supplier.opening_balance ? "primary" : "outline"} onClick={() => setAction("top_up")}><Plus aria-hidden="true" /> Record top-up</Button>}
          {manual && <Button size="sm" variant="outline" onClick={() => setAction("adjustment")}>Adjust balance</Button>}
          {!manual && supplier.id === "southair" && (
            <Button size="sm" variant="primary" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
              <RefreshCw aria-hidden="true" className={cn(refresh.isPending && "animate-spin")} /> {refresh.isPending ? "Reading…" : "Read balance now"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setAction("threshold")}>Low-balance threshold</Button>
        </div>
        {!manual && <Notice>Top-ups are made in {supplier.name}'s own system; the balance here is read from it.</Notice>}
        {ledger.isPending && <LoadingCards count={4} label="Loading ledger" itemClassName="h-10" />}
        {ledger.error && <Notice tone="critical">{ledger.error.message}</Notice>}
        {ledger.data && items.length === 0 && <EmptyState title="Nothing recorded yet.">{manual ? "Set the opening balance to start." : "Read the balance to start."}</EmptyState>}
        {items.length > 0 && (
          <ol className="flex flex-col divide-y divide-border rounded-xl border border-border" aria-label={`${supplier.name} ledger`}>
            {items.map((item, index) => (
              <li key={index} className={cn("flex flex-col gap-1 px-3 py-2.5", !item.counted && "opacity-70")}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <Tag>{LEDGER_KIND[item.kind]}</Tag>
                    <span className="min-w-0 truncate text-body font-medium" title={item.description}>{item.description}</span>
                  </span>
                  <span className={cn("whitespace-nowrap text-body font-semibold tabular-nums", item.amount && item.amount.amount_minor < 0 && "text-status-critical-text")}>
                    {item.amount ? `${item.amount.amount_minor > 0 ? "+" : ""}${moneyOrDash(item.amount)}` : moneyOrDash(item.balance_after)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 text-label text-muted-foreground">
                  <span className="flex flex-wrap gap-x-2">
                    <span className="tabular-nums">{formatDateTime(item.at)}</span>
                    <span>· {roleName(item.by_role)}</span>
                    {item.booking_reference && (
                      <Link to={`/admin/bookings/${encodeURIComponent(item.booking_reference)}`} className="text-primary underline-offset-2 hover:underline">
                        Booking {item.booking_reference}
                      </Link>
                    )}
                    {item.ticket_sale_number != null && (
                      <Link to={`/admin/finance/ticket-sales?entry=${item.ticket_sale_number}`} className="text-primary underline-offset-2 hover:underline">
                        Ticket Sale Entry #{item.ticket_sale_number}
                      </Link>
                    )}
                    {item.reference && <span className="truncate">· {item.reference}</span>}
                    {!item.counted && <span>· before tracking started (not in the balance)</span>}
                  </span>
                  {item.amount && item.balance_after && <span className="tabular-nums">Balance {moneyOrDash(item.balance_after)}</span>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
      {action && <BalanceDialog supplier={supplier} action={action} onClose={() => setAction(null)} />}
    </SideDrawer>
  );
}

const ACTION_TEXT: Record<Action, { title: string; description: string; save: string }> = {
  opening: { title: "Set opening balance", description: "The balance on the supplier's portal (or the Excel sheet) on the date you start tracking here. Set once; later changes are adjustments.", save: "Set opening balance" },
  top_up: { title: "Record top-up", description: "Money Travelian already paid into the supplier account. This records it; it sends nothing.", save: "Record top-up" },
  adjustment: { title: "Adjust balance", description: "Correct the balance to match the supplier's portal. It can't take the balance below zero. The reason is kept in the audit log.", save: "Adjust balance" },
  threshold: { title: "Low-balance threshold", description: "The status turns Low below this amount, and the supplier shows on the Finance overview.", save: "Save" },
};

function BalanceDialog({ supplier, action, onClose }: { supplier: SupplierRow; action: Action; onClose: () => void }) {
  const id = useId();
  const queryClient = useQueryClient();
  const options = useQuery({ queryKey: ["finance", "sale-options"], queryFn: ({ signal }) => fetchSaleOptions({ signal }), enabled: action === "top_up" });
  const [amount, setAmount] = useState(action === "threshold" && supplier.low_threshold ? paisaToInput(supplier.low_threshold.amount_minor) : "");
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [account, setAccount] = useState("none");
  const [date, setDate] = useState(pktDay(new Date()));
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [touched, setTouched] = useState(false);
  const paisa = amount.trim() ? rupeesToPaisa(amount) : null;
  const at = receivedAtIso(date, time);
  const text = ACTION_TEXT[action];
  const problem = action === "threshold" ? (amount.trim() && !paisa ? "Enter an amount in rupees, or leave it empty." : null)
    : !paisa ? "Enter an amount." : !at ? "Enter a date and time (24-hour)." : action === "top_up" && !reference.trim() ? "Enter the bank or transfer reference."
    : action === "adjustment" && !reason.trim() ? "Say why, in plain words." : null;
  const save = useMutation({
    mutationFn: () => {
      if (action === "threshold") return setSupplierThreshold(supplier.id, paisa);
      if (action === "opening") return setSupplierOpening(supplier.id, { amount_minor: paisa!, as_of: at! });
      return addSupplierTopUp(supplier.id, {
        kind: action, amount_minor: action === "adjustment" && direction === "remove" ? -paisa! : paisa!, reference: reference.trim() || null,
        reason: reason.trim() || null, occurred_at: at!, paid_from_account_id: action === "top_up" && account !== "none" ? account : null,
      });
    },
    onSuccess: () => {
      toast.success(action === "threshold" ? "Threshold saved." : action === "opening" ? "Opening balance set." : action === "top_up" ? "Top-up recorded." : "Balance adjusted.");
      void queryClient.invalidateQueries({ queryKey: ["finance"] });
      onClose();
    },
  });
  return (
    <Dialog open onOpenChange={open => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{text.title}: {supplier.name}</DialogTitle>
          <DialogDescription>{text.description}</DialogDescription>
        </DialogHeader>
        <form id={id} className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); setTouched(true); if (!problem) save.mutate(); }}>
          {action === "adjustment" && (
            <div role="radiogroup" aria-label="Direction" className="flex gap-2">
              {(["add", "remove"] as const).map(value => (
                <Button key={value} type="button" role="radio" aria-checked={direction === value} size="sm" variant={direction === value ? "secondary" : "outline"}
                  onClick={() => setDirection(value)}>{value === "add" ? "Add to balance" : "Take off balance"}</Button>
              ))}
            </div>
          )}
          <FieldShell id={`${id}-amount`} label={action === "threshold" ? "Low below (Rs). Empty: no threshold." : "Amount (Rs)"}>
            <Input id={`${id}-amount`} inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} />
          </FieldShell>
          {action === "top_up" && (
            <>
              <FieldShell id={`${id}-ref`} label="Bank / transfer reference"><Input id={`${id}-ref`} value={reference} maxLength={120} onChange={event => setReference(event.target.value)} /></FieldShell>
              <LabeledSelect id={`${id}-account`} label="Paid from (optional)" value={account} onChange={setAccount}
                options={[{ value: "none", label: "Not recorded" }, ...(options.data?.accounts ?? []).map(option => ({ value: option.id, label: option.detail === "personal" ? `${option.name} (personal)` : option.name }))]} />
            </>
          )}
          {action === "adjustment" && (
            <>
              <FieldShell id={`${id}-reason`} label="Reason"><Input id={`${id}-reason`} value={reason} maxLength={500} onChange={event => setReason(event.target.value)} placeholder="For example: portal shows Rs 120,500" /></FieldShell>
              <FieldShell id={`${id}-ref`} label="Reference (optional)"><Input id={`${id}-ref`} value={reference} maxLength={120} onChange={event => setReference(event.target.value)} /></FieldShell>
            </>
          )}
          {action !== "threshold" && (
            <div className="grid grid-cols-2 gap-2">
              <FieldShell id={`${id}-date`} label={action === "top_up" ? "Paid on" : "As of"}><Input id={`${id}-date`} type="date" value={date} onChange={event => setDate(event.target.value)} /></FieldShell>
              <FieldShell id={`${id}-time`} label="Time"><Input id={`${id}-time`} value={time} onChange={event => setTime(event.target.value)} /></FieldShell>
            </div>
          )}
          {touched && problem && <Notice tone="critical">{problem}</Notice>}
          {save.error && <Notice tone="critical">{save.error.message}</Notice>}
        </form>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form={id} variant="primary" disabled={save.isPending}>{save.isPending ? "Saving…" : text.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddSupplierDialog({ onClose }: { onClose: () => void }) {
  const id = useId();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [section, setSection] = useState<"direct" | "b2b" | "hotels">("direct");
  const [tag, setTag] = useState("none");
  const [threshold, setThreshold] = useState("");
  const [touched, setTouched] = useState(false);
  const thresholdPaisa = threshold.trim() ? rupeesToPaisa(threshold) : null;
  const problem = name.trim().length < 2 ? "Enter the supplier's name." : threshold.trim() && !thresholdPaisa ? "Enter the threshold in rupees, or leave it empty." : null;
  const save = useMutation({
    mutationFn: () => addSupplier({ name: name.trim(), section, settlement_tag: tag === "none" ? null : tag as "DTS" | "IATA", low_threshold_minor: thresholdPaisa }),
    onSuccess: created => {
      toast.success(`${created.name} added. Set its opening balance from its ledger.`);
      void queryClient.invalidateQueries({ queryKey: ["finance"] });
      onClose();
    },
  });
  return (
    <Dialog open onOpenChange={open => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Supplier</DialogTitle>
          <DialogDescription>A direct airline ID, a B2B or group ticketing portal, or a hotel supplier. Its balance starts when you set the opening balance.</DialogDescription>
        </DialogHeader>
        <form id={id} className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); setTouched(true); if (!problem) save.mutate(); }}>
          <FieldShell id={`${id}-name`} label="Supplier name"><Input id={`${id}-name`} value={name} maxLength={120} onChange={event => setName(event.target.value)} /></FieldShell>
          <LabeledSelect id={`${id}-type`} label="Type" value={section} onChange={value => setSection(value as typeof section)}
            options={[{ value: "direct", label: "Direct airline ID" }, { value: "b2b", label: "B2B portal (flights / group ticketing)" }, { value: "hotels", label: "Hotels" }]} />
          <LabeledSelect id={`${id}-tag`} label="Settlement (reference only)" value={tag} onChange={setTag}
            options={[{ value: "none", label: "Not set" }, { value: "DTS", label: "DTS" }, { value: "IATA", label: "IATA" }]} />
          <FieldShell id={`${id}-threshold`} label="Low below (Rs, optional)"><Input id={`${id}-threshold`} inputMode="decimal" value={threshold} onChange={event => setThreshold(event.target.value)} /></FieldShell>
          {touched && problem && <Notice tone="critical">{problem}</Notice>}
          {save.error && <Notice tone="critical">{save.error.message}</Notice>}
        </form>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form={id} variant="primary" disabled={save.isPending}>{save.isPending ? "Adding…" : "Add Supplier"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
