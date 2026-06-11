import { Link } from "react-router-dom";
import { Plane, Hotel, Package, FileCheck, Map, GraduationCap, UsersRound, Shield, Headphones, Zap, Search, MousePointerClick, Compass } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/public/PageHeader";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { whatsappUrl } from "@/lib/site-config";

const services = [
  { icon: Plane, title: "Flight Booking", desc: "Search available domestic and international flight fares.", to: "/flights-search" },
  { icon: Hotel, title: "Hotel Booking", desc: "Search available hotel rates for your destination.", to: "/hotels-search" },
  { icon: Package, title: "Umrah Packages", desc: "Browse published Umrah packages with package details.", to: "/umrah-packages" },
  { icon: FileCheck, title: "Visit Visas", desc: "Travel visa assistance for available destinations.", to: "/visa-services" },
  { icon: GraduationCap, title: "Study Visas", desc: "Guidance for supported study visa applications.", to: "/visa-services" },
  { icon: Map, title: "Tours", desc: "Browse published domestic and international tours.", to: "/tour-packages" },
  { icon: UsersRound, title: "Group Ticketing", desc: "Live group ticket availability for regional sectors.", to: "/group-ticketing" },
];

const why = [
  { icon: Shield, title: "Booking Support", desc: "Assistance from search through ticketing." },
  { icon: Headphones, title: "Customer Support", desc: "Help with travel service inquiries." },
  { icon: Zap, title: "Travel Assistance", desc: "Support for flights, packages and travel services." },
  { icon: FileCheck, title: "Visa Assistance", desc: "Guidance for supported visa applications." },
];

const steps = [
  { icon: Search, title: "Search", desc: "Find flights, hotels and packages." },
  { icon: MousePointerClick, title: "Select", desc: "Choose the option that fits your journey." },
  { icon: Plane, title: "Book", desc: "Continue with the available booking flow." },
  { icon: Compass, title: "Travel", desc: "Keep your itinerary ready for your trip." },
];

export default function AboutPage() {
  return (
    <div>
      <PageHeader title="About Travelian" tagline="Your Trusted Travel Partner for Flights, Hotels, Umrah, Tours & Visas" />

      <section className="py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-4">Who We Are</h2>
          <p className="text-muted-foreground leading-relaxed">
            Travelian provides travel management services for flights, hotels, Umrah packages, guided tours and visa assistance.
            Our team helps travelers and agencies find available options and continue through the appropriate booking process.
          </p>
        </div>
      </section>

      <section className="py-14 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground">Our Services</h2>
            <p className="text-sm text-muted-foreground mt-2">Everything you need to plan, book and travel.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map(service => (
              <Link to={service.to} key={service.title}>
                <Card className="h-full hover:shadow-elevated transition-all border-0 shadow-card group">
                  <CardContent className="p-5">
                    <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <service.icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground">{service.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{service.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground">Why Choose Us</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {why.map(item => (
              <Card key={item.title} className="text-center border-0 shadow-card">
                <CardContent className="p-5">
                  <div className="h-11 w-11 rounded-xl bg-gold-light flex items-center justify-center mx-auto mb-3">
                    <item.icon className="h-5 w-5 text-gold" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground">How It Works</h2>
            <p className="text-sm text-muted-foreground mt-2">Search | Select | Book | Travel</p>
          </div>
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={step.title} className="text-center relative">
                <div className="h-14 w-14 rounded-full gradient-primary flex items-center justify-center mx-auto mb-3 text-primary-foreground">
                  <step.icon className="h-6 w-6" />
                </div>
                <p className="font-semibold text-foreground">{index + 1}. {step.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground">Ready to plan your next trip?</h2>
          <p className="text-muted-foreground mt-2">Talk to our experts or start searching now.</p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Link to="/contact"><Button variant="outline" className="rounded-lg">Contact Us</Button></Link>
            <Link to="/flights-search"><Button className="rounded-lg gradient-primary text-primary-foreground">Search Flights</Button></Link>
            <a href={whatsappUrl("Hello Travelian, I need help planning my next trip.")} target="_blank" rel="noreferrer">
              <Button variant="outline" className="rounded-lg gap-2"><WhatsAppIcon className="h-4 w-4" /> WhatsApp Support</Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
