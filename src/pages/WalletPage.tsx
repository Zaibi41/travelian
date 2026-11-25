import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookText, Plus, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { EmptyState, LoadingCards, Notice, Panel } from "@/components/admin/ui/feedback";
import { FieldShell, Input } from "@/components/admin/ui/field";
import { LabeledSelect } from "@/components/admin/ui/LabeledSelect";
import { StatusBadge, Tag } from "@/components/admin/ui/StatusBadge";
import { TABLE } from "@/components/admin/ui/classes";
import { StatusKpiCard } from "@/components/admin/StatusKpiCard";
import { FinanceNotBuilt } from "@/components/admin/finance/FinanceNotBuilt";
import { Fact, FinanceForbidden, FinancePageHeader, SideDrawer, isForbidden, moneyOrDash } from "@/components/admin/finance/FinanceShared";
import { useRole } from "@/contexts/RoleContext";
import { formatDateTime } from "@/lib/admin-bookings/format";
import { paisaToInput, receivedAtIso, rupeesToPaisa } from "@/lib/admin-bookings/payments";
import { pktDay } from "@/lib/finance/date-range";
import {
  addAgencyWalletEntry, fetchAgencyWalletStatement, fetchAgencyWallets, fetchSaleOptions, roleName, setAgencyWalletLow, type AgencyWallet,
} from "@/lib/finance/ops-api";
import { cn } from "@/lib/utils";

// Finance > Wallets (issue 224, decision D3): each B2B agency's prepaid wallet. B2C customers have no wallet (they pay per
// booking). Supplier balances (South Air, Sooperfare, airline IDs, portals, hotels) are on Supplier Balances. The gateway
// works out every balance and keeps a wallet from going below zero.
const KEY = ["finance", "agency-wallets"];
const AGENCY_ROLES = ["agency_owner", "agency_staff", "customer"];

export default function WalletPage() {
  const { currentRole } = useRole();
  if (AGENCY_ROLES.includes(currentRole)) return <FinanceNotBuilt title="Wallets" />; // the agency's own wallet view: not built yet
  return <AgencyWallets />;
}

type Action = { wallet: AgencyWallet; kind: "deposit" | "adjustment" | "low" };

