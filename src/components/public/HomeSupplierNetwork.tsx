import { Network, ShieldCheck, ArrowRight, Plane, Globe2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

type Supplier = {
  name: string;
  mark: string;
  kind: string;
  accent?: "gold" | "teal";
  icon?: typeof Plane;
};

const suppliers: Supplier[] = [
  { name: "Amadeus", mark: "amadeus", kind: "GDS", accent: "teal" },
  { name: "Sabre", mark: "SABRE", kind: "GDS", accent: "teal" },
  { name: "Travelport", mark: "Travelport", kind: "GDS", accent: "teal" },
  { name: "NDC", mark: "NDC", kind: "Airline Content", accent: "gold" },
  { name: "PIA", mark: "PIA", kind: "Airline" },
  { name: "AirSial", mark: "AirSial", kind: "Airline" },
  { name: "Fly Jinnah", mark: "flyjinnah", kind: "LCC", accent: "gold" },
  { name: "AirBlue", mark: "airblue", kind: "Airline" },
  { name: "Duffel", mark: "Duffel", kind: "NDC / API", accent: "gold" },
  { name: "Mystifly", mark: "Mystifly", kind: "Aggregator", accent: "teal" },
  { name: "Multiple Airlines", mark: "", kind: "Airline Network", icon: Globe2, accent: "teal" },
  { name: "LCCs", mark: "", kind: "Low Cost Carriers", icon: Layers, accent: "gold" },
];

const badges = ["GDS", "NDC", "Airline APIs", "LCCs", "Aggregator"];

export function HomeSupplierNetwork() {
  return (
    <section className="relative isolate overflow-hidden gradient-hero py-12 md:py-14">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, hsl(0 0% 100%) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-teal/20 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gold ring-1 ring-white/15">
              <Network className="h-3 w-3" /> Travel technology
            </span>
            <h2 className="mt-3 text-xl md:text-2xl font-bold font-display tracking-tight text-primary-foreground">
              Connected Supplier Network
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-primary-foreground/75">
              Integrated GDS, airline, NDC and LCC connectivity for wider fare options and reliable
              booking support.
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {badges.map((b) => (
                <span
                  key={b}
                  className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground/85 ring-1 ring-white/10"
                >
                  {b}
                </span>
              ))}
            </div>

            <p className="mt-4 flex items-start gap-2 text-xs leading-6 text-primary-foreground/60">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
              Fare and availability depend on live supplier response and contracted access.
            </p>

            <Button asChild size="sm" className="mt-4 rounded-xl bg-gold font-semibold text-gold-foreground hover:bg-gold/90">
              <Link to="/contact">
                Talk to our team <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {suppliers.map((s) => {
              const accentText = s.accent === "gold" ? "text-gold" : "text-teal";
              return (
                <div
                  key={s.name}
                  className="group flex flex-col justify-between rounded-xl bg-white/[0.07] p-3 ring-1 ring-white/10 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.12] hover:ring-white/25"
                >
                  {/* Brand-mark plate */}
                  <div className="flex h-10 items-center justify-center rounded-lg bg-white/95 px-2 shadow-sm">
                    {s.icon ? (
                      <s.icon className="h-5 w-5 text-primary" />
                    ) : (
                      <span className="truncate text-[13px] font-black tracking-tight text-primary">
                        {s.mark}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 truncate text-xs font-bold text-primary-foreground">{s.name}</p>
                  <span
                    className={`mt-1 inline-flex max-w-full items-center rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ring-white/10 ${accentText}`}
                  >
                    <span className="truncate">{s.kind}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
