import { ArrowRight, BadgeCheck, Headphones, Network, Rocket, ShieldCheck, TicketCheck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const capabilities = ["Live Ticketing", "Airline APIs", "NDC", "LCCs", "Aggregators", "Group Ticketing"];

const benefits = [
  {
    icon: TicketCheck,
    title: "Wider Fare Options",
    desc: "Search live fares, special fares, and supplier fare options in one place.",
  },
  {
    icon: UsersRound,
    title: "Group Ticketing Connectivity",
    desc: "Access limited-seat group fares and special inventory from connected sources.",
  },
  {
    icon: Headphones,
    title: "Reliable Booking Support",
    desc: "Availability and fare confirmation depend on live response and booking rules.",
  },
  {
    icon: Rocket,
    title: "Built for Growth",
    desc: "Travelian can connect additional flight, hotel, and travel sources as the platform expands.",
  },
];

export function HomeSupplierNetwork() {
  return (
    <section className="relative isolate overflow-hidden gradient-hero py-12 md:py-16">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, hsl(0 0% 100%) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-white/15" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm sm:p-7 lg:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gold ring-1 ring-white/15">
                <Network className="h-3 w-3" /> Travel technology
              </span>
              <h2 className="mt-4 text-2xl font-bold font-display tracking-tight text-white md:text-3xl">
                Connected Supplier Network
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 md:text-base md:leading-7">
                Travelian connects live ticketing, airline APIs, NDC, LCCs, aggregators, and group
                ticketing sources to provide wider fare options and reliable booking support.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              {capabilities.map((capability) => (
                <span
                  key={capability}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-white/12"
                >
                  <BadgeCheck className="h-3.5 w-3.5 text-teal" />
                  {capability}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-2xl border border-white/10 bg-white/[0.075] p-4 shadow-sm transition-colors hover:bg-white/[0.105]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/15 ring-1 ring-teal/25">
                  <benefit.icon className="h-5 w-5 text-teal" />
                </div>
                <h3 className="mt-4 text-sm font-bold text-white">{benefit.title}</h3>
                <p className="mt-2 text-xs leading-5 text-white/70">{benefit.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-col gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center">
            <Button asChild size="sm" className="w-full rounded-xl bg-gold font-semibold text-gold-foreground hover:bg-gold/90 sm:w-auto">
              <Link to="/contact">
                Talk to our team <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>

            <p className="flex items-start gap-2 text-xs leading-6 text-white/65">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
              Fare and availability depend on live supplier response and contracted access.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
