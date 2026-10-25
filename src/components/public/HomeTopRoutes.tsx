import { ArrowRight, Plane } from "lucide-react";
import { Link } from "react-router-dom";

const routes = [
  { from: "Lahore", to: "Dubai", code: "LHE -> DXB", href: "/flights-search?from=LHE&to=DXB", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=520&h=360&fit=crop&q=80" },
  { from: "Lahore", to: "Jeddah", code: "LHE -> JED", href: "/flights-search?from=LHE&to=JED", image: "https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=520&h=360&fit=crop&q=80" },
  { from: "Lahore", to: "Dammam", code: "LHE -> DMM", href: "/flights-search?from=LHE&to=DMM", image: "https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=520&h=360&fit=crop&q=80" },
  { from: "Lahore", to: "Istanbul", code: "LHE -> IST", href: "/flights-search?from=LHE&to=IST", image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=520&h=360&fit=crop&q=80" },
  { from: "Lahore", to: "Riyadh", code: "LHE -> RUH", href: "/flights-search?from=LHE&to=RUH", image: "https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=520&h=360&fit=crop&q=80" },
  { from: "Sialkot", to: "Muscat", code: "SKT -> MCT", href: "/flights-search?from=SKT&to=MCT", image: "https://images.unsplash.com/photo-1546412414-e1885259563a?w=520&h=360&fit=crop&q=80" },
  { from: "Sialkot", to: "Doha", code: "SKT -> DOH", href: "/flights-search?from=SKT&to=DOH", image: "https://images.unsplash.com/photo-1533069027836-fa937181a8ce?w=520&h=360&fit=crop&q=80" },
  { from: "Sialkot", to: "Madinah", code: "SKT -> MED", href: "/flights-search?from=SKT&to=MED", image: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=520&h=360&fit=crop&q=80" },
  { from: "Karachi", to: "Dubai", code: "KHI -> DXB", href: "/flights-search?from=KHI&to=DXB", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=520&h=360&fit=crop&q=80" },
  { from: "Islamabad", to: "Jeddah", code: "ISB -> JED", href: "/flights-search?from=ISB&to=JED", image: "https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=520&h=360&fit=crop&q=80" },
];

const loopRoutes = [...routes, ...routes];

export function HomeTopRoutes() {
  return (
    <section className="overflow-hidden bg-muted/30 py-12 md:py-14">
      <div className="travelian-container ">
        <div className="mb-6 max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Top Searched Destinations from Pakistan</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Explore popular flight routes for Gulf travel, Umrah, holidays and business trips.
          </p>
        </div>
      </div>

      <div className="travelian-container group flex overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-4 motion-safe:animate-route-marquee group-hover:[animation-play-state:paused]">
          {loopRoutes.map((route, index) => (
            <Link
              key={`${route.code}-${index}`}
              to={route.href}
              className="group/card w-[16rem] shrink-0 overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-border transition-all hover:-translate-y-0.5 hover:shadow-hover"
            >
              <div className="relative h-32 overflow-hidden bg-muted">
                <img src={route.image} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  Popular route
                </span>
              </div>
              <div className="p-4">
                <h3 className="truncate text-base font-bold text-foreground">{route.from} to {route.to}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Plane className="h-3.5 w-3.5 text-teal" /> {route.code}
                </p>
                <span className="mt-3 inline-flex items-center text-sm font-semibold text-primary">
                  Search flights <ArrowRight className="ml-1 h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
