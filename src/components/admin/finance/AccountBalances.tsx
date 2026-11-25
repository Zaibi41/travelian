import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { EmptyState, LoadingCards, Notice } from "@/components/admin/ui/feedback";
import { FieldShell, Input } from "@/components/admin/ui/field";
import { Tag } from "@/components/admin/ui/StatusBadge";
import { TABLE } from "@/components/admin/ui/classes";
import { isForbidden, moneyOrDash } from "@/components/admin/finance/FinanceShared";
import { paisaToInput, rupeesToPaisa } from "@/lib/admin-bookings/payments";
import { fetchFinanceAccounts, updateFinanceAccount, type FinanceAccount } from "@/lib/finance/ops-api";
import { cn } from "@/lib/utils";

// Accounts & Ledgers: each account's balance, split Business / Personal (D54). Sales received are fed automatically from
// bank-transfer booking payments and Ticket Sale Entries; personal accounts are never in the company totals.
const KEY = ["finance", "account-balances"];

export function AccountBalances() {
  const accounts = useQuery({ queryKey: KEY, queryFn: ({ signal }) => fetchFinanceAccounts({ signal }) });
  const [editing, setEditing] = useState<FinanceAccount | null>(null);
  if (isForbidden(accounts.error)) return null; // the Receiving accounts card below says who may see this
  return (
    <Card className="shadow-card">
      <CardHeader className="space-y-1 p-5">
        <CardTitle id="account-balances">Account balances</CardTitle>
        <p className="text-label text-muted-foreground">Opening balance + sales received − supplier top-ups paid from the account. Personal accounts aren't in the company totals.</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 p-5 pt-0">
        {accounts.isPending && <LoadingCards count={2} label="Loading account balances" itemClassName="h-10" />}
        {accounts.error && <Notice tone="critical">{accounts.error.message}</Notice>}
        {accounts.data && (
          <>
            <Section title="Business" total={moneyOrDash(accounts.data.business_total)} totalLabel="Company total" rows={accounts.data.business} onEdit={setEditing} />
            <Section title="Personal" total={moneyOrDash(accounts.data.personal_total)} totalLabel="Personal total (not in company totals)" rows={accounts.data.personal} onEdit={setEditing} />
          </>
        )}
      </CardContent>
      {editing && <EditBalanceDialog account={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function Section({ title, total, totalLabel, rows, onEdit }: { title: string; total: string; totalLabel: string; rows: FinanceAccount[]; onEdit: (account: FinanceAccount) => void }) {
  const headingId = `accounts-${title.toLowerCase()}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={headingId} className="text-body font-semibold">{title}</h3>
        <span className="text-label text-muted-foreground">{totalLabel}: <span className="font-semibold text-foreground tabular-nums">{total}</span></span>
      </div>
      {rows.length === 0 ? <EmptyState title={`No ${title.toLowerCase()} account.`} className="py-4">{title === "Personal" ? "Mark an account as personal to keep it out of the company totals." : undefined}</EmptyState> : (
        <div className={cn(TABLE.wrap, "relative shadow-none")}>
          <table className={cn(TABLE.table, "min-w-[52rem]")}>
            <thead>
              <tr className={TABLE.headRow}>
                {["Account", "Account / IBAN", "Opening balance", "Sales received", "Top-ups paid", "Current balance", ""].map(column => (
                  <th key={column || "actions"} scope="col" className={cn(TABLE.th, ["Opening balance", "Sales received", "Top-ups paid", "Current balance"].includes(column) && "text-right")}>
                    {column || <span className="sr-only">Actions</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(account => (
                <tr key={account.id} className={cn(TABLE.row, !account.active && "text-muted-foreground")}>
                  <td className={cn(TABLE.td, "max-w-[14rem]")}>
                    <span className="block truncate font-medium" title={account.label}>{account.label}</span>
                    {!account.active && <Tag>Inactive</Tag>}
                  </td>
                  <td className={cn(TABLE.td, "max-w-[14rem] truncate tabular-nums")} title={account.iban ?? account.account_number ?? undefined}>{account.iban ?? account.account_number ?? "—"}</td>
                  <td className={cn(TABLE.td, "whitespace-nowrap text-right tabular-nums")}>{moneyOrDash(account.opening_balance)}</td>
                  <td className={cn(TABLE.td, "whitespace-nowrap text-right tabular-nums")}>{moneyOrDash(account.sales_received)}</td>
                  <td className={cn(TABLE.td, "whitespace-nowrap text-right tabular-nums")}>{moneyOrDash(account.top_ups_paid)}</td>
                  <td className={cn(TABLE.td, "whitespace-nowrap text-right font-semibold tabular-nums")}>{moneyOrDash(account.current_balance)}</td>
                  <td className={cn(TABLE.td, "text-right")}><Button size="sm" variant="outline" onClick={() => onEdit(account)} aria-label={`Edit ${account.label} balance`}>Edit</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function EditBalanceDialog({ account, onClose }: { account: FinanceAccount; onClose: () => void }) {
  const id = useId();
  const queryClient = useQueryClient();
  const [ownership, setOwnership] = useState(account.ownership);
  const [opening, setOpening] = useState(paisaToInput(account.opening_balance.amount_minor));
  const openingPaisa = opening.trim() ? (opening.trim() === "0" ? 0 : rupeesToPaisa(opening)) : 0;
  const save = useMutation({
    mutationFn: () => updateFinanceAccount(account.id, { ownership, opening_balance_minor: openingPaisa }),
    onSuccess: () => { toast.success(`${account.label} saved.`); void queryClient.invalidateQueries({ queryKey: ["finance"] }); onClose(); },
  });
  return (
    <Dialog open onOpenChange={open => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account.label}</DialogTitle>
          <DialogDescription>Whose account it is, and the balance it held when Travelian started tracking it here.</DialogDescription>
        </DialogHeader>
        <form id={id} className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); if (openingPaisa !== null) save.mutate(); }}>
          <div role="radiogroup" aria-label="Account type" className="flex gap-2">
            {(["business", "personal"] as const).map(value => (
              <Button key={value} type="button" role="radio" aria-checked={ownership === value} size="sm" variant={ownership === value ? "secondary" : "outline"}
                onClick={() => setOwnership(value)}>{value === "business" ? "Business" : "Personal"}</Button>
            ))}
          </div>
          <FieldShell id={`${id}-opening`} label="Opening balance (Rs)" error={openingPaisa === null ? "Enter an amount in rupees." : undefined}>
            <Input id={`${id}-opening`} inputMode="decimal" value={opening} onChange={event => setOpening(event.target.value)} />
          </FieldShell>
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
