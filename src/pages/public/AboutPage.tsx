import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/public/PageHeader";
import { Plane, Hotel, Package, FileCheck, Map, GraduationCap, UsersRound, Shield, Headphones, Award, Zap, Search, MousePointerClick, CreditCard, Compass, MessageCircle } from "lucide-react";

const services = [
  { icon: Plane, title: "Flight Booking", desc: "Domestic & international flights at the best fares.", to: "/flights-search" },
  { icon: Hotel, title: "Hotel Booking", desc: "Verified hotels worldwide with free cancellation.", to: "/hotels-search" },
  { icon: Package, title: "Umrah Packages", desc: "Complete Umrah packages with visa & flights.", to: "/umrah-packages" },
  { icon: FileCheck, title: "Visit Visas", desc: "Hassle-free visit visa processing for 50+ countries.", to: "/visa-services" },
  { icon: GraduationCap, title: "Study Visas", desc: "Expert guidance for your study abroad journey.", to: "/visa-services" },
  { icon: Map, title: "Tours", desc: "Curated tours to top destinations around the world.", to: "/tour-packages" },
  { icon: UsersRound, title: "Group Booking", desc: "Special rates for groups of 10 or more.", to: "/contact?type=group" },
];

const why = [
  { icon: Award, title: "Best Prices", desc: "Best price guarantee on every booking." },
  { icon: Shield, title: "Secure Booking", desc: "256-bit SSL encrypted payments." },
  { icon: Headphones, title: "24/7 Support", desc: "Round the clock travel assistance." },
  { icon: Zap, title: "Trusted Experts", desc: "Over 15 years of travel industry experience." },
  { icon: FileCheck, title: "Fast Visa Assistance", desc: "Quick processing with high success rate." },
];

const steps = [
  { icon: Search, title: "Search", desc: "Find flights, hotels and packages." },
  { icon: MousePointerClick, title: "Select", desc: "Choose the option that fits you best." },
  { icon: CreditCard, title: "Book", desc: "Secure online payment in minutes." },
  { icon: Compass, title: "Travel", desc: "Enjoy your trip with 24/7 support." },
];

const testimonials = [
  { name: "Ayesha R.", trip: "Umrah · Makkah", text: "Travelian made our family Umrah seamless from visa to hotel. Truly a trusted partner.", rating: 5 },
  { name: "Bilal K.", trip: "Tour · Istanbul", text: "Got an unbeatable price on our Turkey tour. Customer service was outstanding.", rating: 5 },
  { name: "Sana M.", trip: "Visa · UK", text: "Visa was processed faster than expected. Will definitely book again.", rating: 5 },
];

function Counter({ to, suffix = "", duration = 1500 }: { to: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        const start = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / duration);
          setVal(Math.round(to * p));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

export default function AboutPage() {
  return (
    <div>
      <PageHeader title="About Travelian" tagline="Your Trusted Travel Partner for Flights, Hotels, Umrah, Tours & Visas" />

      {/* Who We Are */}
      <section className="py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-4">Who We Are</h2>
          <p className="text-muted-foreground leading-relaxed">
            Travelian is a leading travel management company with over 15 years of experience helping travelers across the world.
            We specialize in flights, hotels, Umrah packages, guided tours and visa services. Our customer-first approach,
            transparent pricing, and 24/7 support have earned us the trust of thousands of happy travelers.
          </p>
        </div>
      </section>

      {/* Services */}
      <section className="py-14 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground">Our Services</h2>
            <p className="text-sm text-muted-foreground mt-2">Everything you need to plan, book and travel.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map(s => (
              <Link to={s.to} key={s.title}>
                <Card className="h-full hover:shadow-elevated transition-all border-0 shadow-card group">
                  <CardContent className="p-5">
                    <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <s.icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground">{s.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground">Why Choose Us</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {why.map(w => (
              <Card key={w.title} className="text-center border-0 shadow-card">
                <CardContent className="p-5">
                  <div className="h-11 w-11 rounded-xl bg-gold-light flex items-center justify-center mx-auto mb-3">
                    <w.icon className="h-5 w-5 text-gold" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">{w.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{w.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-14 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground">How It Works</h2>
            <p className="text-sm text-muted-foreground mt-2">Search → Select → Book → Travel</p>
          </div>
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={s.title} className="text-center relative">
                <div className="h-14 w-14 rounded-full gradient-primary flex items-center justify-center mx-auto mb-3 text-primary-foreground">
                  <s.icon className="h-6 w-6" />
                </div>
                <p className="font-semibold text-foreground">{i + 1}. {s.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14 gradient-hero">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-primary-foreground">
            {[
              { v: 250000, s: "+", l: "Flights Booked" },
              { v: 120000, s: "+", l: "Happy Travelers" },
              { v: 90, s: "+", l: "Destinations" },
              { v: 98, s: "%", l: "Visa Success Rate" },
            ].map(s => (
              <div key={s.l}>
                <p className="text-3xl md:text-4xl font-extrabold font-display">
                  <Counter to={s.v} suffix={s.s} />
                </p>
                <p className="text-sm text-primary-foreground/80 mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground">What Our Travelers Say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map(t => (
              <Card key={t.name} className="border-0 shadow-card">
                <CardContent className="p-6">
                  <div className="flex gap-0.5 text-gold mb-3">{"★".repeat(t.rating)}</div>
                  <p className="text-sm text-muted-foreground italic">"{t.text}"</p>
                  <div className="mt-4 pt-4 border-t">
                    <p className="font-semibold text-foreground text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.trip}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground">Ready to plan your next trip?</h2>
          <p className="text-muted-foreground mt-2">Talk to our experts or start booking now.</p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Link to="/contact"><Button variant="outline" className="rounded-lg">Contact Us</Button></Link>
            <Link to="/flights-search"><Button className="rounded-lg gradient-primary text-primary-foreground">Book Flights</Button></Link>
            <a href="https://wa.me/923001234567" target="_blank" rel="noreferrer">
              <Button variant="outline" className="rounded-lg gap-2"><MessageCircle className="h-4 w-4" /> WhatsApp Support</Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
