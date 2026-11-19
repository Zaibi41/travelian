import { ArrowRight, BadgeCheck, CreditCard, Hotel, Network, Plane, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const capabilities = ["GDS", "NDC", "Airline APIs", "LCCs", "Hotel Suppliers", "Payment Gateways"];

const categories = [
  { icon: Network, title: "GDS", text: "Global distribution and ticketing connectivity." },
  { icon: Plane, title: "Airline APIs", text: "Airline and low-cost carrier fare access." },
  { icon: Hotel, title: "Hotel Suppliers", text: "Hotel source support for packaged trips." },
  { icon: CreditCard, title: "Secure Payment Network", text: "Payment gateway and online payment support for customer bookings." },
];

export function HomeSupplierNetwork() {
  return (
    <section className="relative isolate overflow-hidden gradient-hero py-6 md:py-8">
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

      <div className="travelian-container relative">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur-sm sm:p-5 lg:p-6">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
            <div>
              <h2 className="text-2xl font-bold font-display tracking-tight text-white md:text-3xl">
                Connected Supplier Network
              </h2>
            </div>

          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <div key={category.title} className="rounded-2xl border border-white/10 bg-white/[0.065] p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal/15 text-teal ring-1 ring-teal/20">
                    <category.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-white">{category.title}</h3>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-white">{category.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-4 border-t border-white/10 pt-4 sm:flex-row sm:items-center">
            <Button asChild size="sm" className="w-full rounded-xl bg-gold font-semibold text-gold-foreground hover:bg-gold/90 sm:w-auto">
              <Link to="/contact">
                Talk to our team <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>

            <p className="flex items-start gap-2 text-xs leading-6 text-white">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
              Fare and availability depend on live supplier response and contracted access.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
