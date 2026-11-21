import { SEO } from "@/components/SEO";
import { PageHeader } from "@/components/public/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { GROUP_FARE_NOTICE } from "@/lib/group-fare-terms";
import { SUPPORT_ADDRESS, SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from "@/lib/site-config";

export default function TermsPage() {
  return (
    <div>
      <SEO title="Booking Terms & Conditions | Travelian" description="Review Travelian booking terms, cancellation policies, group fare conditions and refund terms before making your travel arrangements." />
      <PageHeader title="Terms & Conditions" tagline="Booking terms, cancellation, group fare and refund policies" />
      <div className="travelian-container py-10">
        <Card className="mx-auto max-w-3xl rounded-2xl border-border/70 shadow-card">
          <CardContent className="space-y-6 p-6 text-sm leading-6 text-muted-foreground sm:p-8">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Effective: {new Date().getFullYear()} · Travelian ({SUPPORT_ADDRESS})
            </p>
            <section id="booking-terms" className="space-y-1.5">
              <h2 className="font-display text-lg font-bold text-foreground">1. Booking Terms</h2>
              <p>All bookings are subject to live seat or room availability and written confirmation. Quoted fares and taxes may change until payment is received and tickets or vouchers are issued.</p>
            </section>
            <section id="cancellation-policy" className="space-y-1.5">
              <h2 className="font-display text-lg font-bold text-foreground">2. Cancellation Policy</h2>
              <p>Cancellation and date-change rules vary by airline, hotel, or service provider. Specific fare conditions are shown before confirmation and documented on your booking details.</p>
            </section>
            <section id="refund-policy" className="space-y-1.5">
              <h2 className="font-display text-lg font-bold text-foreground">3. Refund Policy</h2>
              <p>Approved refunds are processed to the original payment method or bank account within 7–14 business days after airline or supplier settlement, minus any applicable airline penalties.</p>
            </section>
            <section id="group-ticketing-terms" className="space-y-1.5">
              <h2 className="font-display text-lg font-bold text-foreground">4. Group Ticketing Terms</h2>
              <p>{GROUP_FARE_NOTICE} Unpaid holds automatically lapse at the supplier&apos;s stated expiry time.</p>
            </section>
            <section id="liability" className="space-y-1.5">
              <h2 className="font-display text-lg font-bold text-foreground">5. Liability</h2>
              <p>Travelian acts as an intermediary between travelers and airlines, hotels, or ground suppliers. We assist with rebooking and support where possible, but are not liable for schedule changes, delays, or cancellations by third-party carriers.</p>
            </section>
            <div className="border-t border-border/70 pt-4 text-xs text-muted-foreground">
              Questions about these terms? Email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-primary hover:underline">{SUPPORT_EMAIL}</a>{" "}
              or call{" "}
              <a href={`tel:${SUPPORT_PHONE_TEL}`} className="font-medium text-primary hover:underline">{SUPPORT_PHONE_DISPLAY}</a>.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
