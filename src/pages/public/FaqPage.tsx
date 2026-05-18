import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageHeader } from "@/components/public/PageHeader";

const faqs = [
  { q: "How do I book a flight on Travelian?", a: "Use our flight search on the homepage, pick a fare, fill in traveler details, and pay securely. Your e-ticket is issued instantly." },
  { q: "Can I cancel or change my booking?", a: "Yes, most fares allow free cancellation within 24 hours. Specific rules depend on the airline or hotel policy shown at checkout." },
  { q: "Do you offer Umrah packages with visa?", a: "Yes. Our Umrah packages include flight, hotel, transport and Umrah visa processing." },
  { q: "What payment methods do you accept?", a: "Visa, Mastercard, Amex, PayPal, bank transfer, and Travelian Wallet." },
  { q: "Is Travelian safe to use?", a: "All transactions are 256-bit SSL encrypted. We are a verified travel platform with 24/7 customer support." },
  { q: "How do I contact support?", a: "Email travelian.pk@gmail.com, call +92 324 4440014 or message us on WhatsApp." },
];

export default function FaqPage() {
  return (
    <div>
      <PageHeader title="Help Center / FAQ" tagline="Answers to the most common questions" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, i) => (
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
