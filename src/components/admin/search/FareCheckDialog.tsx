import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatMoney } from "@/lib/admin-bookings/format";
import { travelerCount, type FareCheckState } from "@/lib/admin-search/hold";

interface FareCheckDialogProps {
  state: FareCheckState | null;
  onCancel: () => void;
  onBack: () => void;
  onContinue: () => void;
  onSearchAgain: () => void;
  onTryAgain: () => void;
  onEditSearch: () => void;
}

// Fare check (mockup flights-fare-check): checking, price changed, no longer available,
// couldn't confirm, adults only. Prices and messages are the gateway's; nothing continues on
// a price change without "Continue at new price".
export function FareCheckDialog({ state, onCancel, onBack, onContinue, onSearchAgain, onTryAgain, onEditSearch }: FareCheckDialogProps) {
  if (!state) return null;
  const close = state.kind === "checking" ? onCancel : onBack;
  return (
    <Dialog open onOpenChange={open => { if (!open) close(); }}>
      <DialogContent className="flex max-h-[85vh] w-[calc(100%-2rem)] max-w-md flex-col gap-3 overflow-y-auto" aria-busy={state.kind === "checking"}>
        {state.kind === "checking" && (
          <>
            <DialogHeader>
              <Loader2 className="h-6 w-6 animate-spin text-teal motion-reduce:animate-none" aria-hidden="true" />
              <DialogTitle className="text-section">Checking the latest fare…</DialogTitle>
              <DialogDescription className="text-body">This takes a few seconds. Nothing is booked yet.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2" aria-hidden="true">
              <Skeleton className="h-2.5 w-full rounded-full" />
              <Skeleton className="h-2.5 w-2/3 rounded-full" />
              <Skeleton className="h-2.5 w-2/5 rounded-full" />
            </div>
            <DialogFooter><Button type="button" variant="outline" className="h-control text-body" onClick={onCancel}>Cancel</Button></DialogFooter>
          </>
        )}
        {state.kind === "changed" && <PriceChanged state={state} onContinue={onContinue} onBack={onBack} />}
        {state.kind === "gone" && (
          <Problem title="This fare is no longer available" message={state.message}
            primary={<Button type="button" className="h-control bg-teal text-body text-teal-foreground hover:bg-teal/90" onClick={onSearchAgain}>Search again</Button>}
            onBack={onBack} />
        )}
        {state.kind === "unconfirmed" && (
          <Problem title="We couldn't confirm this fare" message={state.message}
            primary={<Button type="button" className="h-control bg-teal text-body text-teal-foreground hover:bg-teal/90" onClick={onTryAgain}>Try again</Button>}
            onBack={onBack} />
        )}
        {state.kind === "adults_only" && (
          <Problem title="Child and infant fares can't be confirmed yet" message={state.message}
            primary={<Button type="button" className="h-control bg-teal text-body text-teal-foreground hover:bg-teal/90" onClick={onEditSearch}>Edit search</Button>}
            onBack={onBack} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Problem({ title, message, primary, onBack }: { title: string; message: string; primary: React.ReactNode; onBack: () => void }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-section">{title}</DialogTitle>
        <DialogDescription className="text-body">{message}</DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2 sm:justify-start">
        {primary}
        <Button type="button" variant="outline" className="h-control text-body" onClick={onBack}>Back to results</Button>
      </DialogFooter>
    </>
  );
}

function PriceChanged({ state, onContinue, onBack }: { state: Extract<FareCheckState, { kind: "changed" }>; onContinue: () => void; onBack: () => void }) {
  const { quote } = state;
  const difference = quote.price_difference_per_adult;
  const up = difference ? difference.amount_minor > 0 : false;
  const count = travelerCount(quote);
  const rows: [string, React.ReactNode][] = [];
  if (quote.old_price_per_adult) rows.push(["Price shown in search (per adult)", formatMoney(quote.old_price_per_adult)]);
  if (quote.new_price_per_adult) {
    rows.push(["Price now (per adult)", (
      <span className="flex flex-col items-end gap-1">
        <span>{formatMoney(quote.new_price_per_adult)}</span>
        {difference && difference.amount_minor !== 0 && (
          <StatusBadge severity={up ? "action" : "fine"}>
            {up ? "Up" : "Down"} {formatMoney({ ...difference, amount_minor: Math.abs(difference.amount_minor) })}
          </StatusBadge>
        )}
      </span>
    )]);
  }
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-section">The fare price has changed</DialogTitle>
        <DialogDescription className="text-body">Tell the customer before continuing. Nothing has been booked.</DialogDescription>
      </DialogHeader>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] text-body">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="border-t border-border py-2 text-foreground">{label}</dt>
            <dd className="border-t border-border py-2 text-right font-semibold tabular-nums text-foreground">{value}</dd>
          </div>
        ))}
        <dt className="border-t border-border py-2 text-section text-foreground">New total for {count} {count === 1 ? "traveler" : "travelers"}</dt>
        <dd className="border-t border-border py-2 text-right text-section font-semibold tabular-nums text-foreground">{formatMoney(quote.new_total)}</dd>
      </dl>
      <DialogFooter className="gap-2 sm:justify-start">
        <Button type="button" className="h-control bg-teal text-body text-teal-foreground hover:bg-teal/90" onClick={onContinue}>Continue at new price</Button>
        <Button type="button" variant="outline" className="h-control text-body" onClick={onBack}>Back to results</Button>
      </DialogFooter>
    </>
  );
}
