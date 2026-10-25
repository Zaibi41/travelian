import { Headphones, ShieldCheck, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const reasons = [
  {
    icon: Wallet,
    title: "Transparent Fares",
    desc: "Clear fare options, taxes, baggage, and booking conditions explained before you confirm.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Payments",
    desc: "Pay through supported secure channels and receive documented booking confirmation.",
  },
  {
    icon: Headphones,
    title: "Human Support",
    desc: "Talk to a real Travelian consultant on WhatsApp, phone, or email before and after booking.",
  },
];

export function HomeWhyBook() {
  return (
    <section className="py-10 md:pt-6 md:pb-10">
      <div className="travelian-container ">
        <div className="max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground">
            Why book with Travelian?
          </h2>
          <p className="mt-2 text-sm md:text-base leading-7 text-muted-foreground">
            Simple travel booking with clear fares, secure payments, and real human support from search to confirmation.
          </p>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {reasons.map((r) => (
            <Card
              key={r.title}
              className="group relative overflow-hidden border-0 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-hover"
            >
              <div className="absolute inset-x-0 top-0 h-0.5 gradient-gold opacity-0 transition-opacity group-hover:opacity-100" />
              <CardContent className="p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-soft text-teal ring-1 ring-teal/15">
                  <r.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-base font-bold font-display text-foreground">{r.title}</h3>
                <p className="mt-1.5 text-sm leading-5 text-muted-foreground">{r.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
