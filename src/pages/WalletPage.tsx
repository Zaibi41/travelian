import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Plus, RefreshCw, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent } from "@/components/admin/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { EmptyState, LoadingCards, Notice } from "@/components/admin/ui/feedback";
import { FieldShell, Input } from "@/components/admin/ui/field";
import { StatusBadge, Tag } from "@/components/admin/ui/StatusBadge";
import { TABLE } from "@/components/admin/ui/classes";
import { NotAvailableNotice } from "@/components/admin/bookings/NotAvailable";
import { FinanceNotBuilt } from "@/components/admin/finance/FinanceNotBuilt";
import { useRole } from "@/contexts/RoleContext";
import { formatDateTime, formatMoney } from "@/lib/admin-bookings/format";
import { paisaToInput, receivedAtIso, rupeesToPaisa } from "@/lib/admin-bookings/payments";
import { pktDay } from "@/lib/finance/date-range";
import {
  fetchSupplierWallets, fetchWalletHistory, recordWalletEntry, refreshSouthair, setWalletThreshold,
  type SupplierWallet, type WalletHistoryItem,
} from "@/lib/finance/api";
import { GatewayError } from "@/lib/gateway/client";
import { cn } from "@/lib/utils";

// Finance > Wallets (travelian#68): Travelian's balance at each flight supplier. Southair is read from its system
// (read-only); SooperFare has no balance API, so its balance is calculated from recorded top-ups, adjustments and the
// actual charge of each issued ticket. No customer wallets (B2C customers have none). The gateway decides who sees it.
const WALLETS_KEY = ["finance", "wallets"];
const AGENCY_ROLES = ["agency_owner", "agency_staff", "customer"];

export default function WalletPage() {
  const { currentRole } = useRole();
  if (AGENCY_ROLES.includes(currentRole)) return <FinanceNotBuilt title="Wallets" />; // agency wallets: not built (D3)
  return <SupplierWallets />;
}

function SupplierWallets() {
  const wallets = useQuery({ queryKey: WALLETS_KEY, queryFn: ({ signal }) => fetchSupplierWallets({ signal }) });
  const forbidden = wallets.error instanceof GatewayError && wallets.error.kind === "forbidden";
  const [dialog, setDialog] = useState<{ wallet: SupplierWallet; kind: "top-ups" | "adjustments" | "threshold" } | null>(null);
  const [history, setHistory] = useState<SupplierWallet | null>(null);
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-page-title font-bold font-display">Wallets</h1>
        <p className="text-body text-muted-foreground">Travelian's balance at each flight supplier, and when it was last checked.</p>
      </div>
      {forbidden ? (
        <NotAvailableNotice title="Not available for your role">
          Supplier balances need the Finance and cost and margin permissions. A super admin can grant them.
        </NotAvailableNotice>
      ) : (
        <>
          {wallets.isPending && <LoadingCards count={2} label="Loading supplier balances" className="grid gap-card-gap md:grid-cols-2" itemClassName="h-56" />}
          {wallets.error && !forbidden && <Notice tone="critical">{wallets.error.message}</Notice>}
          {wallets.data && (
            <div className="grid gap-card-gap md:grid-cols-2">
              {wallets.data.wallets.map(wallet => (
                <WalletCard key={wallet.provider_id} wallet={wallet} onAction={kind => setDialog({ wallet, kind })} onHistory={() => setHistory(wallet)} />
              ))}
            </div>
          )}
          <p className="text-label text-muted-foreground">
            Customers have no wallet. Each issued ticket's actual supplier charge is on its booking; every change here is in the{" "}
            <Link to="/admin/audit-log" className="font-medium text-primary underline-offset-2 hover:underline">Audit Log</Link>.
          </p>
        </>
      )}
      {dialog && (dialog.kind === "threshold"
        ? <ThresholdDialog wallet={dialog.wallet} onClose={() => setDialog(null)} />
        : <EntryDialog wallet={dialog.wallet} kind={dialog.kind} onClose={() => setDialog(null)} />)}
      {history && <HistoryDialog wallet={history} onClose={() => setHistory(null)} />}
    </div>
  );
}

