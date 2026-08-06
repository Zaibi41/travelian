import { Link } from "react-router-dom";
import { CircleHelp, ArrowRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from "@/lib/site-config";

const faqs = [
  {
    q: "How do I book a flight with Travelian?",
    a: "Search your route and dates on the homepage, compare the available fares, then continue to booking. You add traveller details, choose seats and add-ons, and confirm. Our team reviews every booking with the airline or supplier before ticketing, so you always get a confirmed ticket.",
  },
  {
    q: "Are the fares shown final?",
    a: "Fares and availability come from live supplier responses and can change until ticketing. Your booking page always shows the base fare, taxes and any service charge separately, so there are no hidden add-ons at the end.",
  },
  {
    q: "Which payment methods can I use?",
    a: "You can pay through supported cards and local Pakistani payment options, or arrange bank transfer with our team. Every online payment is processed over a secure encrypted connection, and you receive a confirmation with your booking reference.",
  },
  {
    q: "Do you help with Umrah packages and visas?",
    a: "Yes. We arrange Umrah packages with hotels, transport and guidance, and we assist with visit and study visa applications, including document checklists and appointment guidance. Visa decisions always rest with the relevant embassy or consulate.",
  },
  {
    q: "Can I talk to a real person before booking?",
    a: `Absolutely. Message us on WhatsApp or call ${SUPPORT_PHONE_DISPLAY} and a Travelian travel consultant will help you compare options, explain baggage and cancellation rules, and confirm the best fare for your trip.`,
  },
  {
    q: "Do you work with travel agents and corporate clients?",
    a: "Yes. Travelian runs a B2B agent platform with agency wallets, negotiated fares, markup control, booking reports and dedicated support, plus corporate travel desks for companies with regular travel needs.",
  },
];

export function HomeFaq() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section className="py-14 md:py-16 bg-muted/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-light px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-foreground">
              <CircleHelp className="h-3 w-3" /> Before you book
            </span>
            <h2 className="mt-3 text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground">
              Frequently asked questions
            </h2>
            <p className="mt-3 text-sm md:text-base leading-7 text-muted-foreground">
              Clear answers on fares, payments, Umrah, visas and support — so you know exactly what to
              expect before you pay.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild className="rounded-xl gradient-primary font-semibold text-primary-foreground">
                <Link to="/contact">
                  Ask our team <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl font-semibold">
                <a href={`tel:${SUPPORT_PHONE_TEL}`}>{SUPPORT_PHONE_DISPLAY}</a>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              More detail in our{" "}
              <Link to="/faq" className="font-semibold text-primary hover:underline">
                Help Center
              </Link>
              .
            </p>
          </div>

          <Accordion type="single" collapsible className="rounded-2xl border bg-card px-4 shadow-card sm:px-6">
            {faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`} className={i === faqs.length - 1 ? "border-b-0" : ""}>
                <AccordionTrigger className="text-left text-sm font-semibold text-foreground hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-7 text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
