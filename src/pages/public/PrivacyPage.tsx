import { SEO } from "@/components/SEO";
import { PageHeader } from "@/components/public/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { SUPPORT_ADDRESS, SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from "@/lib/site-config";

export default function PrivacyPage() {
  return (
    <div>
      <SEO breadcrumbs={[{ name: "Privacy Policy", path: "/privacy" }]} title="Privacy Policy | Travelian" description="Read how Travelian collects, uses and protects personal information provided during travel searches and bookings." />
      <PageHeader title="Privacy Policy" tagline="How we collect, use and protect your personal information" />
      <div className="travelian-container py-10">
        <Card className="mx-auto max-w-3xl rounded-2xl border-border/70 shadow-card">
          <CardContent className="space-y-6 p-6 text-sm leading-6 text-muted-foreground sm:p-8">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Effective: {new Date().getFullYear()} · Travelian ({SUPPORT_ADDRESS})
            </p>
            <section className="space-y-1.5">
              <h2 className="font-display text-lg font-bold text-foreground">1. Information We Collect</h2>
              <p>We collect personal information you provide when searching or booking travel, including traveler names, contact details (phone and email), passport or CNIC details required for ticketing, and payment reference details.</p>
            </section>
            <section className="space-y-1.5">
              <h2 className="font-display text-lg font-bold text-foreground">2. How We Use Your Information</h2>
              <p>We use your information to check availability, hold and issue flight or hotel bookings, send booking confirmations and itineraries, provide customer support, and meet airline and regulatory requirements.</p>
            </section>
            <section className="space-y-1.5">
              <h2 className="font-display text-lg font-bold text-foreground">3. Sharing with Travel Suppliers</h2>
              <p>To complete your booking, we share only the required passenger and booking details with the relevant airline, group supplier, hotel, or payment partner. We do not sell your personal information to third parties.</p>
            </section>
            <section className="space-y-1.5">
              <h2 className="font-display text-lg font-bold text-foreground">4. Data Security &amp; Retention</h2>
              <p>Data is transmitted over encrypted HTTPS connections and stored with access controls limited to authorized Travelian staff. Booking records are retained as needed for ticketing support, accounting, and legal compliance.</p>
            </section>
            <section className="space-y-1.5">
              <h2 className="font-display text-lg font-bold text-foreground">5. Contact &amp; Privacy Requests</h2>
              <p>
                To request an update or removal of your personal details, email{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-primary hover:underline">{SUPPORT_EMAIL}</a>{" "}
                or call{" "}
                <a href={`tel:${SUPPORT_PHONE_TEL}`} className="font-medium text-primary hover:underline">{SUPPORT_PHONE_DISPLAY}</a>.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
