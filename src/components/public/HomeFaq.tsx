import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    q: "How do I book a flight with Travelian?",
    a: "Search your route, compare available fare options, and contact our team through WhatsApp or support channels to confirm your booking.",
  },
  {
    q: "Are the fares shown on Travelian final?",
    a: "Fares are subject to availability and airline/supplier confirmation. Before payment or ticket issuance, our team confirms the latest fare, baggage, taxes, and booking conditions.",
  },
  {
    q: "Which payment methods can I use?",
    a: "Travelian supports secure payment options including bank transfer, online payment channels, and other approved payment methods where available.",
  },
  {
    q: "Can I talk to a real person before booking?",
    a: "Yes. You can contact a Travelian consultant on WhatsApp, phone, or email before confirming your booking.",
  },
  {
    q: "Do you help with Umrah packages and hotels?",
    a: "Yes. Travelian provides support for Umrah packages, hotels and flights.",
  },
  {
    q: "Do you work with travel agents and corporate clients?",
    a: "Yes. Travelian supports both B2C customers and B2B travel partners with travel booking services and support.",
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
    <section className="bg-muted/30 py-12 md:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-7 max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Frequently asked questions
          </h2>
        </div>

        <Accordion type="single" collapsible className="mx-auto max-w-4xl space-y-3">
          {faqs.map((f) => (
            <AccordionItem key={f.q} value={f.q} className="rounded-2xl border bg-card px-5 shadow-card">
              <AccordionTrigger className="text-left text-base font-bold text-foreground hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-7 text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
