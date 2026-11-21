import { addDays, startOfDay } from "date-fns";
import { formatDateOnly } from "@/lib/date-only";
import { ArrowRight, Plane } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";

const routes = [
  { from: "Lahore", to: "Dubai", code: "LHE -> DXB", href: "/flights-search?from=LHE&to=DXB" },
  { from: "Lahore", to: "Jeddah", code: "LHE -> JED", href: "/flights-search?from=LHE&to=JED" },
  { from: "Lahore", to: "Dammam", code: "LHE -> DMM", href: "/flights-search?from=LHE&to=DMM" },
  { from: "Lahore", to: "Istanbul", code: "LHE -> IST", href: "/flights-search?from=LHE&to=IST" },
  { from: "Lahore", to: "Riyadh", code: "LHE -> RUH", href: "/flights-search?from=LHE&to=RUH" },
  { from: "Sialkot", to: "Muscat", code: "SKT -> MCT", href: "/flights-search?from=SKT&to=MCT" },
  { from: "Sialkot", to: "Doha", code: "SKT -> DOH", href: "/flights-search?from=SKT&to=DOH" },
  { from: "Sialkot", to: "Madinah", code: "SKT -> MED", href: "/flights-search?from=SKT&to=MED" },
  { from: "Karachi", to: "Dubai", code: "KHI -> DXB", href: "/flights-search?from=KHI&to=DXB" },
  { from: "Islamabad", to: "Jeddah", code: "ISB -> JED", href: "/flights-search?from=ISB&to=JED" },
];

export function HomeTopRoutes() {
  const departureDate = formatDateOnly(addDays(startOfDay(new Date()), 1));
  return (
    <section aria-labelledby="popular-routes-heading" className="bg-muted/30 py-8 md:py-10">
      <div className="travelian-container">
        <div className="mb-5 max-w-2xl">
          <h2 id="popular-routes-heading" className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">Popular routes</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose a route to search flights and compare your options.</p>
        </div>
        <div className="grid auto-cols-[14rem] grid-flow-col gap-3 overflow-x-auto pb-2 md:auto-cols-auto md:grid-flow-row md:grid-cols-3 md:overflow-visible lg:grid-cols-5">
          {routes.map(route => <Card key={route.code} className="h-full rounded-xl border-border shadow-sm transition-colors hover:border-primary/40">
            <Link to={`${route.href}&depart=${departureDate}`} className="relative block h-full rounded-xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              <h3 className="truncate text-sm font-semibold text-foreground" title={`${route.from} to ${route.to}`}>{route.from} <span aria-hidden="true">→</span><span className="sr-only"> to </span>{route.to}</h3>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Plane aria-hidden="true" className="h-3.5 w-3.5" />{route.code.replace(" -> ", " → ")}</p>
              <span className="mt-4 inline-flex items-center text-xs font-semibold text-primary">Search Flights <ArrowRight aria-hidden="true" className="ml-1.5 h-3.5 w-3.5" /></span>
            </Link>
          </Card>)}
        </div>
      </div>
    </section>
  );
}
