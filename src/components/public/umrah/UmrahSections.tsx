import { Building2, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { SectionHeading } from "@/components/public/SectionHeading";
import { whatsappUrl } from "@/lib/site-config";
import { startingFrom, PRICING_DISCLAIMER } from "@/lib/service-pricing";
import { umrahCityOffers, umrahFaqs, umrahNotes, umrahTierComparison } from "@/data/services/umrah";

export function UmrahCityPackages() {
  return (
    <section id="umrah-cities" className="scroll-mt-24">
      <SectionHeading
        eyebrow="City-wise departures"
        title="Umrah Packages by Departure City"
        description="Packages are prepared from all major Pakistani cities. Rates change with airline availability on your dates."
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {umrahCityOffers.map((city) => (
          <Card key={city.city} className="rounded-xl border-border/70 shadow-card transition-shadow hover:shadow-md">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><MapPin className="h-5 w-5" /></span>
                <div>
                  <h3 className="text-base font-black text-foreground">Umrah from {city.city}</h3>
                  <p className="text-xs font-semibold text-muted-foreground">{city.route}</p>
                </div>
              </div>
              <p className="text-sm font-bold text-primary">{startingFrom(city.startingFrom)}</p>
              <p className="text-xs text-muted-foreground">{city.note}</p>
              <a href={whatsappUrl(`Assalam o Alaikum Travelian,\n\nI want an Umrah package from ${city.city} (${city.route}).\nPlease share available packages, hotels and current price.`)} target="_blank" rel="noreferrer">
                <Button variant="outline" className="h-11 w-full rounded-xl font-semibold">
                  <WhatsAppIcon className="mr-2 h-4 w-4 text-whatsapp" /> Request Package
                </Button>
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function UmrahTierComparison() {
  return (
    <section id="umrah-compare" className="scroll-mt-24">
      <SectionHeading
        eyebrow="Compare"
        title="Which Package Type Suits You?"
        description="Economy, Standard, Executive and Premium differ mainly in hotel distance, room sharing and transport."
      />
      <Card className="mt-6 overflow-hidden rounded-xl border-border/70 shadow-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="min-w-32 font-bold text-foreground">Package type</TableHead>
                <TableHead className="min-w-44">Hotel distance</TableHead>
                <TableHead className="min-w-36">Room sharing</TableHead>
                <TableHead className="min-w-36">Transport</TableHead>
                <TableHead className="min-w-52">Best for</TableHead>
                <TableHead className="min-w-32">Comfort</TableHead>
                <TableHead className="min-w-28">Price level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {umrahTierComparison.map((row) => (
                <TableRow key={row.tier}>
                  <TableCell className="font-black text-primary">{row.tier}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.hotelDistance}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.roomSharing}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.transport}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.bestFor}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.comfort}</TableCell>
                  <TableCell><Badge variant="secondary">{row.priceLevel}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </section>
  );
}

export function UmrahNotes() {
  return (
    <section className="rounded-2xl border bg-muted/25 p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-black text-foreground">
        <ShieldCheck className="h-5 w-5 text-primary" /> Important Umrah Notes
      </h2>
      <ul className="mt-4 grid gap-2 md:grid-cols-2">
        {umrahNotes.map((note) => (
          <li key={note} className="flex gap-2 text-sm text-muted-foreground"><span className="mt-1 text-primary">•</span> {note}</li>
        ))}
      </ul>
      <p className="mt-4 rounded-xl border bg-card p-3 text-xs font-semibold text-muted-foreground">{PRICING_DISCLAIMER}</p>
    </section>
  );
}

export function UmrahFaqs() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: umrahFaqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <section id="umrah-faqs" className="scroll-mt-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SectionHeading eyebrow="FAQs" title="Umrah Questions, Answered" align="center" />
      <Accordion type="single" collapsible className="mx-auto mt-6 max-w-3xl">
        {umrahFaqs.map((faq) => (
          <AccordionItem key={faq.q} value={faq.q} className="border-b">
            <AccordionTrigger className="text-left text-sm font-bold text-foreground">{faq.q}</AccordionTrigger>
            <AccordionContent className="text-sm leading-6 text-muted-foreground">{faq.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export function UmrahFinalCta() {
  return (
    <section className="relative isolate overflow-hidden rounded-xl bg-sidebar px-6 py-10 text-center md:px-10">
      <div className="absolute inset-0 opacity-[0.08]" aria-hidden="true"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(0 0% 100%) 1px, transparent 0)", backgroundSize: "22px 22px" }} />
      <div className="absolute -bottom-20 left-1/2 h-56 w-72 -translate-x-1/2 rounded-full bg-gold/15 blur-3xl" aria-hidden="true" />
      <div className="relative z-10">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-gold ring-1 ring-white/15"><Sparkles className="h-5 w-5" /></span>
        <h2 className="mt-4 font-display text-xl font-black text-primary-foreground md:text-2xl">Need help choosing the right Umrah package?</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-primary-foreground">
          Our Umrah desk compares hotels, transport and airline options for your dates and budget, then sends a clear final price.
        </p>
        <a className="mt-6 inline-block" href={whatsappUrl("Assalam o Alaikum Travelian, please help me choose the right Umrah package.")} target="_blank" rel="noreferrer">
          <Button size="lg" className="h-12 rounded-xl bg-whatsapp px-7 text-base font-bold text-whatsapp-foreground hover:bg-whatsapp-hover">
            <WhatsAppIcon className="mr-2 h-5 w-5" /> Chat with Travelian on WhatsApp
          </Button>
        </a>
        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-primary-foreground">
          <Building2 className="h-4 w-4" /> Contracted Makkah and Madinah hotels · Own Saudi transport desk
        </p>
      </div>
    </section>
  );
}
