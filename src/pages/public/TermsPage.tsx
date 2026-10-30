import { SEO } from "@/components/SEO";
import { PageHeader } from "@/components/public/PageHeader";

export default function TermsPage() {
  return (
    <div>
      <SEO title="Booking Terms & Conditions | Travelian" description="Review Travelian booking terms, cancellation policies and refund conditions before making your travel arrangements." />
      <PageHeader title="Terms & Conditions" tagline="Booking terms, cancellation and refund policies" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 text-sm text-muted-foreground">
        <section>
          <h2 className="text-lg font-bold text-foreground">1. Booking Terms</h2>
          <p>All bookings are subject to availability and confirmation. Prices may change until booking is confirmed.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-foreground">2. Cancellation Policy</h2>
          <p>Cancellation rules vary by airline, hotel, or service provider. Specific terms are shown at checkout.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-foreground">3. Refund Policy</h2>
          <p>Refunds are processed to the original payment method within 7-14 business days after approval.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-foreground">4. Liability</h2>
          <p>Travelian acts as an intermediary between travelers and service providers. We are not liable for delays, cancellations or actions of third-party providers.</p>
        </section>
      </div>
    </div>
  );
}
