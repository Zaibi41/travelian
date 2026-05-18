import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCheck, Clock, CheckCircle2, GraduationCap, Plane } from "lucide-react";
import { Link } from "react-router-dom";
import { mockVisaPackages } from "@/data/mock";
import { PageHeader } from "@/components/public/PageHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const categories = [
  { name: "Visit Visa", icon: Plane },
  { name: "Study Visa", icon: GraduationCap },
  { name: "Work Visa", icon: FileCheck },
  { name: "Umrah Visa", icon: FileCheck },
];

const countries = [
  { name: "UAE", flag: "ðŸ‡¦ðŸ‡ª", time: "5-7 days", price: 120 },
  { name: "Turkey", flag: "ðŸ‡¹ðŸ‡·", time: "10-15 days", price: 90 },
  { name: "United Kingdom", flag: "ðŸ‡¬ðŸ‡§", time: "15-21 days", price: 250 },
  { name: "Schengen (EU)", flag: "ðŸ‡ªðŸ‡º", time: "15-20 days", price: 180 },
  { name: "USA", flag: "ðŸ‡ºðŸ‡¸", time: "30-60 days", price: 320 },
  { name: "Canada", flag: "ðŸ‡¨ðŸ‡¦", time: "20-30 days", price: 280 },
];

const requirements = [
  "Valid passport (6+ months)",
  "Recent passport-size photographs",
  "Bank statements (last 6 months)",
  "Travel itinerary & hotel bookings",
  "Cover letter & invitation (if applicable)",
];

const faqs = [
  { q: "How long does visa processing take?", a: "It varies by country, typically 5 to 30 business days. Each country card shows its expected processing time." },
  { q: "Is the visa fee refundable?", a: "Government visa fees are non-refundable. Service fees are refundable only if we have not begun processing." },
  { q: "Do you guarantee approval?", a: "No, visa decisions are made by embassies. We have a 98% success rate and ensure your application is complete and accurate." },
];

export default function PublicVisaPage() {
  const visas = mockVisaPackages.filter(v => v.status === 'active');

  return (
    <div>
      <PageHeader title="Visa Services" tagline="Hassle-free visa processing for visit, study and Umrah" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Categories */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map(c => (
              <Card key={c.name} className="text-center border-0 shadow-card hover:shadow-elevated transition-all cursor-pointer">
                <CardContent className="p-5">
                  <div className="h-11 w-11 rounded-xl bg-gold-light flex items-center justify-center mx-auto mb-3"><c.icon className="h-5 w-5 text-gold" /></div>
                  <p className="font-semibold text-foreground text-sm">{c.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Country cards */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">Popular Countries</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {countries.map(c => (
              <Card key={c.name} className="border-0 shadow-card">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl">{c.flag}</p>
                      <h3 className="font-semibold text-foreground mt-1">{c.name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="h-3 w-3" /> {c.time}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">Service fee</span>
                      <p className="text-xl font-bold text-primary">PKR {c.price}</p>
                    </div>
                  </div>
                  <Link to={`/contact?type=visa&country=${c.name}`}>
                    <Button size="sm" className="w-full mt-3 gradient-primary text-primary-foreground">Apply Now</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Existing mock visa packages */}
        {visas.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">Featured Visa Packages</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {visas.map(visa => (
                <Card key={visa.packageId} className="overflow-hidden border-0 shadow-card text-center">
                  <div className="h-32 bg-gradient-to-br from-success/10 to-accent flex items-center justify-center">
                    <FileCheck className="h-12 w-12 text-success/30" />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground text-sm">{visa.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{visa.duration}</p>
                    <p className="text-xl font-bold text-primary mt-2">PKR {visa.basePrice}</p>
                    <Link to={`/visa/${visa.packageId}`}>
                      <Button size="sm" className="w-full mt-3 gradient-primary text-primary-foreground">View details</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Requirements */}
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

        {/* FAQ */}
        <section className="max-w-3xl mx-auto">
          <h2 className="text-lg font-bold text-foreground mb-4 text-center">FAQs</h2>
          <Accordion type="single" collapsible>
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`f-${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </div>
    </div>
  );
}


