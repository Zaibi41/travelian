import { SearchTabs } from "@/components/public/SearchTabs";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, ArrowRight, Shield, Headphones, TrendingUp, Heart, ChevronRight, Percent, Globe, Award, Hotel } from "lucide-react";
import { Link } from "react-router-dom";
import { getBlogImage } from "@/lib/blog-images";
import { PackageImage } from "@/components/public/PackageImage";
import { useAdmin } from "@/contexts/AdminStore";
import { isPublishedUmrahPackage } from "@/lib/package-availability";
import { useMemo } from "react";

const destinations = [
  { name: "Makkah", country: "Saudi Arabia", image: "https://images.unsplash.com/photo-1565330770968-0240c0046ce3?w=400&h=500&fit=crop&q=80", badge: "Popular", priceFrom: 165000 },
  { name: "Istanbul", country: "Turkey", image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=400&h=500&fit=crop", priceFrom: 89000 },
  { name: "Dubai", country: "UAE", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=500&fit=crop", badge: "Trending", priceFrom: 62000 },
  { name: "Kuala Lumpur", country: "Malaysia", image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=400&h=500&fit=crop", priceFrom: 118000 },
  { name: "Cairo", country: "Egypt", image: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=400&h=500&fit=crop", priceFrom: 132000 },
  { name: "Madinah", country: "Saudi Arabia", image: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=400&h=500&fit=crop&q=80", badge: "Holy City", priceFrom: 158000 },
];

const features = [
  { icon: TrendingUp, title: "1M+ trips booked", desc: "Trusted by travelers across Pakistan" },
  { icon: Star, title: "4.8 / 5 rating", desc: "From 12,400+ verified reviews" },
  { icon: Shield, title: "PCI-DSS secure", desc: "Bank-grade encryption on every payment" },
  { icon: Headphones, title: "24/7 human support", desc: "WhatsApp, phone and email support" },
];

const topCountries = [
  { country: "Saudi Arabia", popular: ["Makkah", "Madinah", "Riyadh", "Jeddah"], image: "https://images.unsplash.com/photo-1565330770968-0240c0046ce3?w=900&h=620&fit=crop&q=80", priceFrom: 158000, properties: 320 },
  { country: "Turkey", popular: ["Istanbul", "Antalya", "Cappadocia", "Bodrum"], image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=900&h=620&fit=crop&q=80", priceFrom: 89000, properties: 540 },
  { country: "UAE", popular: ["Dubai", "Abu Dhabi", "Sharjah", "Ras Al Khaimah"], image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=900&h=620&fit=crop&q=80", priceFrom: 62000, properties: 810 },
  { country: "Malaysia", popular: ["KL", "Langkawi", "Penang", "Johor Bahru"], image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=900&h=620&fit=crop&q=80", priceFrom: 118000, properties: 290 },
  { country: "Egypt", popular: ["Cairo", "Luxor", "Sharm El Sheikh", "Hurghada"], image: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=900&h=620&fit=crop&q=80", priceFrom: 132000, properties: 175 },
  { country: "Indonesia", popular: ["Bali", "Jakarta", "Yogyakarta", "Lombok"], image: "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=900&h=620&fit=crop&q=80", priceFrom: 142000, properties: 410 },
];

// Curated fallbacks shown when the CMS has no published items, so the home never
// renders an empty rail.
const fallbackHotels = [
  { hotelId: "fh1", name: "Pullman ZamZam Makkah", city: "Makkah", country: "Saudi Arabia", starRating: 5, pricePerNight: 38500, image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&h=520&fit=crop&q=80", amenities: ["Free WiFi", "Haram view", "Breakfast", "Airport shuttle"] },
  { hotelId: "fh2", name: "Atlantis The Palm", city: "Dubai", country: "UAE", starRating: 5, pricePerNight: 92000, image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=520&fit=crop&q=80", amenities: ["Beachfront", "Pool", "Aquaventure", "Family"] },
  { hotelId: "fh3", name: "Swissotel The Bosphorus", city: "Istanbul", country: "Turkey", starRating: 5, pricePerNight: 48500, image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=520&fit=crop&q=80", amenities: ["Bosphorus view", "Spa", "Breakfast", "Concierge"] },
];

const fallbackTours = [
  { packageId: "ft1", name: "Cappadocia Hot-Air Balloon Escape", city: "Cappadocia, Turkey", duration: "5 nights", basePrice: 215000, description: "Sunrise balloon ride, cave hotel stay and Goreme valley tour.", image: "https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?w=800&h=520&fit=crop&q=80" },
  { packageId: "ft2", name: "Dubai City Highlights & Desert Safari", city: "Dubai, UAE", duration: "4 nights", basePrice: 168000, description: "Burj Khalifa, Marina cruise, dune bashing and BBQ under the stars.", image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&h=520&fit=crop&q=80" },
  { packageId: "ft3", name: "Bali Beaches & Ubud Culture", city: "Bali, Indonesia", duration: "6 nights", basePrice: 245000, description: "Seminyak beaches, Ubud rice terraces and Tegallalang day tour.", image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&h=520&fit=crop&q=80" },
];

const fallbackBlogPosts = [
  { postId: "fb1", slug: "umrah-checklist-first-timers", title: "Umrah Checklist for First-Time Pilgrims", excerpt: "Documents, dress code, packing list and the rituals - everything you need before flying out.", category: "Umrah", author: "Travelian Team", publishedAt: "May 28, 2026", image: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800&h=520&fit=crop&q=80" },
  { postId: "fb2", slug: "best-time-to-visit-dubai", title: "Best Time to Visit Dubai (and Cheapest Months to Fly)", excerpt: "How to balance weather, fares and event calendars across the year.", category: "Dubai", author: "Travelian Team", publishedAt: "May 22, 2026", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=520&fit=crop&q=80" },
  { postId: "fb3", slug: "schengen-visa-pakistan-2026", title: "Schengen Visa from Pakistan in 2026: Step-by-Step", excerpt: "Required documents, embassy choice, and how to maximise approval odds.", category: "Visa", author: "Travelian Team", publishedAt: "May 14, 2026", image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=520&fit=crop&q=80" },
];

const fallbackDeals = [
  { id: "fd1", title: "Eid Sale - Dubai from PKR 62,000", subtitle: "PIA & flydubai direct", badge: "-25%", to: "/flights-search?from=LHE&to=DXB" },
  { id: "fd2", title: "Umrah Saver - 15 nights from PKR 245,000", subtitle: "5-star Makkah + Madinah", badge: "Limited", to: "/umrah-packages" },
  { id: "fd3", title: "Istanbul weekend from PKR 89,000", subtitle: "Turkish Airlines, 4 nights", badge: "Hot", to: "/flights-search?from=LHE&to=IST" },
  { id: "fd4", title: "Bali honeymoon - 6 nights from PKR 245,000", subtitle: "Private villa + transfers", badge: "Featured", to: "/tour-packages" },
];

const fallbackUmrah = [
  { packageId: "fu1", name: "15-Night Premium Umrah", description: "5★ Makkah Clock Tower + Pullman Madinah, direct Saudia flights.", basePrice: 298000, duration: "15 days", image: "https://images.unsplash.com/photo-1565330770968-0240c0046ce3?w=800&h=520&fit=crop&q=80", includes: ["Visa", "Air ticket", "5★ hotels", "Ziyarat", "Transport"] },
  { packageId: "fu2", name: "10-Night Economy Umrah", description: "Budget 3★ stays near Haram, weekend departures from Lahore.", basePrice: 178000, duration: "10 days", image: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800&h=520&fit=crop&q=80", includes: ["Visa", "Air ticket", "3★ hotels", "Ziyarat"] },
  { packageId: "fu3", name: "21-Night Family Umrah", description: "Family suites in Makkah + Madinah, includes meals.", basePrice: 365000, duration: "21 days", image: "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=800&h=520&fit=crop&q=80", includes: ["Visa", "Air ticket", "4★ hotels", "Meals", "Ziyarat"] },
  { packageId: "fu4", name: "7-Night Express Umrah", description: "Short itinerary for working professionals - quick turnaround.", basePrice: 145000, duration: "7 days", image: "https://images.unsplash.com/photo-1591129841117-3adfd313a592?w=800&h=520&fit=crop&q=80", includes: ["Visa", "Air ticket", "3-star hotels"] },
];

const reviewCards = [
  { name: "Ayesha Khan", trip: "Lahore to Dubai", quote: "Travelian found the right fare quickly and kept the whole booking calm.", rating: "4.9" },
  { name: "Bilal Travels", trip: "Agency Umrah group", quote: "The team handled changes, invoices and passenger follow-up without delays.", rating: "4.8" },
  { name: "Sana Malik", trip: "Family Turkey tour", quote: "Hotels, transfers and support were exactly what we expected.", rating: "5.0" },
];

const partnerNames = ["Travelport", "PIA", "AirSial", "flydubai", "Etihad", "Qatar Airways", "Fly Jinnah"];

function getRecentFlightSearches() {
  if (typeof window === "undefined") return [];
  const candidates: Array<{ from: string; to: string; depart?: string; travelers?: string }> = [];
  try {
    const raw = localStorage.getItem("travelian.recentFlightSearches") || localStorage.getItem("travelian_recent_searches");
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      parsed.slice(0, 4).forEach((item) => {
        if (item?.from && item?.to) {
          candidates.push({
            from: String(item.from).slice(0, 3).toUpperCase(),
            to: String(item.to).slice(0, 3).toUpperCase(),
            depart: item.depart || item.date,
            travelers: item.travelers,
          });
        }
      });
    }
  } catch {
    return [];
  }
  return candidates;
}

export default function HomePage() {
  const { hotels, packages, tourPackages, blogPosts } = useAdmin();
  const publishedUmrahPackages = packages.filter(isPublishedUmrahPackage);
  const activeHotels = hotels.filter(h => h.status === "active");
  const activeTours = tourPackages.filter(t => t.status === "active" && !t.deletedAt);
  const publishedBlogPosts = blogPosts.filter(b => b.status === "published");

  const displayHotels = activeHotels.length ? activeHotels : fallbackHotels;
  const displayTours = activeTours.length ? activeTours : fallbackTours;
  const displayBlog = publishedBlogPosts.length ? publishedBlogPosts : fallbackBlogPosts;
  const displayUmrah = publishedUmrahPackages.length ? publishedUmrahPackages : fallbackUmrah;
  const recentSearches = useMemo(() => getRecentFlightSearches(), []);

  return (
    <div>
      <SEO
        title="Travelian | Flights, Hotels, Umrah & Visas"
        description="Search available flights and browse Travelian hotels, Umrah packages, tours and visa services."
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Travelian",
            url: "https://travelian.pk",
            logo: "https://travelian.pk/travelian-brand-logo.png",
            sameAs: [
              "https://www.facebook.com/Travelian.pk/",
              "https://www.instagram.com/travelian.pk/",
            ],
            contactPoint: {
              "@type": "ContactPoint",
              telephone: "+92-324-4440014",
              contactType: "customer support",
              areaServed: "PK",
              availableLanguage: ["English", "Urdu", "Arabic"],
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Travelian",
            url: "https://travelian.pk",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://travelian.pk/flights-search?from={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          },
        ]}
      />
      {/* Compact hero */}
      <section className="relative z-10 gradient-hero pt-10 pb-8 md:pt-12 md:pb-10">
        <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none" aria-hidden="true">
          <div className="absolute top-10 left-10 w-72 h-72 bg-primary/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-20 w-96 h-96 bg-gold/20 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-xl md:text-2xl font-bold font-display text-primary-foreground mb-0.5 tracking-tight animate-fade-in-up">
            Travelian
          </h1>
          <p className="text-primary-foreground/70 text-sm md:text-base font-medium mb-5 animate-fade-in">
            Your Trusted Travel Partner
          </p>
          <SearchTabs />
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-5 bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((f) => (
              <div key={f.title} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-gold-light flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Today's Deals */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Percent className="h-5 w-5 text-primary" />
                <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">Today's Deals</h2>
              </div>
              <p className="text-sm text-muted-foreground">Live promotions, updated daily</p>
            </div>
            <Button variant="outline" size="sm" asChild className="rounded-lg">
              <Link to="/deals">View all <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {fallbackDeals.map((d) => (
              <Link key={d.id} to={d.to} className="group">
                <Card className="border-0 shadow-card hover:shadow-hover transition-all duration-300 h-full">
                  <CardContent className="p-5 flex flex-col gap-2">
                    <Badge className="self-start bg-gold text-gold-foreground border-0 text-xs">{d.badge}</Badge>
                    <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{d.title}</h3>
                    <p className="text-xs text-muted-foreground">{d.subtitle}</p>
                    <span className="mt-1 inline-flex items-center text-xs font-semibold text-primary">
                      Grab deal <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Destinations */}
      <section className="py-10 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">Trending Destinations</h2>
              </div>
              <p className="text-sm text-muted-foreground">Explore popular destinations</p>
            </div>
            <Button variant="outline" size="sm" asChild className="hidden md:flex rounded-lg">
              <Link to="/tour-packages">View all <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {destinations.map((d) => (
              <Link key={d.name} to={`/destination/${d.name.toLowerCase().replace(/\s+/g, "-")}`} className="group">
                <div className="relative rounded-2xl overflow-hidden aspect-[3/4] shadow-card hover:shadow-hover transition-all duration-300">
                  <img src={d.image} alt={d.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                  {d.badge && (
                    <Badge className="absolute top-3 left-3 bg-gold text-gold-foreground border-0 text-xs">{d.badge}</Badge>
                  )}
                  <button className="absolute top-3 right-3 h-7 w-7 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                    <Heart className="h-3.5 w-3.5" />
                  </button>
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-primary-foreground font-bold text-sm">{d.name}</p>
                    <p className="text-primary-foreground/70 text-xs">{d.country}</p>
                    {d.priceFrom && (
                      <p className="text-primary-foreground text-[11px] font-semibold mt-1">
                        from <span className="text-gold">PKR {d.priceFrom.toLocaleString()}</span>
                      </p>
                    )}
                    <span className="mt-2 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-primary shadow-sm">
                      Explore trips <ArrowRight className="h-3 w-3 ml-1" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Hotels */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">Featured Hotels</h2>
              <p className="text-sm text-muted-foreground">Handpicked stays with verified reviews</p>
            </div>
            <Button variant="outline" size="sm" asChild className="rounded-lg">
              <Link to="/hotels-search">View all <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayHotels.slice(0, 3).map((hotel) => (
              <Link to={activeHotels.length ? `/hotel/${hotel.hotelId}` : "/hotels-search"} key={hotel.hotelId}>
                <Card className="overflow-hidden group hover:shadow-hover transition-all duration-300 cursor-pointer border-0 shadow-card">
                  <div className="h-48 relative overflow-hidden bg-muted">
                    {hotel.image ? (
                      <img
                        src={hotel.image}
                        alt={hotel.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent text-6xl transition-transform duration-500 group-hover:scale-110">
                        <Hotel className="h-12 w-12 text-primary/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/25 to-transparent pointer-events-none" />
                    <div className="absolute top-3 left-3 flex items-center gap-1">
                      {Array.from({ length: hotel.starRating }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-gold text-gold" />
                      ))}
                    </div>
                    <button className="absolute top-3 right-3 h-8 w-8 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-foreground/40 transition-colors">
                      <Heart className="h-4 w-4" />
                    </button>
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{hotel.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" /> {hotel.city}, {hotel.country}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {hotel.amenities.slice(0, 4).map(a => (
                        <span key={a} className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{a}</span>
                      ))}
                    </div>
                    <div className="flex items-end justify-between mt-4 pt-3 border-t">
                      <div>
                        <p className="text-xl font-bold text-foreground">PKR {hotel.pricePerNight}<span className="text-xs font-normal text-muted-foreground">/night</span></p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Umrah Packages */}
      <section className="py-10 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">Umrah Packages</h2>
              <p className="text-sm text-muted-foreground">Fulfil your spiritual journey</p>
            </div>
            <Button variant="outline" size="sm" asChild className="rounded-lg">
              <Link to="/umrah-packages">View all <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {displayUmrah.slice(0, 4).map((pkg) => (
              <Card key={pkg.packageId} className="overflow-hidden group hover:shadow-hover transition-all duration-300 border-0 shadow-card">
                <div className="h-40 bg-muted relative overflow-hidden">
                  <PackageImage src={pkg.image} alt={pkg.name} className="absolute inset-0" imageClassName="transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" aria-hidden="true" />
                  <Badge className="absolute top-3 left-3 bg-gold text-gold-foreground border-0 text-xs">
                    <Percent className="h-3 w-3 mr-1" /> Best Value
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground text-sm">{pkg.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pkg.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {pkg.includes.slice(0, 3).map((i) => (
                      <span key={i} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{i}</span>
                    ))}
                    {pkg.includes.length > 3 && (
                      <span className="text-[10px] text-primary bg-accent px-1.5 py-0.5 rounded">+{pkg.includes.length - 3}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div>
                      <span className="text-[10px] text-muted-foreground">{pkg.duration}</span>
                      <p className="text-lg font-bold text-primary">PKR {pkg.basePrice}</p>
                    </div>
                    <Link to={publishedUmrahPackages.length ? `/umrah/${pkg.packageId}` : "/umrah-packages"}>
                      <Button size="sm" className="gradient-primary text-primary-foreground text-xs h-8 rounded-lg">Book Now</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Top Destinations by Country */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">Top Destinations by Country</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {topCountries.map((c) => {
              const slug = c.country.toLowerCase().replace(/\s+/g, "-");
              return (
                <Link
                  key={c.country}
                  to={`/destination/${slug}`}
                  aria-label={`Explore ${c.country}`}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
                >
                  <Card className="relative overflow-hidden hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group border-0 shadow-card min-h-[220px] md:min-h-[260px] lg:min-h-[280px]">
                    <img
                      src={c.image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" aria-hidden="true" />
                    <div className="relative z-10 flex h-full min-h-[220px] md:min-h-[260px] lg:min-h-[280px] flex-col justify-end p-5 md:p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-primary shadow-sm" aria-hidden="true">
                          <Globe className="h-5 w-5" />
                        </span>
                        <div>
                          <h3 className="font-semibold text-white drop-shadow-sm">{c.country}</h3>
                          <p className="text-xs text-white/80">
                            {c.properties.toLocaleString()}+ properties - from <span className="text-gold font-semibold">PKR {c.priceFrom.toLocaleString()}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {c.popular.map(city => (
                          <button
                            key={city}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.location.href = `/destination/${encodeURIComponent(city.toLowerCase().replace(/\s+/g, "-"))}`;
                            }}
                            className="text-xs font-medium text-foreground bg-white/90 px-2.5 py-1 rounded-full hover:bg-white transition-colors shadow-sm"
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                      <span className="mt-4 inline-flex items-center text-xs font-semibold text-white">
                        View travel options <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular Tours */}
      <section className="py-10 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">Popular Tours</h2>
              <p className="text-sm text-muted-foreground">Explore the world with guided tours</p>
            </div>
            <Button variant="outline" size="sm" asChild className="rounded-lg">
              <Link to="/tour-packages">View all <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayTours.slice(0, 3).map((tour) => (
              <Card key={tour.packageId} className="overflow-hidden group hover:shadow-hover transition-all duration-300 cursor-pointer border-0 shadow-card">
                <div className="relative h-44 overflow-hidden bg-muted">
                  <PackageImage src={tour.image} alt={tour.name} className="absolute inset-0" imageClassName="transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" aria-hidden="true" />
                  <Badge className="absolute top-3 left-3 z-10 bg-primary text-primary-foreground border-0 text-xs rounded-lg shadow-sm">{tour.duration}</Badge>
                  <button type="button" className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors">
                    <Heart className="h-4 w-4" />
                  </button>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground">{tour.name}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" /> {tour.city}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{tour.description}</p>
                  <div className="flex items-end justify-between mt-4 pt-3 border-t">
                    <div>
                      <span className="text-xs text-muted-foreground">From</span>
                      <p className="text-xl font-bold text-foreground">PKR {tour.basePrice}</p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="text-xs h-8 rounded-lg">
                      <Link to="/tour-packages" aria-label={`View details for ${tour.name}`}>View Details</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Travel Guides */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">Travel Guides</h2>
              <p className="text-sm text-muted-foreground">Tips, guides, and inspiration</p>
            </div>
            <Button variant="outline" size="sm" asChild className="rounded-lg">
              <Link to="/blog-public">View all <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {displayBlog.slice(0, 3).map((post) => (
              <Link key={post.postId} to={`/blog/${post.slug}`} aria-label={post.title} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl">
                <Card className="overflow-hidden hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group border-0 shadow-card h-full">
                  <div className="h-44 overflow-hidden bg-muted">
                    <img
                      src={getBlogImage(post)}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <CardContent className="p-5">
                    <Badge variant="secondary" className="mb-2 text-xs rounded-md">{post.category}</Badge>
                    <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">{post.title}</h3>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
                      <span>By {post.author}</span>
                      <span>{post.publishedAt}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews and partner proof */}
      <section className="py-10 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">Trusted by travelers and agencies</h2>
                  <p className="text-sm text-muted-foreground">Real support, transparent fares and managed service from search to ticketing.</p>
                </div>
                <Badge variant="secondary" className="hidden sm:inline-flex rounded-full">4.8 from 12k reviews</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {reviewCards.map((review) => (
                  <Card key={review.name} className="border-0 shadow-card">
                    <CardContent className="p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-gold">
                          {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                        </div>
                        <span className="text-xs font-bold text-primary">{review.rating}</span>
                      </div>
                      <p className="text-sm text-foreground">"{review.quote}"</p>
                      <div className="mt-4 border-t pt-3">
                        <p className="text-sm font-semibold text-foreground">{review.name}</p>
                        <p className="text-xs text-muted-foreground">{review.trip}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <h3 className="font-bold text-foreground">Connected supplier network</h3>
                <p className="mt-1 text-xs text-muted-foreground">Availability depends on live supplier health and contract configuration.</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {partnerNames.map((name) => (
                    <div key={name} className="rounded-xl border bg-background px-3 py-2 text-center text-xs font-semibold text-muted-foreground">
                      {name}
                    </div>
                  ))}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-primary px-4 py-3 text-primary-foreground">
                    <p className="text-[10px] uppercase tracking-wide opacity-75">Coming soon</p>
                    <p className="text-sm font-bold">iOS App</p>
                  </div>
                  <div className="rounded-xl bg-foreground px-4 py-3 text-background">
                    <p className="text-[10px] uppercase tracking-wide opacity-75">Coming soon</p>
                    <p className="text-sm font-bold">Android App</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Recent searches */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">Recent Searches</h2>
              <p className="text-sm text-muted-foreground">Continue from your latest flight searches on this device.</p>
            </div>
          </div>
          {recentSearches.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {recentSearches.map((item, index) => (
                <Link
                  key={`${item.from}-${item.to}-${index}`}
                  to={`/flights-search?from=${item.from}&to=${item.to}${item.depart ? `&depart=${encodeURIComponent(item.depart)}` : ""}`}
                  className="rounded-2xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-card"
                >
                  <p className="text-sm font-bold text-foreground">{item.from} to {item.to}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.depart || "Choose travel date"} - {item.travelers || "Travelers"}</p>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="border-dashed shadow-none">
              <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-foreground">No recent searches yet</p>
                  <p className="text-sm text-muted-foreground">Search a route and Travelian will keep it here for quick access.</p>
                </div>
                <Button asChild className="rounded-xl">
                  <Link to="/">Start a search</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}


