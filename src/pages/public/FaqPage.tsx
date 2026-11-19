import { SEO } from "@/components/SEO";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageHeader } from "@/components/public/PageHeader";
import { useSiteSwitches } from "@/lib/site-switches";

const faqs = [
  { q: "How do I book a flight on Travelian?", a: "Use our flight search on the homepage, select an available fare, and continue with the available booking flow." },
  { q: "Can I cancel or change my booking?", a: "Cancellation and change rules depend on the selected airline, hotel or package policy. Confirm the applicable terms before booking." },
  { umrah: true, q: "Do you offer Umrah packages with visa?", a: "Published Umrah packages show the services included in each package. Contact our team when you need a custom option." },
  { q: "What payment methods do you accept?", a: "Available payment methods are confirmed during the booking process. Contact our team if you need payment assistance." },
  { q: "How do I get booking support?", a: "Contact the Travelian team by phone, email or WhatsApp for booking assistance." },
  { q: "How do I contact support?", a: "Email travelian.pk@gmail.com, call +92 324 4440014 or message us on WhatsApp." },
];

export default function FaqPage() {
  const { umrah } = useSiteSwitches(); // D39: Umrah wording only when Umrah is switched on
  return (
    <div>
      <SEO title="Travel Help & Frequently Asked Questions | Travelian" description={`Find answers about booking flights, changing trips, ${umrah ? "Umrah packages, " : ""}payments and contacting Travelian support.`} />
      <PageHeader title="Help Center / FAQ" tagline="Answers to the most common questions" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Accordion type="single" collapsible className="w-full">
          {faqs.filter(f => umrah || !("umrah" in f)).map((f, i) => (
            <AccordionItem key={i} value={`i-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
