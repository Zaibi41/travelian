import { Plane } from "lucide-react";
import { HoldCountdown } from "@/components/public/BankTransferDetails";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyPnr } from "@/components/CopyPnr";
import type { BookingLookup } from "@/lib/public-booking";

const STATUS: Record<BookingLookup["status"], { label: string; tone: string }> = {
  requested: { label: "Request received", tone: "bg-warning/10 text-warning" },
  held: { label: "Held: payment due", tone: "bg-warning/10 text-warning" },
  paid: { label: "Paid: tickets being issued", tone: "bg-success/10 text-success" },
  issued: { label: "Tickets issued", tone: "bg-success/10 text-success" },
  expired: { label: "Expired", tone: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Cancelled", tone: "bg-destructive/10 text-destructive" },
};

const rs = (money: { amount_minor: number; currency: string }) =>
  `${money.currency === "PKR" ? "Rs" : money.currency} ${(money.amount_minor / 100).toLocaleString("en-PK")}`;

/** One booking, read-only: Find my booking's result, and the page a customer email's link opens. */
export function BookingLookupResult({ result }: { result: BookingLookup }) {
  return (
    <Card className="border-0 shadow-card" aria-live="polite">
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono font-bold text-foreground">{result.reference}</p>
          <Badge className={`${STATUS[result.status].tone} border-0`}>{STATUS[result.status].label}</Badge>
        </div>
        {result.status === "held" && result.hold_expires_at && (
          <HoldCountdown until={result.hold_expires_at} />
        )}
        {(result.legs ?? []).length > 0 && (
          <ul className="space-y-2">
            {result.legs!.map((leg, index) => (
              <li key={index} className="flex flex-wrap items-center gap-2 text-sm">
                <Plane className="h-4 w-4 text-primary" />
                <span className="font-semibold">{leg.origin} → {leg.destination}</span>
                <span className="text-muted-foreground">{[leg.flight_number, leg.departure_date, leg.departure_time].filter(Boolean).join(" · ")}</span>
              </li>
            ))}
          </ul>
        )}
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-muted-foreground">Total</dt><dd className="font-semibold">{rs(result.total)}</dd></div>
          <div><dt className="text-muted-foreground">Paid</dt><dd className="font-semibold">{rs(result.paid)}</dd></div>
          {result.airline_pnr && <div><dt className="text-muted-foreground">Airline PNR</dt><dd className="flex items-center gap-1 font-mono font-semibold">{result.airline_pnr}<CopyPnr pnr={result.airline_pnr} /></dd></div>}
          {(result.travelers ?? []).length > 0 && <div className="col-span-2 sm:col-span-4"><dt className="text-muted-foreground">Travelers</dt><dd>{result.travelers!.join(", ")}</dd></div>}
          {(result.tickets ?? []).length > 0 && <div className="col-span-2 sm:col-span-4"><dt className="text-muted-foreground">Ticket numbers</dt><dd className="font-mono">{result.tickets!.join(", ")}</dd></div>}
        </dl>
        <p className="rounded-xl bg-muted/50 px-3 py-2 text-sm"><span className="font-semibold">Next steps: </span>{result.next_steps}</p>
      </CardContent>
    </Card>
  );
}
