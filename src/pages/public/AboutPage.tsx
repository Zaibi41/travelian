import { SEO } from "@/components/SEO";
import { Link } from "react-router-dom";
import { Plane, Hotel, Package, Shield, Headphones, Zap, Search, MousePointerClick, Compass, Tickets } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchPageHero, PageSection } from "@/components/public/SearchPageShell";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { whatsappUrl } from "@/lib/site-config";
import { useSiteSwitches } from "@/lib/site-switches";

const services = [
  { icon: Plane, title: "Flight Booking", desc: "Search available domestic and international flight fares.", to: "/flights-search" },
  { icon: Tickets, title: "Group Ticketing", desc: "Explore available group flight inventory and travel dates.", to: "/group-ticketing" },
  { icon: Hotel, title: "Hotel Booking", desc: "Search available hotel rates for your destination.", to: "/hotels-search" },
  { icon: Package, title: "Umrah Packages", desc: "Browse published Umrah packages with package details.", to: "/umrah-packages", umrah: true },
];

const why = [
  { icon: Shield, title: "Booking Support", desc: "Assistance from search through ticketing." },
  { icon: Headphones, title: "Customer Support", desc: "Help with travel service inquiries." },
  { icon: Zap, title: "Travel Assistance", desc: "Support for flights, hotels and Umrah packages.", noUmrah: "Support for flights, hotels and group travel." },
];

const steps = [
  { icon: Search, title: "Search", desc: "Find flights, hotels and packages." },
  { icon: MousePointerClick, title: "Select", desc: "Choose the option that fits your journey." },
  { icon: Plane, title: "Book", desc: "Continue with the available booking flow." },
  { icon: Compass, title: "Travel", desc: "Keep your itinerary ready for your trip." },
];

export default function AboutPage() {
  const { umrah } = useSiteSwitches(); // D39: Umrah wording only when Umrah is switched on
  return (
    <div>
      <SEO title={umrah ? "About Travelian | Flights, Hotels & Umrah" : "About Travelian | Flights & Hotels"}
        description={umrah ? "Learn about Travelian and our support for flight bookings, group ticketing, hotels and Umrah travel." : "Learn about Travelian and our support for flight bookings, group ticketing and hotels."} />
      <SearchPageHero title="About Travelian" description={umrah ? "Building a modern travel platform for flights, hotels, Umrah and group travel." : "Building a modern travel platform for flights, hotels and group travel."} />

      <PageSection>
          <h2 className="text-xl md:text-2xl font-bold font-display text-foreground mb-4">Who We Are</h2>
          <p className="max-w-3xl text-sm text-muted-foreground leading-7">
            {umrah ? "Travelian provides travel management services for flights, hotels and Umrah packages." : "Travelian provides travel management services for flights, group tickets and hotels."}{" "}
            Our team helps travelers and agencies find available options and continue through the appropriate booking process.
          </p>
      </PageSection>

      <PageSection className="bg-muted/30">
          <div className="text-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">Our Services</h2>
            <p className="text-sm text-muted-foreground mt-2">Everything you need to plan, book and travel.</p>
          </div>
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${umrah ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-4`}>
            {services.filter(service => umrah || !("umrah" in service)).map(service => (
              <Link to={service.to} key={service.title}>
                <Card className="h-full rounded-xl border-border/70 shadow-card transition-shadow hover:shadow-md group">
                  <CardContent className="p-5">
                    <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center mb-3 ">
                      <service.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">{service.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{service.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
      </PageSection>

      <PageSection>
          <div className="text-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">Why Choose Us</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {why.map(item => ("noUmrah" in item && !umrah ? { ...item, desc: item.noUmrah } : item)).map(item => (
              <Card key={item.title} className="rounded-xl border-border/70 text-center shadow-card">
                <CardContent className="p-5">
                  <div className="h-11 w-11 rounded-xl bg-accent flex items-center justify-center mx-auto mb-3">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
      </PageSection>

      <PageSection className="bg-muted/30">
          <div className="text-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">How It Works</h2>
            <p className="text-sm text-muted-foreground mt-2">Search | Select | Book | Travel</p>
          </div>
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={step.title} className="text-center relative">
                <div className="h-14 w-14 rounded-lg bg-accent flex items-center justify-center mx-auto mb-3 text-primary">
                  <step.icon className="h-6 w-6" />
                </div>
                <p className="font-semibold text-foreground">{index + 1}. {step.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
              </div>
            ))}
          </div>
      </PageSection>

      <PageSection>
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">Ready to plan your next trip?</h2>
            <p className="text-muted-foreground mt-2">Talk to our experts or start searching now.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Button asChild variant="outline" className="h-12 rounded-xl px-5"><Link to="/contact">Contact Us</Link></Button>
            <Button asChild className="h-12 rounded-xl bg-primary px-5 text-primary-foreground"><Link to="/flights-search">Search Flights</Link></Button>
            <Button asChild variant="outline" className="h-12 rounded-xl px-5 gap-2">
              <a href={whatsappUrl("Hello Travelian, I need help planning my next trip.")} target="_blank" rel="noreferrer"><WhatsAppIcon className="h-4 w-4 text-whatsapp" aria-hidden="true" /> WhatsApp Support</a>
            </Button>
          </div>
      </PageSection>
    </div>
  );
}