function WalletCard({ wallet, onAction, onHistory }: { wallet: SupplierWallet; onAction: (kind: "top-ups" | "adjustments" | "threshold") => void; onHistory: () => void }) {
  const queryClient = useQueryClient();
  const refresh = useMutation({
    mutationFn: refreshSouthair,
    onSuccess: () => { toast.success("Southair balance updated."); void queryClient.invalidateQueries({ queryKey: WALLETS_KEY }); },
    onError: error => toast.error(error.message),
  });
  const api = wallet.mode === "api";
  return (
    <Card className={cn("shadow-card", wallet.low === true && "border-l-4 border-l-status-critical", wallet.low === false && "border-l-4 border-l-status-fine")}>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-section-title font-semibold font-display" title={wallet.name}>{wallet.name}</h2>
            <p className="text-label text-muted-foreground">{api ? "Read from Southair's system" : "Calculated: top-ups − tickets ± adjustments"}</p>
          </div>
          {wallet.low === true && <StatusBadge severity="critical">Low</StatusBadge>}
          {wallet.low === false && <StatusBadge severity="fine">Above alert level</StatusBadge>}
          {wallet.low == null && <Tag>No alert set</Tag>}
        </div>
        <div>
          <p className="text-kpi font-bold tabular-nums">{wallet.balance ? formatMoney(wallet.balance) : "Not known"}</p>
          <p className="text-label text-muted-foreground">
            {wallet.as_of ? `${api ? "Checked" : "Last change"} ${formatDateTime(wallet.as_of)}` : wallet.note}
            {wallet.tracking_since ? ` · tracking since ${formatDateTime(wallet.tracking_since)}` : ""}
          </p>
          {wallet.threshold && <p className="text-label text-muted-foreground">Alert below {formatMoney(wallet.threshold)}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {api ? (
            <Button variant="primary" size="sm" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
              <RefreshCw aria-hidden="true" className={cn(refresh.isPending && "animate-spin")} /> {refresh.isPending ? "Checking…" : "Refresh"}
            </Button>
          ) : (
            <>
              <Button variant="primary" size="sm" onClick={() => onAction("top-ups")}><Plus aria-hidden="true" /> Record top-up</Button>
              <Button variant="outline" size="sm" onClick={() => onAction("adjustments")}>Adjust balance</Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => onAction("threshold")}><SlidersHorizontal aria-hidden="true" /> Alert level</Button>
          <Button variant="ghost" size="sm" onClick={onHistory}><History aria-hidden="true" /> History</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EntryDialog({ wallet, kind, onClose }: { wallet: SupplierWallet; kind: "top-ups" | "adjustments"; onClose: () => void }) {
  const id = useId();
  const queryClient = useQueryClient();
  const topUp = kind === "top-ups";
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(pktDay(new Date()));
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [touched, setTouched] = useState(false);
  const paisa = rupeesToPaisa(amount);
  const at = receivedAtIso(date, time);
  const valid = !!paisa && !!at && (topUp ? !!reference.trim() : !!reason.trim());
  const save = useMutation({
    mutationFn: () => recordWalletEntry(wallet.provider_id, kind, {
      amount_minor: topUp || direction === "add" ? paisa! : -paisa!, reference: reference.trim() || null, reason: reason.trim() || null, occurred_at: at!,
    }),
    onSuccess: () => {
      toast.success(topUp ? "Top-up recorded." : "Balance adjusted.");
      void queryClient.invalidateQueries({ queryKey: ["finance"] });
      onClose();
    },
  });
  return (
    <Dialog open onOpenChange={open => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{topUp ? `Record ${wallet.name} top-up` : `Adjust ${wallet.name} balance`}</DialogTitle>
          <DialogDescription>
            {topUp ? "Money Travelian already paid into the supplier account. This records it; it sends nothing."
              : "Correct the calculated balance, for example to match the supplier's portal. The reason is kept in the audit log."}
          </DialogDescription>
        </DialogHeader>
        <form id={id} className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); setTouched(true); if (valid) save.mutate(); }}>
          {!topUp && (
            <div role="radiogroup" aria-label="Direction" className="flex gap-2">
              {(["add", "remove"] as const).map(value => (
                <Button key={value} type="button" role="radio" aria-checked={direction === value} size="sm" variant={direction === value ? "secondary" : "outline"}
                  onClick={() => setDirection(value)}>{value === "add" ? "Add to balance" : "Take off balance"}</Button>
              ))}
            </div>
          )}
          <FieldShell id={`${id}-amount`} label="Amount (Rs)" error={touched && !paisa ? "Enter an amount." : undefined}>
            <Input id={`${id}-amount`} inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} />
          </FieldShell>
          <FieldShell id={`${id}-ref`} label={topUp ? "Bank / transfer reference" : "Reference (optional)"}
            error={touched && topUp && !reference.trim() ? "Enter the transfer reference." : undefined}>
            <Input id={`${id}-ref`} value={reference} maxLength={120} onChange={event => setReference(event.target.value)} />
          </FieldShell>
          {!topUp && (
            <FieldShell id={`${id}-reason`} label="Reason" error={touched && !reason.trim() ? "Say why, in plain words." : undefined}>
              <Input id={`${id}-reason`} value={reason} maxLength={500} onChange={event => setReason(event.target.value)} placeholder="For example: SooperFare portal shows Rs 120,500" />
            </FieldShell>
          )}
          <div className="grid grid-cols-2 gap-2">
            <FieldShell id={`${id}-date`} label={topUp ? "Paid on" : "As of"} error={touched && !at ? "Enter a date and time (24-hour)." : undefined}>
              <Input id={`${id}-date`} type="date" value={date} onChange={event => setDate(event.target.value)} />
            </FieldShell>
            <FieldShell id={`${id}-time`} label="Time"><Input id={`${id}-time`} value={time} onChange={event => setTime(event.target.value)} /></FieldShell>
          </div>
          {save.error && <Notice tone="critical">{save.error.message}</Notice>}
        </form>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form={id} variant="primary" disabled={save.isPending}>{save.isPending ? "Saving…" : topUp ? "Record top-up" : "Adjust balance"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ThresholdDialog({ wallet, onClose }: { wallet: SupplierWallet; onClose: () => void }) {
  const id = useId();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(wallet.threshold ? paisaToInput(wallet.threshold.amount_minor) : "");
  const [touched, setTouched] = useState(false);
  const paisa = amount.trim() ? rupeesToPaisa(amount) : null;
  const save = useMutation({
    mutationFn: () => setWalletThreshold(wallet.provider_id, paisa),
    onSuccess: () => { toast.success(paisa ? "Alert level saved." : "Alert removed."); void queryClient.invalidateQueries({ queryKey: ["finance"] }); onClose(); },
  });
  const invalid = !!amount.trim() && !paisa;
  return (
    <Dialog open onOpenChange={open => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{wallet.name} alert level</DialogTitle>
          <DialogDescription>Staff get one alert (Notifications and email) when the balance drops below this, and a warning on the booking's Issue panel.</DialogDescription>
        </DialogHeader>
        <form id={id} onSubmit={event => { event.preventDefault(); setTouched(true); if (!invalid) save.mutate(); }}>
          <FieldShell id={`${id}-amount`} label="Alert below (Rs). Leave empty for no alert." error={touched && invalid ? "Enter an amount in rupees." : undefined}>
            <Input id={`${id}-amount`} inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} />
          </FieldShell>
          {save.error && <Notice tone="critical" className="mt-3">{save.error.message}</Notice>}
        </form>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form={id} variant="primary" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const KIND_LABEL: Record<WalletHistoryItem["kind"], string> = { balance_check: "Balance check", top_up: "Top-up", adjustment: "Adjustment", ticket: "Ticket charge" };

function HistoryDialog({ wallet, onClose }: { wallet: SupplierWallet; onClose: () => void }) {
  const history = useQuery({ queryKey: ["finance", "wallet-history", wallet.provider_id], queryFn: ({ signal }) => fetchWalletHistory(wallet.provider_id, { signal }) });
  const items = history.data?.items ?? [];
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{wallet.name} history</DialogTitle>
          <DialogDescription>Balance checks, top-ups, adjustments and ticket charges, newest first.</DialogDescription>
        </DialogHeader>
        {history.isPending && <LoadingCards count={3} label="Loading history" itemClassName="h-10" />}
        {history.error && <Notice tone="critical">{history.error.message}</Notice>}
        {history.data && items.length === 0 && <EmptyState title="Nothing recorded yet." />}
        {items.length > 0 && (
          <ul className="flex flex-col gap-2 sm:hidden" aria-label={`${wallet.name} history`}>
            {items.map((item, index) => (
              <li key={index} className="flex flex-col gap-0.5 rounded-lg border p-3 text-body">
                <span className="flex justify-between gap-2">
                  <span className="font-medium">{KIND_LABEL[item.kind]}</span>
                  <span className="whitespace-nowrap font-semibold tabular-nums">{item.amount ? formatMoney(item.amount) : item.balance ? formatMoney(item.balance) : "—"}</span>
                </span>
                <span className="text-label tabular-nums text-muted-foreground">{formatDateTime(item.at)}</span>
                {(item.booking_reference || item.reference || item.reason) && (
                  <span className="break-words text-label text-muted-foreground">{[item.booking_reference, item.reference, item.reason].filter(Boolean).join(" · ")}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {items.length > 0 && (
          <div className={cn(TABLE.wrap, "hidden shadow-none sm:block")}>
            <table className={cn(TABLE.table, "min-w-[34rem]")}>
              <thead>
                <tr className={TABLE.headRow}>
                  {["When", "What", "Amount", "Balance", "Details"].map(column => <th key={column} scope="col" className={TABLE.th}>{column}</th>)}
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className={TABLE.row}>
                    <td className={cn(TABLE.td, "whitespace-nowrap tabular-nums")}>{formatDateTime(item.at)}</td>
                    <td className={TABLE.td}>{KIND_LABEL[item.kind]}</td>
                    <td className={cn(TABLE.td, "whitespace-nowrap tabular-nums")}>{item.amount ? formatMoney(item.amount) : "—"}</td>
                    <td className={cn(TABLE.td, "whitespace-nowrap tabular-nums")}>{item.balance ? formatMoney(item.balance) : "—"}</td>
                    <td className={cn(TABLE.td, "max-w-[14rem] truncate")} title={[item.booking_reference, item.reference, item.reason].filter(Boolean).join(" · ")}>
                      {item.booking_reference
                        ? <Link to={`/admin/bookings/${encodeURIComponent(item.booking_reference)}`} className="text-primary underline-offset-2 hover:underline">{item.booking_reference}</Link>
                        : null}
                      {[item.booking_reference ? "" : null, item.reference, item.reason].filter(Boolean).join(" · ") || (item.booking_reference ? "" : "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
