// Bank transfer / JazzCash details shown to customers (B3): Travelian's active account(s) from Accounts & Ledgers via the
// gateway (bank, title, full account number and IBAN, D40, and the QR image in S3), and the real hold countdown (D29: the
// supplier's expiry, never extended).
// Several accounts: selectable cards; the selected one shows its details, each with Copy, and a large QR (tap to
// enlarge, Download QR).
import { useEffect, useId, useState, type ReactNode } from "react";
import { Check, Clock, Copy, Download, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { publicGatewayUrl, type BankAccountDisplay } from "@/lib/public-booking";
import { cn } from "@/lib/utils";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Older browsers / no permission: select-and-copy through a hidden field.
      const field = document.createElement("textarea");
      field.value = value;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(true);
  };
  return (
    <button type="button" onClick={copy} aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
      className={cn("inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 sm:h-9 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        copied ? "border-success/40 bg-success/10 text-success" : "border-border bg-background text-primary hover:border-primary/40 hover:bg-primary/5")}>
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/** Download the QR image when the gateway gave no download link: the image is on another domain without CORS, so a
 *  blob download may be refused; then it opens in a new tab (save it from there). */
async function downloadQr(url: string, name: string) {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) throw new Error(String(response.status));
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${name}.${blob.type.includes("png") ? "png" : "jpg"}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 5000);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "account";

/** Download QR: a plain link to the gateway's download (Content-Disposition: attachment), so Chrome, Safari on iPhone and
 *  Android save the file without leaving checkout; the older in-page download only when there is no such link. */
function DownloadQr({ account, fileName, className }: { account: BankAccountDisplay & { qr_url: string }; fileName: string; className: string }) {
  const content = <><Download className="h-4 w-4" aria-hidden="true" /> Download QR</>;
  if (account.qr_download_url) {
    return <a href={publicGatewayUrl(account.qr_download_url)} download={fileName} className={className}>{content}</a>;
  }
  return <button type="button" onClick={() => downloadQr(account.qr_url, fileName)} className={className}>{content}</button>;
}

function QrCode({ account }: { account: BankAccountDisplay & { qr_url: string } }) {
  const [enlarged, setEnlarged] = useState(false);
  const who = account.account_title ?? account.bank_name ?? "Travelian";
  const fileName = `travelian-${slug(account.bank_name ?? "payment")}-qr`;
  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={() => setEnlarged(true)} aria-label="Enlarge QR code"
        className="flex flex-col items-center gap-1 rounded-xl border bg-white p-2 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <img src={account.qr_url} alt={`QR code to pay ${who}`} className="h-52 w-52 object-contain sm:h-56 sm:w-56" />
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Maximize2 className="h-3 w-3" aria-hidden="true" /> Tap to enlarge
        </span>
      </button>
      <DownloadQr account={account} fileName={fileName}
        className="inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      <Dialog open={enlarged} onOpenChange={setEnlarged}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scan to pay</DialogTitle>
            <DialogDescription>{[account.bank_name, account.account_title].filter(Boolean).join(" · ")}</DialogDescription>
          </DialogHeader>
          <img src={account.qr_url} alt={`QR code to pay ${who}, enlarged`} className="mx-auto w-full max-w-[26rem] rounded-lg border bg-white object-contain p-2" />
          <DownloadQr account={account} fileName={fileName}
            className="mx-auto inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** What to send and the note to put on it (#76): each with Copy. */
export interface TransferFacts { amount?: string | null; reference?: string | null }

function AccountDetails({ account, facts }: { account: BankAccountDisplay; facts?: TransferFacts }) {
  const rows: [string, string | null | undefined, boolean][] = [
    ["Bank name", account.bank_name, false],
    ["Account title", account.account_title, false],
    ["Account number", account.account_number, true],
    ["IBAN", account.iban, true],
    ["Amount to transfer", facts?.amount, false],
    ["Reference", facts?.reference, true],
  ];
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-3 sm:flex-row sm:items-start sm:p-4">
      <dl className="min-w-0 flex-1 divide-y">
        {rows.filter(([, value]) => value).map(([label, value, mono]) => (
          <div key={label} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
              <dd className={cn("text-sm font-semibold text-foreground", mono ? "break-all font-mono tracking-wide" : "break-words")}>{value}</dd>
            </div>
            <CopyButton value={value!} label={label} />
          </div>
        ))}
        <p className="pt-2 text-xs text-muted-foreground">
          {account.qr_url ? "Transfer to this account or scan the QR code." : "Transfer to this account."}{" "}
          {facts?.reference ? <strong className="font-semibold text-foreground">Put this reference in the transfer note.</strong> : "Use your booking reference as the payment reference."}
        </p>
      </dl>
      {account.qr_url && <QrCode account={account as BankAccountDisplay & { qr_url: string }} />}
    </div>
  );
}

const last4 = (value?: string | null) => (value ? value.replace(/\s/g, "").slice(-4) : null);
const accountName = (account: BankAccountDisplay, index: number) => account.bank_name ?? account.account_title ?? `Account ${index + 1}`;

/** "Habib Bank Limited (HBL)" -> "HBL", "Meezan Bank" -> "MB": the bank's own acronym when its name carries one. */
export function bankInitials(name: string) {
  const acronym = name.match(/\b[A-Z]{2,5}\b/g)?.at(-1);
  if (acronym) return acronym;
  const words = name.replace(/[^A-Za-z\s]/g, " ").split(/\s+/).filter(word => word && !/^(limited|ltd|pvt|of|the)$/i.test(word));
  return words.slice(0, 2).map(word => word[0].toUpperCase()).join("") || "?";
}

/** The bank's mark on its card: the logo staff uploaded for this account (#76, Accounts & Ledgers), else its initials
 *  (never a made-up logo). The name is written beside it, so the mark itself is decorative. */
export function BankMark({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  const [broken, setBroken] = useState(false);
  if (logoUrl && !broken) {
    return (
      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white p-0.5">
        <img src={logoUrl} alt="" className="h-full w-full object-contain" onError={() => setBroken(true)} />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-white text-xs font-bold tracking-wide text-primary">
      {bankInitials(name)}
    </span>
  );
}

/** More than this many accounts: a dropdown instead of cards (#76). */
export const MAX_ACCOUNT_CARDS = 6;

export function BankAccounts({ accounts, facts, selectedId, onChoose, children }: {
  accounts: BankAccountDisplay[];
  /** Amount to transfer and the booking reference, shown with Copy. */
  facts?: TransferFacts;
  /** The account already chosen (from the booking). */
  selectedId?: string | null;
  /** Called when the customer picks an account (the booking remembers it, #76). */
  onChoose?: (account: BankAccountDisplay) => void;
  /** Shown right below the selected account's details (the slip upload); a function gets the selected account. */
  children?: ReactNode | ((account: BankAccountDisplay) => ReactNode);
}) {
  const initial = Math.max(0, accounts.findIndex(account => selectedId && account.id === selectedId));
  const [selected, setSelected] = useState(initial);
  const name = useId();
  const selectId = useId();
  if (!accounts.length) return null;
  const current = accounts[Math.min(selected, accounts.length - 1)];
  const choose = (index: number) => { setSelected(index); onChoose?.(accounts[index]); };
  const label = (account: BankAccountDisplay, index: number) =>
    [accountName(account, index), last4(account.account_number ?? account.iban) && `ending ${last4(account.account_number ?? account.iban)}`].filter(Boolean).join(", ");
  return (
    <div className="space-y-3">
      {accounts.length > 1 && (accounts.length > MAX_ACCOUNT_CARDS ? (
        <div className="space-y-1.5">
          <label htmlFor={selectId} className="block text-sm font-semibold text-foreground">Choose the account to pay into</label>
          <p className="text-xs text-muted-foreground">Same bank: faster transfer.</p>
          <select id={selectId} value={Math.min(selected, accounts.length - 1)} onChange={event => choose(Number(event.target.value))}
            className="h-11 w-full rounded-xl border bg-card px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {accounts.map((account, index) => <option key={account.id ?? index} value={index}>{label(account, index)}</option>)}
          </select>
        </div>
      ) : (
        <fieldset>
          <legend className="text-sm font-semibold text-foreground">Choose the account to pay into</legend>
          <p className="mb-2 text-xs text-muted-foreground">Same bank: faster transfer.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {accounts.map((account, index) => {
              const checked = index === selected;
              return (
                <label key={account.id ?? index} className={cn("flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors focus-within:ring-2 focus-within:ring-ring",
                  checked ? "border-primary bg-primary/5" : "hover:border-primary/40")}>
                  <input type="radio" name={name} className="sr-only" checked={checked} onChange={() => choose(index)} />
                  <BankMark name={accountName(account, index)} logoUrl={account.logo_url} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground" title={accountName(account, index)}>{accountName(account, index)}</span>
                    {last4(account.account_number ?? account.iban) && (
                      <span className="block truncate text-xs text-muted-foreground">Account ending {last4(account.account_number ?? account.iban)}</span>
                    )}
                  </span>
                  <span aria-hidden="true" className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2", checked ? "border-primary" : "border-muted-foreground")}>
                    {checked && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <AccountDetails account={current} facts={facts} />
      {typeof children === "function" ? children(current) : children}
    </div>
  );
}

export function HoldCountdown({ until }: { until: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const left = Math.max(0, new Date(until).getTime() - now);
  if (left === 0) {
    return <p className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive"><Clock className="h-4 w-4" /> The hold has ended. Please search again to book.</p>;
  }
  const h = Math.floor(left / 3_600_000), m = Math.floor((left % 3_600_000) / 60_000), s = Math.floor((left % 60_000) / 1000);
  return (
    <p className="flex flex-wrap items-center gap-2 rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">
      <Clock className="h-4 w-4" />
      <span className="font-semibold tabular-nums">{h}h {String(m).padStart(2, "0")}m {String(s).padStart(2, "0")}s left to pay</span>
      <span className="text-muted-foreground">(hold ends {new Date(until).toLocaleString()})</span>
    </p>
  );
}
