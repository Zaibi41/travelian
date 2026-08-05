import { Link } from "react-router-dom";
import { LayoutDashboard, Wallet, Ticket, BarChart3, Headphones, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const capabilities = [
  { icon: LayoutDashboard, title: "Agent dashboard", desc: "A dedicated workspace for your agency bookings and staff." },
  { icon: Wallet, title: "Wallet & payments", desc: "Top up, track balance and settle bookings from one ledger." },
  { icon: Ticket, title: "Flight search & ticketing", desc: "Search multiple suppliers and issue tickets for your clients." },
  { icon: BarChart3, title: "Reports & booking management", desc: "Sales, booking and passenger reports in one place." },
  { icon: Headphones, title: "B2B support", desc: "A named support channel for urgent changes and escalations." },
];

export function HomeB2B() {
  return (
    <section className="py-14 md:py-16 bg-muted/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-light px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-foreground">
              For travel agencies
            </span>
            <h2 className="mt-3 text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground">
              B2B travel agent solutions
            </h2>
            <p className="mt-3 max-w-lg text-sm md:text-base leading-7 text-muted-foreground">
              Travelian supports travel agents with flight search, booking tools, wallet and payment
              options, reporting, and agency management features.
            </p>
            <Button asChild className="mt-6 rounded-xl font-semibold">
              <Link to="/register">
                Become a Travel Partner <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {capabilities.map((c) => (
              <div
                key={c.title}
                className="flex gap-3 rounded-2xl border bg-card p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-hover"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-soft text-teal ring-1 ring-teal/15">
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground">{c.title}</h3>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
