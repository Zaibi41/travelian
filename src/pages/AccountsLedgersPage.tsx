import { useId, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { uploadImage } from "@/lib/admin-uploads";
import { AlertCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Chip, EmptyState, LoadingCards, Notice } from "@/components/admin/ui/feedback";
import { FieldShell, Input } from "@/components/admin/ui/field";
import { LabeledSelect } from "@/components/admin/ui/LabeledSelect";
import { StatusBadge, Tag } from "@/components/admin/ui/StatusBadge";
import { TABLE, describedBy } from "@/components/admin/ui/classes";
import { NotAvailableNotice } from "@/components/admin/bookings/NotAvailable";
import { GatewayError } from "@/lib/gateway/client";
import {
  PAYMENT_METHODS, PAYMENT_METHOD_LABEL, activateReceivingAccount, addReceivingAccount, deactivateReceivingAccount, fetchReceivingAccounts, methodFromParam,
  type PaymentMethod, type ReceivingAccount,
} from "@/lib/finance/payment-accounts";
import { cn } from "@/lib/utils";

// Finance > Accounts & Ledgers (spec 5, "bank and cash book" tab). Only this tab is built; the
// others are shown disabled. Page header, tabs and card follow the Payments page. The gateway
// decides who may see and change receiving accounts (403 for other roles).

const TABS = ["Bank and cash book", "Chart of accounts", "Provider accounts", "General ledger", "Manual journals"];
const ACCOUNTS_KEY = ["finance", "payment-accounts"];
const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function AccountsLedgersPage() {
  const [params, setParams] = useSearchParams();
  const method = methodFromParam(params.get("method"));
  const [adding, setAdding] = useState<PaymentMethod | null>(null);
  const [deactivating, setDeactivating] = useState<ReceivingAccount | null>(null);
  const accounts = useQuery({ queryKey: ACCOUNTS_KEY, queryFn: ({ signal }) => fetchReceivingAccounts({ signal }) });
  const forbidden = accounts.error instanceof GatewayError && accounts.error.kind === "forbidden";
  const all = accounts.data?.accounts ?? [];
  const shown = method ? all.filter(account => account.method === method) : all;
  const setMethod = (next: PaymentMethod | null) => setParams(next ? { method: next } : {}, { replace: true });

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-page-title font-bold font-display">Accounts &amp; Ledgers</h1>

      <div role="tablist" aria-label="Accounts & Ledgers" className="-mx-1 flex gap-2 overflow-x-auto border-b px-1">
        {TABS.map((label, index) => index === 0 ? (
          <button key={label} type="button" role="tab" aria-selected="true"
            className="whitespace-nowrap border-b-2 border-primary px-4 py-2 text-body font-medium text-primary">
            {label}
          </button>
        ) : (
          <button key={label} type="button" role="tab" aria-selected="false" aria-disabled="true" disabled
            className="inline-flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-4 py-2 text-body font-medium text-muted-foreground">
            {label}<Tag>Not built</Tag>
          </button>
        ))}
      </div>

      {forbidden ? (
        <NotAvailableNotice title="Not available for your role">
          Receiving accounts are managed by Super Admin. A super admin can tell you who to ask.
        </NotAvailableNotice>
      ) : (
        <Card className="shadow-card">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 p-5">
            <CardTitle id="receiving-accounts">Receiving accounts</CardTitle>
            {accounts.data && (
              <Button variant="primary" onClick={() => setAdding(method ?? "bank_transfer")}>
                <Plus aria-hidden="true" /> Add account
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-5 pt-0">
            {accounts.isPending && <LoadingCards count={3} label="Loading receiving accounts" itemClassName="h-10" />}
            {accounts.error && !forbidden && (
              <Notice tone="critical">{accounts.error.message || "The receiving accounts couldn't be loaded. Try again in a moment."}</Notice>
            )}
            {accounts.data && (
              <>
                <div role="group" aria-label="Method" className="flex flex-wrap gap-2">
                  <Chip pressed={!method} onClick={() => setMethod(null)}>All <span className="tabular-nums">{all.length}</span></Chip>
                  {PAYMENT_METHODS.map(option => (
                    <Chip key={option.value} pressed={method === option.value} onClick={() => setMethod(option.value)}>
                      {option.label} <span className="tabular-nums">{all.filter(account => account.method === option.value).length}</span>
                    </Chip>
                  ))}
                </div>
                {shown.length === 0 ? (
                  method ? (
                    <EmptyState
                      title={`No ${PAYMENT_METHOD_LABEL[method]} account is set up yet.`}
                      action={<Button variant="primary" onClick={() => setAdding(method)}><Plus aria-hidden="true" /> Add {PAYMENT_METHOD_LABEL[method]} account</Button>}
                    >
                      Add the account where {PAYMENT_METHOD_LABEL[method]} payments arrive. Staff can then pick it as "Received into" on the Payments tab.
                    </EmptyState>
                  ) : (
                    <EmptyState title="No receiving account is set up yet." />
                  )
                ) : (
                  <>
                    <AccountsTable accounts={shown} onDeactivate={setDeactivating} />
                    <p className="text-label text-muted-foreground">
                      {count(shown.length, "account")}, {shown.filter(account => account.active).length} active
                    </p>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {adding && <AddAccountDialog initialMethod={adding} onClose={() => setAdding(null)} />}
      {deactivating && <DeactivateDialog account={deactivating} onClose={() => setDeactivating(null)} />}
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return active ? <StatusBadge severity="fine">Active</StatusBadge> : <Tag>Inactive</Tag>;
}

/** Table from 640px; below that each account is a card. */
function AccountsTable({ accounts, onDeactivate }: { accounts: ReceivingAccount[]; onDeactivate: (account: ReceivingAccount) => void }) {
  const queryClient = useQueryClient();
  const activate = useMutation({
    mutationFn: (account: ReceivingAccount) => activateReceivingAccount(account.id),
    onSuccess: account => {
      toast.success(`${account.label} is active again.`);
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings", "payment-accounts"] });
    },
    onError: error => toast.error(error.message),
  });
  // The Active toggle: Deactivate an active account, Activate an inactive one.
  const action = (account: ReceivingAccount) => account.active
    ? <Button variant="outline" size="sm" onClick={() => onDeactivate(account)} aria-label={`Deactivate ${account.label}`}>Deactivate</Button>
    : <Button variant="outline" size="sm" disabled={activate.isPending} onClick={() => activate.mutate(account)} aria-label={`Activate ${account.label}`}>Activate</Button>;
  const details = (account: ReceivingAccount) => [account.bank_name, account.account_title, account.account_number_masked].filter(Boolean).join(" · ");
  return (
    <>
      <div className={cn(TABLE.wrap, "hidden shadow-none sm:block")}>
        <table className={cn(TABLE.table, "table-fixed")} aria-labelledby="receiving-accounts">
          <thead>
            <tr className={TABLE.headRow}>
              <th scope="col" className={TABLE.th}>Account name</th>
              <th scope="col" className={cn(TABLE.th, "w-36")}>Method</th>
              <th scope="col" className={cn(TABLE.th, "w-28")}>Status</th>
              <th scope="col" className={cn(TABLE.th, "w-32")}><span className="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(account => (
              <tr key={account.id} className={TABLE.row}>
                <td className={cn(TABLE.td, "max-w-0")}>
                  <span className="flex min-w-0 items-center gap-2">
                    {account.qr_url && <img src={account.qr_url} alt={`QR code for ${account.label}`} className="h-8 w-8 shrink-0 rounded border object-contain" />}
                    <span className="min-w-0">
                      <span className="block truncate font-medium" title={account.label}>{account.label}</span>
                      {details(account) && <span className="block truncate text-label text-muted-foreground" title={details(account)}>{details(account)}</span>}
                    </span>
                  </span>
                </td>
                <td className={TABLE.td}><Tag tone="navy">{PAYMENT_METHOD_LABEL[account.method]}</Tag></td>
                <td className={TABLE.td}><StatusPill active={account.active} /></td>
                <td className={cn(TABLE.td, "text-right")}>{action(account)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-2 sm:hidden" aria-label="Receiving accounts">
        {accounts.map(account => (
          <li key={account.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <p className="truncate text-body font-medium" title={account.label}>{account.label}</p>
            {details(account) && <p className="truncate text-label text-muted-foreground">{details(account)}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone="navy">{PAYMENT_METHOD_LABEL[account.method]}</Tag>
              <StatusPill active={account.active} />
              <span className="ml-auto">{action(account)}</span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function AddAccountDialog({ initialMethod, onClose }: { initialMethod: PaymentMethod; onClose: () => void }) {
  const queryClient = useQueryClient();
  const nameId = useId();
  const [method, setMethod] = useState<PaymentMethod>(initialMethod);
  const [label, setLabel] = useState("");
  const [bank, setBank] = useState({ bank_name: "", account_title: "", account_number: "" });
  const [qr, setQr] = useState<{ key: string; url?: string | null } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const isBank = method === "bank_transfer";
  const pickQr = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await uploadImage("payment_qr", file);
      setQr({ key: uploaded.assetKey, url: uploaded.publicUrl });
    } catch (problem) {
      setUploadError(problem instanceof Error ? problem.message : "The image couldn't be uploaded.");
    } finally {
      setUploading(false);
    }
  };
  const save = useMutation({
    mutationFn: () => addReceivingAccount(method, label, isBank ? {
      bank_name: bank.bank_name || null, account_title: bank.account_title || null, account_number: bank.account_number || null,
      qr_asset_key: qr?.key ?? null,
    } : {}),
    onSuccess: account => {
      toast.success(`${account.label} added.`);
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings", "payment-accounts"] });
      onClose();
    },
  });
  const error = save.error?.message;
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add account</DialogTitle>
          <DialogDescription className="sr-only">Add a receiving account for customer payments.</DialogDescription>
        </DialogHeader>
        <form id={`${nameId}-form`} className="flex flex-col gap-4" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
          <LabeledSelect id={`${nameId}-method`} label="Method" value={method} options={PAYMENT_METHODS}
            onChange={value => { setMethod(value as PaymentMethod); save.reset(); }} />
          <FieldShell
            id={nameId}
            label="Account name"
            hint="2 to 120 characters. Staff see this name on the Payments tab and in the audit trail, so don't include the full account number."
            error={error && (
              <span className="inline-flex items-start gap-1.5 text-status-critical-text">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{error}
              </span>
            )}
          >
            <Input id={nameId} value={label} autoComplete="off" maxLength={200} aria-invalid={Boolean(error)}
              aria-describedby={describedBy(nameId, { hint: true, error })}
              onChange={event => { setLabel(event.target.value); if (save.isError) save.reset(); }} />
          </FieldShell>
          {isBank && (
            <>
              {/* Shown to customers who choose bank transfer at checkout (masked number and QR only). */}
              {([["bank_name", "Bank name", "e.g. Meezan Bank"], ["account_title", "Account title", "As the bank shows it"],
                 ["account_number", "Account number", "Only the last 4 digits are kept and shown (masked)."]] as const).map(([key, title, hint]) => (
                <FieldShell key={key} id={`${nameId}-${key}`} label={title} hint={hint}>
                  <Input id={`${nameId}-${key}`} value={bank[key]} autoComplete="off" maxLength={key === "account_number" ? 40 : 120}
                    onChange={event => setBank(current => ({ ...current, [key]: event.target.value }))} />
                </FieldShell>
              ))}
              <FieldShell id={`${nameId}-qr`} label="QR code image" hint="PNG, JPEG or WebP, up to 2 MB. Stored in S3; customers see it at checkout."
                error={uploadError && <span className="text-status-critical-text">{uploadError}</span>}>
                <div className="flex items-center gap-3">
                  <Input id={`${nameId}-qr`} type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading}
                    onChange={event => void pickQr(event.target.files?.[0])} />
                  {uploading && <span className="text-label text-muted-foreground">Uploading…</span>}
                  {qr?.url && <img src={qr.url} alt="QR code preview" className="h-12 w-12 rounded border object-contain" />}
                </div>
              </FieldShell>
            </>
          )}
        </form>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form={`${nameId}-form`} disabled={save.isPending || uploading}>
            {save.isPending ? "Saving…" : "Save account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeactivateDialog({ account, onClose }: { account: ReceivingAccount; onClose: () => void }) {
  const queryClient = useQueryClient();
  const deactivate = useMutation({
    mutationFn: () => deactivateReceivingAccount(account.id),
    onSuccess: () => {
      toast.success(`${account.label} deactivated.`);
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings", "payment-accounts"] });
      onClose();
    },
  });
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deactivate account?</DialogTitle>
          <DialogDescription className="sr-only">Confirm deactivating {account.label}.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 text-body">
          <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-border bg-muted/40 p-3">
            <p className="truncate font-semibold" title={account.label}>{account.label}</p>
            <span><Tag tone="navy">{PAYMENT_METHOD_LABEL[account.method]}</Tag></span>
          </div>
          <p>Staff will no longer be able to choose it as "Received into" for new payments.</p>
          <p className="text-muted-foreground">Payments already recorded keep this account. Accounts are never deleted.</p>
          {deactivate.error && <Notice tone="critical">{deactivate.error.message}</Notice>}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="danger" className="bg-status-critical-text hover:bg-status-critical-text/90" disabled={deactivate.isPending}
            onClick={() => deactivate.mutate()}>
            {deactivate.isPending ? "Deactivating…" : "Deactivate account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
