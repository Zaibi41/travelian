import { SEO } from "@/components/SEO";
import { PageHeader } from "@/components/public/PageHeader";

export default function PrivacyPage() {
  return (
    <div>
      <SEO title="Privacy Policy | Travelian" description="Read how Travelian collects, uses and protects personal information provided during travel searches and bookings." />
      <PageHeader title="Privacy Policy" tagline="How we collect, use and protect your data" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 prose prose-sm">
        <p className="text-muted-foreground">Effective date: {new Date().getFullYear()}</p>
        <h2 className="text-lg font-bold mt-6">Information We Collect</h2>
        <p className="text-muted-foreground">We collect personal information you provide when booking, including name, contact details, passport information, and payment data.</p>
        <h2 className="text-lg font-bold mt-6">How We Use It</h2>
        <p className="text-muted-foreground">We use your data to process bookings, issue tickets, communicate with you, and improve our services.</p>
        <h2 className="text-lg font-bold mt-6">Data Security</h2>
        <p className="text-muted-foreground">All data is stored on secure servers and transmitted via SSL encryption.</p>
        <h2 className="text-lg font-bold mt-6">Contact</h2>
        <p className="text-muted-foreground">For privacy questions email <a href="mailto:privacy@travelian.com" className="text-primary">privacy@travelian.com</a>.</p>
      </div>
    </div>
  );
}
