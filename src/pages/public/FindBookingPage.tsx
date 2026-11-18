import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plane } from "lucide-react";
import { HoldCountdown } from "@/components/public/BankTransferDetails";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { lookupBooking, PublicBookingError, type BookingLookup } from "@/lib/public-booking";
import { CopyPnr } from "@/components/CopyPnr";

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

// Find a booking without logging in (D37): reference + the email or phone used to book. Read-only.
export default function FindBookingPage() {
  const [reference, setReference] = useState("");
  const [contact, setContact] = useState("");
  const [result, setResult] = useState<BookingLookup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    if (reference.trim().length < 6 || contact.trim().length < 5) {
      setError("Enter your booking reference and the email or phone number you booked with.");
      return;
    }
    setPending(true);
    try {
      setResult(await lookupBooking(reference, contact));
    } catch (problem) {
      setError(problem instanceof PublicBookingError ? problem.message : "We couldn't look up the booking. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="bg-muted/20 min-h-screen">
      <SEO title="Find my booking - Travelian" description="Check your Travelian booking with your booking reference and email or phone. No account needed." />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Find my booking</h1>
          <p className="text-muted-foreground">Enter your booking reference and the email or phone number used to book. No account needed.</p>
        </div>
        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" noValidate>
              <div>
                <Label htmlFor="lookup-reference">Booking reference</Label>
                <Input id="lookup-reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. TRV-G-2026-AB12CD"
                  autoComplete="off" className="mt-1.5 h-11 rounded-xl uppercase" />
              </div>
              <div>
                <Label htmlFor="lookup-contact">Email or phone</Label>
                <Input id="lookup-contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="you@example.com or 0300 1234567"
                  autoComplete="email" className="mt-1.5 h-11 rounded-xl" />
              </div>
              <Button type="submit" disabled={pending} className="h-11 rounded-xl gap-2">
                <Search className="h-4 w-4" /> {pending ? "Finding…" : "Find booking"}
              </Button>
            </form>
            {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        {result && (
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
        )}
        <p className="text-sm text-muted-foreground">Bookings made in this browser are also in <Link to="/my-bookings" className="text-primary underline-offset-2 hover:underline">My Bookings</Link>.</p>
      </div>
    </div>
  );
}
