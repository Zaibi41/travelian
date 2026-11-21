import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/public/PageHeader";
import { useSiteSwitches } from "@/lib/site-switches";
import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY } from "@/lib/site-config";

const faqs = [
  { q: "How do I book a flight on Travelian?", a: "Use our flight search on the homepage, select an available fare, and continue with the booking flow or contact our travel desk for assisted confirmation." },
  { q: "How does Group Ticketing work?", a: "Group tickets offer fixed-fare seat allocations on popular international routes. Baggage allowances and flight timings are shown upfront. Note that group fares are non-refundable and non-changeable once booked." },
  { q: "Can I cancel or change my booking?", a: "Cancellation and date-change rules depend on the selected airline, hotel, or fare type. Regular airline fares follow carrier rules shown before confirmation; group fares are non-refundable and non-changeable." },
  { umrah: true, q: "Do you offer Umrah packages with visa?", a: "Published Umrah packages show the services included in each package. Contact our team when you need a custom option." },
  { q: "What payment methods do you accept?", a: "Supported payment options (including documented bank transfer and online methods where available) are confirmed in writing during the booking process." },
  { q: "How do I reach Travelian support?", a: `Email ${SUPPORT_EMAIL}, call ${SUPPORT_PHONE_DISPLAY}, or message our Lahore travel desk on WhatsApp during working hours (Mon–Sat, 9:00 AM – 6:00 PM PKT).` },
];

export default function FaqPage() {
  const { umrah } = useSiteSwitches(); // D39: Umrah wording only when Umrah is switched on
  const visibleFaqs = faqs.filter(f => umrah || !("umrah" in f));
  return (
    <div>
      <SEO
        title="Travel Help & Frequently Asked Questions | Travelian"
        description={`Find answers about booking flights, group tickets, changing trips, ${umrah ? "Umrah packages, " : ""}payments and contacting Travelian support.`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: visibleFaqs.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }}
      />
      <PageHeader title="Help Center / FAQ" tagline="Answers to the most common questions about flights, group tickets and bookings" />
      <div className="travelian-container py-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <Accordion type="single" collapsible className="w-full space-y-2.5">
            {visibleFaqs.map((f, i) => (
              <AccordionItem key={f.q} value={`i-${i}`} className="rounded-xl border border-border/80 bg-card px-5 shadow-card">
                <AccordionTrigger className="py-4 text-left text-sm font-semibold text-foreground hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="pb-4 text-sm leading-6 text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <Card className="rounded-2xl border-border/70 bg-muted/40 shadow-card">
            <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-display text-base font-bold text-foreground">Still have a question?</h2>
                <p className="mt-1 text-sm text-muted-foreground">Talk to our travel desk in Lahore for help with routes, group fares, or an existing booking.</p>
              </div>
              <Button asChild className="min-h-11 shrink-0 rounded-xl"><Link to="/contact">Contact Us</Link></Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
