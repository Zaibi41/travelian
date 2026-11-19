// Bank transfer details shown to customers (B3): Travelian's active account(s) from Accounts & Ledgers via the gateway
// (bank, title, full account number and IBAN, D40, and the QR image in S3), and the real hold countdown (D29: the
// supplier's expiry, never extended).
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import type { BankAccountDisplay } from "@/lib/public-booking";

export function BankAccounts({ accounts }: { accounts: BankAccountDisplay[] }) {
  return (
    <ul className="space-y-3">
      {accounts.map((account, index) => (
        <li key={index} className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-3">
          {account.qr_url && <img src={account.qr_url} alt={`QR code to pay ${account.account_title ?? "Travelian"}`} className="h-28 w-28 rounded-lg border object-contain" />}
          <dl className="min-w-0 space-y-1 text-sm">
            {account.bank_name && <div><dt className="inline text-muted-foreground">Bank: </dt><dd className="inline font-semibold text-foreground">{account.bank_name}</dd></div>}
            {account.account_title && <div><dt className="inline text-muted-foreground">Account title: </dt><dd className="inline font-semibold text-foreground">{account.account_title}</dd></div>}
            {account.account_number && <div><dt className="inline text-muted-foreground">Account number: </dt><dd className="inline break-all font-mono font-semibold text-foreground">{account.account_number}</dd></div>}
            {account.iban && <div><dt className="inline text-muted-foreground">IBAN: </dt><dd className="inline break-all font-mono font-semibold text-foreground">{account.iban}</dd></div>}
            <p className="text-xs text-muted-foreground">{account.qr_url ? "Transfer to this account or scan the QR code." : "Transfer to this account."} Use your booking reference as the payment reference.</p>
          </dl>
        </li>
      ))}
    </ul>
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
