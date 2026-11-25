import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/SEO";
import { confirmAlfalahReturn } from "@/lib/public-booking";

// Where Bank Alfalah (Alfa Payment Gateway) sends the customer back after its checkout. It sends only the order id ("O",
// as a query parameter or in the path, e.g. /payment/alfalah/TS=P/RC=00/RD=/O=…). The gateway asks Bank Alfalah for
// that order's status itself; this page only shows the answer. Nothing here marks a booking paid.

type Outcome = "paid" | "not_paid" | "checking";

const OUTCOME: Record<Outcome, { title: string; text: string; icon: typeof CheckCircle2; tone: string }> = {
  paid: {
    title: "Payment received",
    text: "Thank you. Bank Alfalah confirmed your payment. Travelian will issue your tickets next and email them to you.",
    icon: CheckCircle2, tone: "text-success",
  },
  not_paid: {
    title: "Payment not completed",
    text: "Bank Alfalah hasn't confirmed a payment for this booking. Nothing was charged. You can try again from My Bookings before the hold time ends.",
    icon: XCircle, tone: "text-destructive",
  },
  checking: {
    title: "Payment being checked",
    text: "We couldn't confirm the payment with Bank Alfalah yet. Travelian will check it and update your booking. Please don't pay twice.",
    icon: Clock, tone: "text-warning",
  },
};

function outcomeOf(result: string): Outcome {
  if (result === "paid" || result === "already_paid") return "paid";
  if (result === "not_paid" || result === "failed" || result === "already_failed") return "not_paid";
  return "checking";
}

export default function AlfalahReturnPage() {
  const location = useLocation();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    const params = Object.fromEntries(new URLSearchParams(location.search).entries());
    let cancelled = false;
    confirmAlfalahReturn({ ...params, path: location.pathname })
      .then(answer => { if (!cancelled) { setOutcome(outcomeOf(answer.result)); setReference(answer.reference ?? null); } })
      .catch(() => { if (!cancelled) setOutcome("checking"); });
    return () => { cancelled = true; };
  }, [location.pathname, location.search]);

  const shown = outcome ? OUTCOME[outcome] : null;
  return (
    <div className="bg-muted/20 min-h-screen">
      <SEO title="Payment - Travelian" description="Your Travelian payment." noIndex />
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        {shown ? (
          <Card className="border-0 shadow-card">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-start gap-3">
                <shown.icon className={`mt-0.5 h-7 w-7 shrink-0 ${shown.tone}`} aria-hidden="true" />
                <div className="min-w-0">
                  <h1 className="font-display text-xl font-bold text-foreground">{shown.title}</h1>
                  {reference && <p className="mt-0.5 text-sm text-muted-foreground">Booking <span className="font-mono font-semibold text-foreground">{reference}</span></p>}
                </div>
              </div>
              <p role="status" className="text-sm leading-relaxed text-muted-foreground">{shown.text}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild className="h-11 rounded-xl px-5"><Link to="/my-bookings">View My Bookings</Link></Button>
                <Button asChild variant="outline" className="h-11 rounded-xl px-5"><Link to="/">Back to Home</Link></Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div aria-busy="true" className="space-y-3">
            <h1 className="sr-only">Checking your payment</h1>
            <p className="text-sm text-muted-foreground">Checking your payment with Bank Alfalah…</p>
            <Skeleton className="h-40 rounded-xl" />
          </div>
        )}
      </div>
    </div>
  );
}