function AgencyWallets() {
  const wallets = useQuery({ queryKey: KEY, queryFn: ({ signal }) => fetchAgencyWallets({ signal }) });
  const [action, setAction] = useState<Action | null>(null);
  const [statementFor, setStatementFor] = useState<AgencyWallet | null>(null);
  const items = wallets.data?.wallets ?? [];
  return (
    <div className="min-w-0 space-y-6 animate-fade-in">
      <FinancePageHeader title="Wallets"
        description="Each B2B agency's prepaid wallet: deposits they've paid in and corrections. Customers don't have wallets; supplier balances are on Supplier Balances." />
      {isForbidden(wallets.error) ? <FinanceForbidden>Agency wallets need the Finance permission. A super admin can grant it.</FinanceForbidden> : (
        <>
          {wallets.isPending && <LoadingCards count={3} label="Loading agency wallets" className="grid grid-cols-2 gap-card-gap lg:grid-cols-3" itemClassName="h-24" />}
          {wallets.error && <Notice tone="critical">{wallets.error.message}</Notice>}
          {wallets.data && (
            <div className="grid grid-cols-2 gap-card-gap lg:grid-cols-3">
              <StatusKpiCard size="sm" label="Held for agencies" value={moneyOrDash(wallets.data.total_balance)} hint="Total of all agency wallets" />
              <StatusKpiCard size="sm" label="Agencies" value={String(items.length)} />
              <StatusKpiCard size="sm" label="Low balance" value={String(wallets.data.low_count)} severity={wallets.data.low_count ? "action" : "fine"} />
            </div>
          )}
          {wallets.data && items.length === 0 && (
            <EmptyState title="No B2B agencies yet.">
              Agencies are added under <Link to="/admin/agencies" className="font-medium text-primary underline-offset-2 hover:underline">B2B Partners</Link>; each gets a wallet.
            </EmptyState>
          )}
          {items.length > 0 && (
            <>
              <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:hidden" aria-label="Agency wallets">
                {items.map(wallet => (
                  <li key={wallet.agency_id}>
                    <Panel className={cn("flex flex-col gap-3", wallet.low && "border-l-4 border-l-status-action")}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0 truncate font-semibold" title={wallet.agency_name}>{wallet.agency_name}</span>
                        <WalletStatus wallet={wallet} />
                      </div>
                      <dl className="grid grid-cols-2 gap-2">
                        <Fact label="Balance"><span className="text-section">{moneyOrDash(wallet.balance)}</span></Fact>
                        <Fact label="Last deposit">{wallet.last_deposit_at ? formatDateTime(wallet.last_deposit_at) : "—"}</Fact>
                      </dl>
                      <Actions wallet={wallet} onAction={kind => setAction({ wallet, kind })} onStatement={() => setStatementFor(wallet)} />
                    </Panel>
                  </li>
                ))}
              </ul>
              <div className={cn(TABLE.wrap, "relative hidden md:block")}>
                <table className={cn(TABLE.table, "min-w-[46rem]")}>
                  <thead>
                    <tr className={TABLE.headRow}>
                      {["Agency", "Balance", "Low below", "Total deposited", "Last deposit", "Status", ""].map(column => (
                        <th key={column || "actions"} scope="col" className={cn(TABLE.th, ["Balance", "Low below", "Total deposited"].includes(column) && "text-right")}>
                          {column || <span className="sr-only">Actions</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(wallet => (
                      <tr key={wallet.agency_id} className={TABLE.row}>
                        <td className={TABLE.td}><span className="block max-w-[16rem] truncate font-semibold" title={wallet.agency_name}>{wallet.agency_name}</span></td>
                        <td className={cn(TABLE.td, "whitespace-nowrap text-right font-semibold tabular-nums")}>{moneyOrDash(wallet.balance)}</td>
                        <td className={cn(TABLE.td, "whitespace-nowrap text-right tabular-nums")}>{moneyOrDash(wallet.low_threshold)}</td>
                        <td className={cn(TABLE.td, "whitespace-nowrap text-right tabular-nums")}>{moneyOrDash(wallet.deposits)}</td>
                        <td className={cn(TABLE.td, "tabular-nums text-muted-foreground")}>{wallet.last_deposit_at ? formatDateTime(wallet.last_deposit_at) : "—"}</td>
                        <td className={TABLE.td}><WalletStatus wallet={wallet} /></td>
                        <td className={cn(TABLE.td, "text-right")}>
                          <Actions wallet={wallet} onAction={kind => setAction({ wallet, kind })} onStatement={() => setStatementFor(wallet)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
      {action && (action.kind === "low"
        ? <LowDialog wallet={action.wallet} onClose={() => setAction(null)} />
        : <EntryDialog wallet={action.wallet} kind={action.kind} onClose={() => setAction(null)} />)}
      {statementFor && <StatementDrawer wallet={statementFor} onClose={() => setStatementFor(null)} />}
    </div>
  );
}

function WalletStatus({ wallet }: { wallet: AgencyWallet }) {
  if (wallet.agency_status !== "active") return <Tag>Suspended</Tag>;
  if (wallet.low === true) return <StatusBadge severity="action">Low</StatusBadge>;
  if (wallet.low === false) return <StatusBadge severity="fine">OK</StatusBadge>;
  return <Tag>No low level</Tag>;
}

function Actions({ wallet, onAction, onStatement }: { wallet: AgencyWallet; onAction: (kind: Action["kind"]) => void; onStatement: () => void }) {
  return (
    <span className="flex flex-wrap justify-end gap-1 xl:flex-nowrap">
      <Button size="sm" variant="primary" onClick={() => onAction("deposit")} aria-label={`Record deposit for ${wallet.agency_name}`}><Plus aria-hidden="true" /> Deposit</Button>
      <Button size="sm" variant="outline" onClick={() => onAction("adjustment")} aria-label={`Adjust ${wallet.agency_name} wallet`}>Adjust</Button>
      <Button size="sm" variant="outline" onClick={() => onAction("low")} aria-label={`${wallet.agency_name} low-balance level`}><SlidersHorizontal aria-hidden="true" /></Button>
      <Button size="sm" variant="ghost" onClick={onStatement} aria-label={`${wallet.agency_name} statement`}><BookText aria-hidden="true" /> Statement</Button>
    </span>
  );
}

function EntryDialog({ wallet, kind, onClose }: { wallet: AgencyWallet; kind: "deposit" | "adjustment"; onClose: () => void }) {
  const id = useId();
  const queryClient = useQueryClient();
  const options = useQuery({ queryKey: ["finance", "sale-options"], queryFn: ({ signal }) => fetchSaleOptions({ signal }), enabled: kind === "deposit" });
  const deposit = kind === "deposit";
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [account, setAccount] = useState("none");
  const [date, setDate] = useState(pktDay(new Date()));
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [touched, setTouched] = useState(false);
  const paisa = rupeesToPaisa(amount);
  const at = receivedAtIso(date, time);
  const problem = !paisa ? "Enter an amount." : !at ? "Enter a date and time (24-hour)."
    : deposit && account === "none" ? "Choose the account the money arrived in." : deposit && !reference.trim() ? "Enter the transfer reference."
    : !deposit && !reason.trim() ? "Say why, in plain words." : null;
  const save = useMutation({
    mutationFn: () => addAgencyWalletEntry(wallet.agency_id, {
      kind, amount_minor: !deposit && direction === "remove" ? -paisa! : paisa!, reference: reference.trim() || null, reason: reason.trim() || null,
      occurred_at: at!, account_id: deposit ? account : null,
    }),
    onSuccess: updated => {
      toast.success(`${deposit ? "Deposit recorded" : "Wallet adjusted"}. ${wallet.agency_name}: ${moneyOrDash(updated.balance)}.`);
      void queryClient.invalidateQueries({ queryKey: ["finance"] });
      onClose();
    },
  });
  return (
    <Dialog open onOpenChange={open => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{deposit ? "Record deposit" : "Adjust wallet"}: {wallet.agency_name}</DialogTitle>
          <DialogDescription>
            {deposit ? "Money the agency already paid into a Travelian account. This records it; it moves no money."
              : "Correct the wallet. It can't go below zero. The reason is kept in the audit log."}
          </DialogDescription>
        </DialogHeader>
        <form id={id} className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); setTouched(true); if (!problem) save.mutate(); }}>
          {!deposit && (
            <div role="radiogroup" aria-label="Direction" className="flex gap-2">
              {(["add", "remove"] as const).map(value => (
                <Button key={value} type="button" role="radio" aria-checked={direction === value} size="sm" variant={direction === value ? "secondary" : "outline"}
                  onClick={() => setDirection(value)}>{value === "add" ? "Add to wallet" : "Take off wallet"}</Button>
              ))}
            </div>
          )}
          <FieldShell id={`${id}-amount`} label="Amount (Rs)"><Input id={`${id}-amount`} inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} /></FieldShell>
          {deposit && (
            <LabeledSelect id={`${id}-account`} label="Received into" value={account} onChange={setAccount}
              options={[{ value: "none", label: "Choose the account" }, ...(options.data?.accounts ?? []).map(option => ({ value: option.id, label: option.detail === "personal" ? `${option.name} (personal)` : option.name }))]} />
          )}
          <FieldShell id={`${id}-ref`} label={deposit ? "Transfer reference" : "Reference (optional)"}><Input id={`${id}-ref`} value={reference} maxLength={120} onChange={event => setReference(event.target.value)} /></FieldShell>
          {!deposit && <FieldShell id={`${id}-reason`} label="Reason"><Input id={`${id}-reason`} value={reason} maxLength={500} onChange={event => setReason(event.target.value)} /></FieldShell>}
          <div className="grid grid-cols-2 gap-2">
            <FieldShell id={`${id}-date`} label={deposit ? "Received on" : "As of"}><Input id={`${id}-date`} type="date" value={date} onChange={event => setDate(event.target.value)} /></FieldShell>
            <FieldShell id={`${id}-time`} label="Time"><Input id={`${id}-time`} value={time} onChange={event => setTime(event.target.value)} /></FieldShell>
          </div>
          {touched && problem && <Notice tone="critical">{problem}</Notice>}
          {save.error && <Notice tone="critical">{save.error.message}</Notice>}
        </form>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form={id} variant="primary" disabled={save.isPending}>{save.isPending ? "Saving…" : deposit ? "Record deposit" : "Adjust wallet"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LowDialog({ wallet, onClose }: { wallet: AgencyWallet; onClose: () => void }) {
  const id = useId();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(wallet.low_threshold ? paisaToInput(wallet.low_threshold.amount_minor) : "");
  const paisa = amount.trim() ? rupeesToPaisa(amount) : null;
  const invalid = !!amount.trim() && !paisa;
  const save = useMutation({
    mutationFn: () => setAgencyWalletLow(wallet.agency_id, paisa),
    onSuccess: () => { toast.success("Low-balance level saved."); void queryClient.invalidateQueries({ queryKey: ["finance"] }); onClose(); },
  });
  return (
    <Dialog open onOpenChange={open => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{wallet.agency_name}: low-balance level</DialogTitle>
          <DialogDescription>The wallet shows Low below this amount. Leave empty for none.</DialogDescription>
        </DialogHeader>
        <form id={id} onSubmit={event => { event.preventDefault(); if (!invalid) save.mutate(); }}>
          <FieldShell id={`${id}-amount`} label="Low below (Rs)" error={invalid ? "Enter an amount in rupees." : undefined}>
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

function StatementDrawer({ wallet, onClose }: { wallet: AgencyWallet; onClose: () => void }) {
  const statement = useQuery({ queryKey: ["finance", "agency-wallet", wallet.agency_id], queryFn: ({ signal }) => fetchAgencyWalletStatement(wallet.agency_id, { signal }) });
  const entries = [...(statement.data?.entries ?? [])].reverse();
  return (
    <SideDrawer open onClose={onClose} title={`${wallet.agency_name} wallet`} description="Every deposit and correction, newest first.">
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-3">
          <Fact label="Balance">{moneyOrDash(statement.data?.wallet.balance ?? wallet.balance)}</Fact>
          <Fact label="Total deposited">{moneyOrDash(statement.data?.wallet.deposits ?? wallet.deposits)}</Fact>
        </dl>
        {statement.isPending && <LoadingCards count={3} label="Loading statement" itemClassName="h-10" />}
        {statement.error && <Notice tone="critical">{statement.error.message}</Notice>}
        {statement.data && entries.length === 0 && <EmptyState title="Nothing recorded yet.">Record the agency's first deposit.</EmptyState>}
        {entries.length > 0 && (
          <ol className="flex flex-col divide-y divide-border rounded-xl border border-border" aria-label={`${wallet.agency_name} statement`}>
            {entries.map((entry, index) => (
              <li key={index} className="flex flex-col gap-1 px-3 py-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <Tag>{entry.kind === "deposit" ? "Deposit" : "Adjustment"}</Tag>
                    <span className="min-w-0 truncate text-body" title={entry.reason ?? entry.reference ?? undefined}>{entry.reason ?? entry.reference ?? ""}</span>
                  </span>
                  <span className={cn("whitespace-nowrap font-semibold tabular-nums", entry.amount.amount_minor < 0 && "text-status-critical-text")}>
                    {entry.amount.amount_minor > 0 ? "+" : ""}{moneyOrDash(entry.amount)}
                  </span>
                </div>
                <div className="flex flex-wrap justify-between gap-x-3 text-label text-muted-foreground">
                  <span>{formatDateTime(entry.at)} · {roleName(entry.by_role)}{entry.account ? ` · into ${entry.account}` : ""}{entry.kind === "adjustment" && entry.reference ? ` · ${entry.reference}` : ""}</span>
                  <span className="tabular-nums">Balance {moneyOrDash(entry.balance_after)}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </SideDrawer>
  );
}
