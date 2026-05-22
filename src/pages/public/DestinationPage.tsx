import { Link, useParams } from "react-router-dom";
import { ArrowRight, Hotel, MapPin, Plane, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";

const destinationMap: Record<string, {
  name: string;
  country: string;
  image: string;
  summary: string;
  highlights: string[];
}> = {
  makkah: {
    name: "Makkah",
    country: "Saudi Arabia",
    image: "https://images.unsplash.com/photo-1565330770968-0240c0046ce3?w=1400&h=720&fit=crop&q=80",
    summary: "Plan Umrah stays near Masjid al-Haram with verified hotels, transfers, and visa support.",
    highlights: ["Haram area hotels", "Umrah packages", "Private transfers"],
  },
  madinah: {
    name: "Madinah",
    country: "Saudi Arabia",
    image: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1400&h=720&fit=crop&q=80",
    summary: "Find peaceful Madinah stays close to Masjid an-Nabawi with guided support from Travelian.",
    highlights: ["Central area hotels", "Ziyarat support", "Family rooms"],
  },
  istanbul: {
    name: "Istanbul",
    country: "Turkey",
    image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1400&h=720&fit=crop&q=80",
    summary: "Explore Istanbul tours, Bosphorus stays, and curated Turkey holiday packages.",
    highlights: ["City tours", "Bosphorus stays", "Family holidays"],
  },
  dubai: {
    name: "Dubai",
    country: "UAE",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1400&h=720&fit=crop&q=80",
    summary: "Book Dubai hotels, visas, desert safari add-ons, and premium city experiences.",
    highlights: ["UAE visas", "Luxury hotels", "Desert safari"],
  },
  "kuala-lumpur": {
    name: "Kuala Lumpur",
    country: "Malaysia",
    image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1400&h=720&fit=crop&q=80",
    summary: "Discover Malaysia hotels, city tours, and family-friendly Kuala Lumpur packages.",
    highlights: ["City hotels", "Theme parks", "Malaysia visas"],
  },
  cairo: {
    name: "Cairo",
    country: "Egypt",
    image: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=1400&h=720&fit=crop&q=80",
    summary: "Plan Cairo and Nile heritage trips with hotels, tours, and guided sightseeing.",
    highlights: ["Pyramids tours", "Nile stays", "Guided itineraries"],
  },
};

export default function DestinationPage() {
  const { slug = "makkah" } = useParams();
  const destination = destinationMap[slug] || destinationMap.makkah;

  return (
    <div>
      <SEO title={`${destination.name}, ${destination.country} | Travelian`} description={destination.summary} />
      <section className="relative min-h-[420px] overflow-hidden">
        <img src={destination.image} alt={destination.name} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[420px] flex items-end pb-12">
          <div className="max-w-2xl text-white">
            <Badge className="mb-4 bg-white/20 text-white border-white/20">Travelian Destination</Badge>
            <h1 className="text-4xl md:text-6xl font-extrabold font-display">{destination.name}</h1>
            <p className="mt-2 text-lg text-white/80 flex items-center gap-2"><MapPin className="h-5 w-5" /> {destination.country}</p>
            <p className="mt-5 text-base md:text-lg text-white/85 leading-relaxed">{destination.summary}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button className="gradient-primary text-primary-foreground rounded-xl" asChild>
                <Link to={`/hotels-search?destination=${encodeURIComponent(destination.name)}`}>Find Hotels <ArrowRight className="h-4 w-4 ml-2" /></Link>
              </Button>
              <Button variant="outline" className="rounded-xl bg-white text-primary hover:bg-white/90" asChild>
                <Link to="/contact">Ask Travelian</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-5 md:grid-cols-3">
          {destination.highlights.map((highlight, index) => {
            const Icon = index === 0 ? Hotel : index === 1 ? Plane : Star;
            return (
              <Card key={highlight} className="border-0 shadow-card">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{highlight}</p>
                    <p className="text-sm text-muted-foreground">Available through Travelian support</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
