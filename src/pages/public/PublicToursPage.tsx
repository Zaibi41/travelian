import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Map } from "lucide-react";
import { Link } from "react-router-dom";
import { mockTourPackages } from "@/data/mock";
import { PageHeader } from "@/components/public/PageHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const categories = [
  { name: "Cultural Tours", to: "/tour-packages?cat=cultural" },
  { name: "Beach Holidays", to: "/tour-packages?cat=beach" },
  { name: "Adventure", to: "/tour-packages?cat=adventure" },
  { name: "Family Tours", to: "/tour-packages?cat=family" },
  { name: "Honeymoon", to: "/tour-packages?cat=honeymoon" },
  { name: "City Breaks", to: "/tour-packages?cat=city" },
];

const destinations = [
  { name: "Turkey", image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600&h=400&fit=crop" },
  { name: "UAE", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=400&fit=crop" },
  { name: "Malaysia", image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=600&h=400&fit=crop" },
  { name: "Egypt", image: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=600&h=400&fit=crop" },
];

const faqs = [
  { q: "Are flights included in tour packages?", a: "Most tours include flights, hotels, transfers and guided sightseeing. Specifics are listed on each package." },
  { q: "Can I travel solo?", a: "Yes. Solo travelers are welcome — single supplements may apply." },
  { q: "Are tours customizable?", a: "Yes, we can tailor any tour to your dates, hotel preference and activities." },
];

export default function PublicToursPage() {
  const tours = mockTourPackages.filter(t => t.status === 'active');

  return (
    <div>
      <PageHeader title="Tour Packages" tagline="Explore the world with hand-picked travel tours" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Categories */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">Tour Categories</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <Link key={c.name} to={c.to}>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent text-sm py-1.5 px-3">{c.name}</Badge>
              </Link>
            ))}
          </div>
        </section>

        {/* Destinations */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">Top Destinations</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {destinations.map(d => (
              <Link to="/tour-packages" key={d.name} className="group">
                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-card">
                  <img src={d.image} alt={d.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                  <p className="absolute bottom-3 left-3 text-primary-foreground font-bold">{d.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured tours */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">Featured Tours</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tours.map(tour => (
              <Card key={tour.packageId} className="overflow-hidden hover:shadow-elevated transition-all group">
                <div className="relative h-52 overflow-hidden bg-muted">
                  {tour.image ? (
                    <img src={tour.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-info/20 to-accent">
                      <Map className="h-16 w-16 text-info/30" />
                    </div>
                  )}
                </div>
                <CardContent className="p-5">
                  <h3 className="text-lg font-semibold text-foreground">{tour.name}</h3>
                  <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {tour.city}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {tour.duration}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{tour.description}</p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div>
                      <span className="text-xs text-muted-foreground">From</span>
                      <p className="text-2xl font-bold text-primary">${tour.basePrice}</p>
                    </div>
                    <Link to={`/contact?type=tour&id=${tour.packageId}`}>
                      <Button className="gradient-primary text-primary-foreground">Book Now</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4 text-center">Traveler Stories</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { n: "Hassan T.", t: "Cappadocia tour was magical. Travelian handled every detail." },
              { n: "Maria S.", t: "Best family vacation we've ever had — Dubai was amazing." },
              { n: "Omar A.", t: "Great value. Hotels and guides were top-class." },
            ].map(t => (
              <Card key={t.n} className="border-0 shadow-card"><CardContent className="p-5">
                <div className="text-gold mb-2">★★★★★</div>
                <p className="text-sm text-muted-foreground italic">"{t.t}"</p>
                <p className="text-sm font-semibold text-foreground mt-3">{t.n}</p>
              </CardContent></Card>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto">
          <h2 className="text-lg font-bold text-foreground mb-4 text-center">FAQs</h2>
          <Accordion type="single" collapsible>
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`f-${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </div>
    </div>
  );
}
