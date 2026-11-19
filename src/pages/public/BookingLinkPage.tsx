import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/SEO";
import { BookingLookupResult } from "@/components/public/BookingLookupResult";
import { bookingByLink, PublicBookingError, type BookingLookup } from "@/lib/public-booking";
import { whatsappUrl } from "@/lib/site-config";

// The page a customer email's button opens: one booking, read-only, no login. When the link has expired, the customer
// finds the booking with its reference and email or phone instead.
export default function BookingLinkPage() {
  const { token = "" } = useParams();
  const [result, setResult] = useState<BookingLookup | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    bookingByLink(token, controller.signal).then(setResult).catch(problem => {
      if (controller.signal.aborted) return;
      setError(problem instanceof PublicBookingError ? problem.message : "We couldn't open this booking right now. Please try again.");
    });
    return () => controller.abort();
  }, [token]);

  return (
    <div className="bg-muted/20 min-h-screen">
      <SEO title="Your booking - Travelian" description="Your Travelian booking." noIndex />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Your booking</h1>
          <p className="text-muted-foreground">Opened from your Travelian email. Questions? Call or WhatsApp us; quote your booking reference.</p>
        </div>
        {result ? (
          <>
            <BookingLookupResult result={result} />
            <div className="flex flex-wrap gap-2">
              <a href={whatsappUrl(`Hello Travelian, I have a question about booking ${result.reference}.`)} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="rounded-xl">Message us on WhatsApp</Button>
              </a>
              <Link to="/find-booking"><Button variant="ghost" className="rounded-xl">Find another booking</Button></Link>
            </div>
          </>
        ) : error ? (
          <Card className="border-0 shadow-card">
            <CardContent className="p-5 space-y-3">
              <p role="alert" className="text-foreground">{error}</p>
              <Link to="/find-booking"><Button className="rounded-xl">Find my booking</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <div aria-busy="true" aria-label="Loading your booking" className="space-y-3">
            <Skeleton className="h-10 rounded-xl" /><Skeleton className="h-40 rounded-xl" />
          </div>
        )}
      </div>
    </div>
  );
}
