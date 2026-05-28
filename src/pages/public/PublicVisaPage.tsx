import { CheckCircle2, Clock, FileCheck, GraduationCap, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/public/PageHeader";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";

const categories = [
  { name: "Visit Visa", icon: Plane },
  { name: "Study Visa", icon: GraduationCap },
  { name: "Business Visa", icon: FileCheck },
  { name: "Umrah Visa", icon: FileCheck },
];

const requirements = [
  "Valid passport with 6+ months validity",
  "Recent passport-size photographs",
  "Bank statements when required",
  "Travel itinerary and hotel bookings when required",
  "Cover letter or invitation if applicable",
];

export default function PublicVisaPage() {
  const visas: never[] = [];

  return (
    <div>
      <PageHeader title="Visa Services" tagline="Database-managed visa packages with transparent processing details" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map(c => (
              <Card key={c.name} className="text-center border-0 shadow-card">
                <CardContent className="p-5">
                  <div className="h-11 w-11 rounded-xl bg-gold-light flex items-center justify-center mx-auto mb-3"><c.icon className="h-5 w-5 text-gold" /></div>
                  <p className="font-semibold text-foreground text-sm">{c.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {visas.length === 0 && (
          <div className="rounded-2xl border bg-card p-8 text-center shadow-card">
            <FileCheck className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-bold text-foreground">No visa packages are published right now</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
              Travelian only shows active visa packages from the database. Contact our visa team for country, visa type, processing time, required documents and final pricing.
            </p>
            <a
              href="https://wa.me/923244440014?text=Hello%20Travelian%2C%20please%20share%20visa%20service%20details."
              target="_blank"
              rel="noreferrer"
            >
              <Button className="mt-5 rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a]">
                <WhatsAppIcon className="mr-2 h-4 w-4" /> Ask Visa Team
              </Button>
            </a>
          </div>
        )}

        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">General Requirements</h2>
          <div className="bg-muted/40 rounded-2xl p-6">
            <ul className="grid md:grid-cols-2 gap-2">
              {requirements.map(r => (
                <li key={r} className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-success" /> {r}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-start gap-3">
            <Clock className="mt-1 h-5 w-5 text-primary" />
            <div>
              <h2 className="font-bold text-foreground">Processing times vary by country</h2>
              <p className="mt-1 text-sm text-muted-foreground">Travelian confirms embassy fee, service fee, validity, stay duration and terms before collecting payment.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
