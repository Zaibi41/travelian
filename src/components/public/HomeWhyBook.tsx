import { ShieldCheck, Wallet, Headphones, Layers, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const reasons = [
  {
    icon: Wallet,
    title: "Transparent fare guidance",
    desc: "Clear fare options with taxes and charges explained before you confirm anything.",
  },
  {
    icon: ShieldCheck,
    title: "Secure payment options",
    desc: "Pay through supported secure channels with a documented booking confirmation.",
  },
  {
    icon: Headphones,
    title: "Human travel support",
    desc: "Talk to a real Travelian consultant on WhatsApp, phone or email before and after booking.",
  },
  {
    icon: Layers,
    title: "Flights, Umrah, visas & hotels",
    desc: "One team for air tickets, Umrah groups, visit and study visas, hotels and tour packages.",
  },
  {
    icon: Building2,
    title: "B2B & B2C travel solutions",
    desc: "Serving individual travellers, families and corporates alongside partner travel agencies.",
  },
];

export function HomeWhyBook() {
  return (
    <section className="py-14 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-light px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-foreground">
            Why Travelian
          </span>
          <h2 className="mt-3 text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground">
            Why book with Travelian?
          </h2>
          <p className="mt-2 text-sm md:text-base leading-7 text-muted-foreground">
            A travel team that answers, explains your options and stays with you until the ticket,
            voucher or visa confirmation is in your hands.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((r) => (
            <Card
              key={r.title}
              className="group relative overflow-hidden border-0 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-hover"
            >
              <div className="absolute inset-x-0 top-0 h-0.5 gradient-gold opacity-0 transition-opacity group-hover:opacity-100" />
              <CardContent className="p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-soft text-teal ring-1 ring-teal/15">
                  <r.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold font-display text-foreground">{r.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{r.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
