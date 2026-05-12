import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Package, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { mockPackages } from "@/data/mock";
import { PageHeader } from "@/components/public/PageHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const timeline = [
  { step: "Choose Package", desc: "Pick from Economy, Standard or Premium." },
  { step: "Submit Documents", desc: "Passport, photo and CNIC." },
  { step: "Visa Processing", desc: "7–10 business days." },
  { step: "Travel", desc: "Fly with our 24/7 in-trip support." },
];

const faqs = [
  { q: "What's included in an Umrah package?", a: "Visa, return flights, accommodation in Makkah and Madinah, ground transport and Ziyarat tours." },
  { q: "How long does Umrah visa take?", a: "Usually 7–10 business days after document submission." },
  { q: "Can I customize my package?", a: "Yes, contact our team to tailor flights, hotels and duration to your needs." },
  { q: "Is travel insurance included?", a: "Insurance is optional and recommended; we can arrange it on request." },
];

export default function PublicPackagesPage() {
  const packages = mockPackages.filter(p => p.status === 'active');

  return (
    <div>
      <PageHeader title="Umrah Packages" tagline="Carefully curated packages for a blessed spiritual journey" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map(pkg => (
            <Card key={pkg.packageId} className="overflow-hidden hover:shadow-elevated transition-all group">
              <div className="h-52 bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
                <Package className="h-16 w-16 text-primary/30 group-hover:scale-110 transition-transform" />
              </div>
              <CardContent className="p-5">
                <h3 className="text-lg font-semibold text-foreground">{pkg.name}</h3>
                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {pkg.city}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {pkg.duration}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{pkg.description}</p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {pkg.includes.map(i => <Badge key={i} variant="outline" className="text-xs">{i}</Badge>)}
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div>
                    <span className="text-xs text-muted-foreground">Starting from</span>
                    <p className="text-2xl font-bold text-primary">${pkg.basePrice}</p>
                  </div>
                  <Link to={`/umrah/${pkg.packageId}`}>
                    <Button className="gradient-primary text-primary-foreground">Book Now</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Visa Assistance */}
        <section className="mt-14 bg-muted/40 rounded-2xl p-6 md:p-10">
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Umrah Visa Assistance</h2>
              <p className="text-sm text-muted-foreground mt-2">We handle the full visa process from document collection to issuance — typically in 7–10 business days.</p>
              <Link to="/visa-services" className="inline-block mt-4"><Button variant="outline">Learn More</Button></Link>
            </div>
            <ul className="space-y-2">
              {["Passport (6+ months validity)", "Recent passport-size photo", "Vaccination certificate", "CNIC copy"].map(d => (
                <li key={d} className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="h-4 w-4 text-success" /> {d}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Timeline */}
        <section className="mt-14">
          <h2 className="text-xl md:text-2xl font-bold text-foreground text-center">Your Journey</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {timeline.map((s, i) => (
              <Card key={s.step} className="border-0 shadow-card">
                <CardContent className="p-5 text-center">
                  <div className="h-10 w-10 rounded-full gradient-primary text-primary-foreground flex items-center justify-center mx-auto font-bold">{i + 1}</div>
                  <p className="font-semibold text-foreground mt-3 text-sm">{s.step}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="mt-14">
          <h2 className="text-xl md:text-2xl font-bold text-foreground text-center mb-6">What Pilgrims Say</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { n: "Ayesha R.", t: "Family Umrah was perfectly arranged — hotel was steps from Haram." },
              { n: "Bilal K.", t: "Visa processed in 6 days. Smooth experience overall." },
              { n: "Sana M.", t: "Excellent group leader and support throughout the trip." },
            ].map(t => (
              <Card key={t.n} className="border-0 shadow-card"><CardContent className="p-5">
                <div className="text-gold mb-2">★★★★★</div>
                <p className="text-sm text-muted-foreground italic">"{t.t}"</p>
                <p className="text-sm font-semibold text-foreground mt-3">{t.n}</p>
              </CardContent></Card>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-14 max-w-3xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-foreground text-center mb-6">Frequently Asked Questions</h2>
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
