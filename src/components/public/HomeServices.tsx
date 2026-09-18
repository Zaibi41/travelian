import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const services = [
  {
    title: "Flights",
    desc: "Domestic and international air tickets with fare options compared for you.",
    cta: "Search Flights",
    to: "/",
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=560&fit=crop&q=80",
  },
  {
    title: "Umrah Packages",
    desc: "Complete Umrah travel support with flights, hotels, transport and guidance.",
    cta: "View Umrah Packages",
    to: "/umrah-packages",
    image: "https://images.unsplash.com/photo-1565330770968-0240c0046ce3?w=800&h=560&fit=crop&q=80",
  },
  {
    title: "Hotels & Accommodation",
    desc: "Stays near Haram, city hotels and family accommodation across popular destinations.",
    cta: "Find Hotels",
    to: "/hotels-search",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=560&fit=crop&q=80",
  },
];

export function HomeServices() {
  return (
    <section className="py-14 md:py-16 bg-muted/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-accent-foreground">
            Our services
          </span>
          <h2 className="mt-3 text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground">
            Everything you need for the whole journey
          </h2>
          <p className="mt-2 text-sm md:text-base leading-7 text-muted-foreground">
            Choose a service and our team will guide you through the available options.
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <article
              key={s.title}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border-0 bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-hover"
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src={s.image}
                  alt={s.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-sidebar/80 via-sidebar/10 to-transparent" />
                <h3 className="absolute bottom-3 left-4 right-4 text-lg font-bold font-display text-primary-foreground">
                  {s.title}
                </h3>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-sm leading-6 text-muted-foreground">{s.desc}</p>
                <Button asChild variant="outline" className="mt-4 w-full rounded-xl font-semibold group-hover:border-primary/40 group-hover:text-primary">
                  <Link to={s.to}>
                    {s.cta} <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
