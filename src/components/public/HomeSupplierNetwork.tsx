import { Network, Plane, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

type Supplier = { name: string; kind: string };

const suppliers: Supplier[] = [
  { name: "Amadeus", kind: "GDS" },
  { name: "Sabre", kind: "GDS" },
  { name: "Travelport", kind: "GDS" },
  { name: "NDC", kind: "Airline Content" },
  { name: "PIA", kind: "Airline" },
  { name: "AirSial", kind: "Airline" },
  { name: "Fly Jinnah", kind: "LCC" },
  { name: "AirBlue", kind: "Airline" },
  { name: "Duffel", kind: "NDC / API" },
  { name: "Mystifly", kind: "Aggregator" },
  { name: "Multiple Airlines", kind: "Airline Network" },
  { name: "LCCs", kind: "Low Cost Carriers" },
];

const badges = ["GDS", "NDC", "Airline APIs", "LCCs", "Aggregator"];

function initials(name: string) {
  const words = name.split(/[\s/]+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function HomeSupplierNetwork() {
  return (
    <section className="relative isolate overflow-hidden gradient-hero py-16 md:py-20">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary/30 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-teal/20 blur-3xl" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gold ring-1 ring-white/15">
              <Network className="h-3 w-3" /> Travel technology
            </span>
            <h2 className="mt-4 text-2xl md:text-3xl font-bold font-display tracking-tight text-primary-foreground">
              Connected Supplier Network
            </h2>
            <p className="mt-3 max-w-lg text-sm md:text-base leading-7 text-primary-foreground/75">
              Integrated GDS, airline, NDC and LCC connectivity for wider fare options and reliable
              booking support.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {badges.map((b) => (
                <span
                  key={b}
                  className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground/85 ring-1 ring-white/10"
                >
                  {b}
                </span>
              ))}
            </div>

            <p className="mt-6 flex items-start gap-2 text-xs leading-6 text-primary-foreground/60">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
              Fare and availability depend on live supplier response and contracted access. Our team
              confirms every option before ticketing.
            </p>

            <Button asChild className="mt-6 rounded-xl bg-gold font-semibold text-gold-foreground hover:bg-gold/90">
              <Link to="/contact">
                Talk to our team <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {suppliers.map((s) => (
              <div
                key={s.name}
                className="group rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.12] hover:ring-white/25"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[11px] font-black tracking-tight text-gold ring-1 ring-white/10">
                    {initials(s.name)}
                  </span>
                  <Plane className="h-3.5 w-3.5 shrink-0 text-primary-foreground/25 transition-colors group-hover:text-teal" />
                </div>
                <p className="mt-3 truncate text-sm font-bold text-primary-foreground">{s.name}</p>
                <p className="mt-0.5 truncate text-[11px] uppercase tracking-wide text-primary-foreground/55">
                  {s.kind}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
