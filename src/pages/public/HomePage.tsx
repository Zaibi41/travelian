import { SearchTabs } from "@/components/public/SearchTabs";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, ArrowRight, ShieldCheck, Flame, TrendingUp, Heart, ChevronRight, Percent, Globe, Users, Plane, Hotel } from "lucide-react";
import { Link } from "react-router-dom";
import { getBlogImage } from "@/lib/blog-images";
import { PackageImage } from "@/components/public/PackageImage";
import { useAdmin } from "@/contexts/AdminStore";
import { isPublishedUmrahPackage } from "@/lib/package-availability";

const destinations = [
  { name: "Makkah", country: "Saudi Arabia", image: "https://images.unsplash.com/photo-1565330770968-0240c0046ce3?w=400&h=500&fit=crop&q=80", badge: "Popular", priceFrom: 89000 },
  { name: "Istanbul", country: "Turkey", image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=400&h=500&fit=crop", priceFrom: 64500 },
  { name: "Dubai", country: "UAE", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=500&fit=crop", badge: "Trending", priceFrom: 52000 },
  { name: "Kuala Lumpur", country: "Malaysia", image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=400&h=500&fit=crop", priceFrom: 98000 },
  { name: "Cairo", country: "Egypt", image: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=400&h=500&fit=crop", priceFrom: 76500 },
  { name: "Madinah", country: "Saudi Arabia", image: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=400&h=500&fit=crop&q=80", badge: "Holy City", priceFrom: 92500 },
];

const deals = [
  { title: "Eid Umrah Special", discount: "Up to 25% off", desc: "21-day premium packages with 5★ hotels in Makkah & Madinah.", bg: "gradient-deal", expiry: "Ends in 6 days", to: "/umrah-packages" },
  { title: "Dubai City Break", discount: "From PKR 52,000", desc: "Return flights + 3 nights stay near Burj Khalifa.", bg: "gradient-primary", expiry: "Limited seats", to: "/packages-search" },
  { title: "Istanbul Long Weekend", discount: "15% off bundle", desc: "Flights + Bosphorus cruise + Sultanahmet hotel.", bg: "gradient-gold", expiry: "This week only", to: "/packages-search" },
];

const features = [
  { icon: Users, title: "1M+ trips booked", desc: "Pakistan's trusted travel partner since 2019" },
  { icon: Star, title: "4.8 / 5 rating", desc: "From 12,400+ verified traveller reviews" },
  { icon: ShieldCheck, title: "PCI-DSS secure", desc: "Bank-grade encrypted payments" },
  { icon: Percent, title: "No hidden fees", desc: "Transparent fares, free cancellation options" },
];

const topCountries = [
  { country: "Saudi Arabia", popular: ["Makkah", "Madinah", "Riyadh", "Jeddah"], image: "https://images.unsplash.com/photo-1565330770968-0240c0046ce3?w=900&h=620&fit=crop&q=80", properties: 248 },
  { country: "Turkey", popular: ["Istanbul", "Antalya", "Cappadocia", "Bodrum"], image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=900&h=620&fit=crop&q=80", properties: 312 },
  { country: "UAE", popular: ["Dubai", "Abu Dhabi", "Sharjah", "Ras Al Khaimah"], image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=900&h=620&fit=crop&q=80", properties: 418 },
  { country: "Malaysia", popular: ["KL", "Langkawi", "Penang", "Johor Bahru"], image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=900&h=620&fit=crop&q=80", properties: 186 },
  { country: "Egypt", popular: ["Cairo", "Luxor", "Sharm El Sheikh", "Hurghada"], image: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=900&h=620&fit=crop&q=80", properties: 142 },
  { country: "Indonesia", popular: ["Bali", "Jakarta", "Yogyakarta", "Lombok"], image: "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=900&h=620&fit=crop&q=80", properties: 224 },
];

// Curated fallbacks so the home page never shows empty rails
const fallbackHotels = [
  { id: "fh-1", name: "Pullman Zamzam Madinah", city: "Madinah", country: "Saudi Arabia", starRating: 5, pricePerNight: 28500, amenities: ["Haram view", "Free WiFi", "Breakfast", "24h reception"], image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&h=600&fit=crop&q=80" },
  { id: "fh-2", name: "Atlantis The Palm", city: "Dubai", country: "UAE", starRating: 5, pricePerNight: 64200, amenities: ["Beachfront", "Pool", "Spa", "Aquaventure"], image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=600&fit=crop&q=80" },
  { id: "fh-3", name: "Four Seasons Bosphorus", city: "Istanbul", country: "Turkey", starRating: 5, pricePerNight: 48900, amenities: ["Sea view", "Spa", "Fitness", "Restaurant"], image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&h=600&fit=crop&q=80" },
];

const fallbackTours = [
  { id: "ft-1", name: "Cappadocia Hot Air Balloon", city: "Cappadocia, Turkey", duration: "4 Days", basePrice: 145000, description: "Sunrise balloon ride, cave hotel stay, Goreme open-air museum, ATV tour.", image: "https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?w=800&h=600&fit=crop&q=80" },
  { id: "ft-2", name: "Bali Cultural Escape", city: "Bali, Indonesia", duration: "6 Days", basePrice: 198000, description: "Ubud rice terraces, Uluwatu temple, beach villas and Mount Batur sunrise hike.", image: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&h=600&fit=crop&q=80" },
  { id: "ft-3", name: "Egypt Pyramids & Nile", city: "Cairo, Egypt", duration: "5 Days", basePrice: 172000, description: "Giza pyramids, Egyptian museum, Nile dinner cruise and Khan El Khalili bazaar.", image: "https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=800&h=600&fit=crop&q=80" },
];

const fallbackGuides = [
  { id: "fg-1", slug: "umrah-first-time-checklist", title: "First-time Umrah: a complete checklist", excerpt: "Documents, dress code, rituals, and packing tips for a smooth pilgrimage.", category: "Umrah", author: "Travelian Team", publishedAt: "May 2026", image: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800&h=500&fit=crop&q=80" },
  { id: "fg-2", slug: "dubai-on-a-budget", title: "Dubai on a budget: 5 days under PKR 150k", excerpt: "Where to stay, eat, and explore without overspending in the City of Gold.", category: "City Guide", author: "Travelian Team", publishedAt: "Apr 2026", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=500&fit=crop&q=80" },
  { id: "fg-3", slug: "schengen-visa-pakistan", title: "Schengen visa from Pakistan, explained", excerpt: "Document list, embassy appointments, financial proof, and approval timelines.", category: "Visa", author: "Travelian Team", publishedAt: "Mar 2026", image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=500&fit=crop&q=80" },
];

export default function HomePage() {
  const { hotels, packages, tourPackages, blogPosts } = useAdmin();
  const publishedUmrahPackages = packages.filter(isPublishedUmrahPackage);

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

      {/* Flash Deals */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-destructive" />
              <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">Today's Deals</h2>
            </div>
            <Link to="/deals" className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
              View all deals <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {deals.map((deal, i) => (
              <Link
                key={i}
                to="/deals"
                aria-label={`${deal.title} - ${deal.discount}`}
                className={`${deal.bg} rounded-2xl p-6 text-primary-foreground relative overflow-hidden group block hover:scale-[1.02] transition-transform duration-300 focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:outline-none`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/5 rounded-full -mr-10 -mt-10" />
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 mb-3">{deal.expiry}</Badge>
                <h3 className="font-bold text-lg mb-1">{deal.title}</h3>
                <p className="text-3xl font-extrabold mb-2">{deal.discount}</p>
                <p className="text-sm text-primary-foreground/70">{deal.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 group-hover:underline">
                  Book Now <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Destinations */}
      <section className="py-14 bg-muted/30">
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
              <Link to="/tour-packages">Explore All <ArrowRight className="h-4 w-4 ml-1" /></Link>
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
                    <p className="text-gold text-[11px] font-semibold mt-1">From PKR {d.priceFrom.toLocaleString()}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Hotels */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">Featured Hotels</h2>
              <p className="text-sm text-muted-foreground">Handpicked stays with verified reviews</p>
            </div>
            <Button variant="outline" size="sm" asChild className="rounded-lg">
              <Link to="/hotels-search">View All <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(() => {
              const live = hotels.filter(h => h.status === 'active').slice(0, 3);
              const items = live.length > 0
                ? live.map(h => ({ key: h.hotelId, href: `/hotel/${h.hotelId}`, name: h.name, city: h.city, country: h.country, starRating: h.starRating, pricePerNight: h.pricePerNight, amenities: h.amenities, image: h.image }))
                : fallbackHotels.map(h => ({ key: h.id, href: '/hotels-search', name: h.name, city: h.city, country: h.country, starRating: h.starRating, pricePerNight: h.pricePerNight, amenities: h.amenities, image: h.image }));
              return items.map((hotel) => (
                <Link to={hotel.href} key={hotel.key}>
                  <Card className="overflow-hidden group hover:shadow-hover transition-all duration-300 cursor-pointer border-0 shadow-card">
                    <div className="h-48 relative overflow-hidden bg-muted">
                      {hotel.image ? (
                        <img src={hotel.image} alt={hotel.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
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
                      <button className="absolute top-3 right-3 h-8 w-8 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-foreground/40 transition-colors" aria-label="Save to wishlist">
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
                          <p className="text-xl font-bold text-foreground">PKR {hotel.pricePerNight.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/night</span></p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ));
            })()}
          </div>
        </div>
      </section>

      {/* Umrah Packages */}
      <section className="py-14 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">Umrah Packages</h2>
              <p className="text-sm text-muted-foreground">Fulfil your spiritual journey</p>
            </div>
            <Button variant="outline" size="sm" asChild className="rounded-lg">
              <Link to="/umrah-packages">View All <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {publishedUmrahPackages.slice(0, 4).map((pkg) => (
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
                    <Link to={`/umrah/${pkg.packageId}`}>
                      <Button size="sm" className="gradient-primary text-primary-foreground text-xs h-8 rounded-lg">Book Now</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
            {publishedUmrahPackages.length === 0 && (
              <Card className="col-span-full border-dashed shadow-none">
                <CardContent className="p-6 text-sm text-muted-foreground">No Umrah packages are published right now.</CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Top Destinations by Country */}
      <section className="py-14">
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
                          <p className="text-xs text-white/80">{c.properties}+ properties · {c.popular.length} popular cities</p>
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
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular Tours */}
      <section className="py-14 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">Popular Tours</h2>
              <p className="text-sm text-muted-foreground">Explore the world with guided tours</p>
            </div>
            <Button variant="outline" size="sm" asChild className="rounded-lg">
              <Link to="/tour-packages">View All <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(() => {
              const live = tourPackages.filter(t => t.status === 'active' && !t.deletedAt);
              const items = live.length > 0
                ? live.map(t => ({ key: t.packageId, href: '/tour-packages', name: t.name, city: t.city, duration: t.duration, basePrice: t.basePrice, description: t.description, image: t.image }))
                : fallbackTours.map(t => ({ key: t.id, href: '/tour-packages', name: t.name, city: t.city, duration: t.duration, basePrice: t.basePrice, description: t.description, image: t.image }));
              return items.map((tour) => (
                <Card key={tour.key} className="overflow-hidden group hover:shadow-hover transition-all duration-300 cursor-pointer border-0 shadow-card">
                  <div className="relative h-44 overflow-hidden bg-muted">
                    <PackageImage src={tour.image} alt={tour.name} className="absolute inset-0" imageClassName="transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" aria-hidden="true" />
                    <Badge className="absolute top-3 left-3 z-10 bg-primary text-primary-foreground border-0 text-xs rounded-lg shadow-sm">{tour.duration}</Badge>
                    <button type="button" aria-label="Save to wishlist" className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors">
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
                        <p className="text-xl font-bold text-foreground">PKR {tour.basePrice.toLocaleString()}</p>
                      </div>
                      <Button asChild size="sm" variant="outline" className="text-xs h-8 rounded-lg">
                        <Link to={tour.href} aria-label={`View details for ${tour.name}`}>View Details</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ));
            })()}
          </div>
        </div>
      </section>

      {/* Travel Guides */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">Travel Guides</h2>
              <p className="text-sm text-muted-foreground">Tips, guides, and inspiration</p>
            </div>
            <Button variant="outline" size="sm" asChild className="rounded-lg">
              <Link to="/blog-public">Read More <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(() => {
              const live = blogPosts.filter(b => b.status === 'published').slice(0, 3);
              const items = live.length > 0
                ? live.map(p => ({ key: p.postId, href: `/blog/${p.slug}`, title: p.title, excerpt: p.excerpt, category: p.category, author: p.author, publishedAt: p.publishedAt, image: getBlogImage(p) }))
                : fallbackGuides.map(g => ({ key: g.id, href: '/blog-public', title: g.title, excerpt: g.excerpt, category: g.category, author: g.author, publishedAt: g.publishedAt, image: g.image }));
              return items.map((post) => (
                <Link key={post.key} to={post.href} aria-label={post.title} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl">
                  <Card className="overflow-hidden hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group border-0 shadow-card h-full">
                    <div className="h-44 overflow-hidden bg-muted">
                      <img src={post.image} alt={post.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
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
              ));
            })()}
          </div>
        </div>
      </section>
    </div>
  );
}


