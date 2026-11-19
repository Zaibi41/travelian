import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { BookingLookupResult } from "@/components/public/BookingLookupResult";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SEO } from "@/components/SEO";
import { lookupBooking, PublicBookingError, type BookingLookup } from "@/lib/public-booking";

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
          <BookingLookupResult result={result} />
        )}
        <p className="text-sm text-muted-foreground">Bookings made in this browser are also in <Link to="/my-bookings" className="text-primary underline-offset-2 hover:underline">My Bookings</Link>.</p>
      </div>
    </div>
  );
}
