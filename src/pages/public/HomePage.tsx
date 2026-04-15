import { SearchTabs } from "@/components/public/SearchTabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, ArrowRight, Shield, Clock, Headphones, CreditCard, Flame, TrendingUp, Heart, ChevronRight, Percent, Zap, Globe, Award, Plane, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { mockPackages, mockTourPackages, mockHotels, mockBlogPosts } from "@/data/mock";

const destinations = [
  { name: "Makkah", country: "Saudi Arabia", image: "https://images.unsplash.com/photo-1591604129939-f1efa4d99f7e?w=400&h=500&fit=crop", properties: 234, badge: "Popular" },
  { name: "Istanbul", country: "Turkey", image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=400&h=500&fit=crop", properties: 1850 },
  { name: "Dubai", country: "UAE", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=500&fit=crop", properties: 3200, badge: "Trending" },
  { name: "Kuala Lumpur", country: "Malaysia", image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=400&h=500&fit=crop", properties: 2100 },
  { name: "Cairo", country: "Egypt", image: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=400&h=500&fit=crop", properties: 890 },
  { name: "Madinah", country: "Saudi Arabia", image: "https://images.unsplash.com/photo-1590076215667-875d4ef2d7de?w=400&h=500&fit=crop", properties: 156, badge: "Holy City" },
];

const deals = [
  { title: "Flash Sale: Makkah Hotels", discount: "Up to 40% OFF", desc: "Limited time offer on 5-star hotels near Haram", bg: "gradient-deal", expiry: "Ends in 2 days" },
  { title: "Early Bird: Summer Tours", discount: "Save $200", desc: "Book Turkey & Dubai tours before April", bg: "gradient-primary", expiry: "Book by Apr 30" },
  { title: "Umrah Package Deal", discount: "From $899", desc: "Economy 7-night Umrah with flights included", bg: "gradient-hero", expiry: "Limited seats" },
];

const features = [
  { icon: Shield, title: "Secure Booking", desc: "256-bit SSL encrypted payments" },
  { icon: Award, title: "Best Price Guarantee", desc: "Find it cheaper? We'll match it" },
  { icon: Clock, title: "Free Cancellation", desc: "On most properties within 24h" },
  { icon: Headphones, title: "24/7 Support", desc: "Round the clock assistance" },
];

const topCountries = [
  { country: "Saudi Arabia", flag: "🇸🇦", properties: 2340, popular: ["Makkah", "Madinah", "Riyadh", "Jeddah"] },
  { country: "Turkey", flag: "🇹🇷", properties: 5670, popular: ["Istanbul", "Antalya", "Cappadocia", "Bodrum"] },
  { country: "UAE", flag: "🇦🇪", properties: 4120, popular: ["Dubai", "Abu Dhabi", "Sharjah", "Ras Al Khaimah"] },
  { country: "Malaysia", flag: "🇲🇾", properties: 3890, popular: ["KL", "Langkawi", "Penang", "Johor Bahru"] },
  { country: "Egypt", flag: "🇪🇬", properties: 1890, popular: ["Cairo", "Luxor", "Sharm El Sheikh", "Hurghada"] },
  { country: "Indonesia", flag: "🇮🇩", properties: 8920, popular: ["Bali", "Jakarta", "Yogyakarta", "Lombok"] },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden gradient-hero py-20 md:py-28">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/30 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-gold/20 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold font-display text-primary-foreground mb-1 tracking-tight animate-fade-in-up">
            Travelian
          </h1>
          <p className="text-primary-foreground/70 text-base md:text-lg font-medium mb-8 animate-fade-in">
            Your Trusted Travel Partner
          </p>
          <SearchTabs />
          <div className="flex items-center justify-center gap-4 mt-6 text-xs text-primary-foreground/40">
            <span>Popular:</span>
            {["Makkah Flights", "Istanbul Hotels", "Dubai Tours", "Umrah 2025"].map(t => (
              <Link key={t} to="/flights-search" className="hover:text-gold transition-colors underline underline-offset-2">{t}</Link>
            ))}
          </div>
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
              <div key={i} className={`${deal.bg} rounded-2xl p-6 text-primary-foreground relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform duration-300`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/5 rounded-full -mr-10 -mt-10" />
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 mb-3">{deal.expiry}</Badge>
                <h3 className="font-bold text-lg mb-1">{deal.title}</h3>
                <p className="text-3xl font-extrabold mb-2">{deal.discount}</p>
                <p className="text-sm text-primary-foreground/70">{deal.desc}</p>
                <Button size="sm" variant="secondary" className="mt-4 rounded-lg">Book Now</Button>
              </div>
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
              <p className="text-sm text-muted-foreground">Most booked destinations this month</p>
            </div>
            <Button variant="outline" size="sm" asChild className="hidden md:flex rounded-lg">
              <Link to="/tour-packages">Explore All <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {destinations.map((d) => (
              <Link key={d.name} to="/hotels-search" className="group">
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
                    <p className="text-primary-foreground/60 text-xs">{d.country} · {d.properties.toLocaleString()} properties</p>
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
            {mockHotels.filter(h => h.status === 'active').slice(0, 3).map((hotel) => (
              <Link to={`/hotel/${hotel.hotelId}`} key={hotel.hotelId}>
                <Card className="overflow-hidden group hover:shadow-hover transition-all duration-300 cursor-pointer border-0 shadow-card">
                  <div className="h-48 bg-gradient-to-br from-primary/5 to-accent flex items-center justify-center relative">
                    <span className="text-6xl group-hover:scale-110 transition-transform duration-500">🏨</span>
                    <div className="absolute top-3 left-3 flex items-center gap-1">
                      {Array.from({ length: hotel.starRating }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-gold text-gold" />
                      ))}
                    </div>
                    <button className="absolute top-3 right-3 h-8 w-8 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-foreground/40 transition-colors">
                      <Heart className="h-4 w-4" />
                    </button>
                    <Badge className="absolute bottom-3 left-3 bg-success text-success-foreground border-0 text-xs">
                      Free Cancellation
                    </Badge>
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{hotel.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" /> {hotel.city}, {hotel.country}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-lg">
                          9.{hotel.starRating}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Excellent</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {hotel.amenities.slice(0, 4).map(a => (
                        <span key={a} className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{a}</span>
                      ))}
                    </div>
                    <div className="flex items-end justify-between mt-4 pt-3 border-t">
                      <div>
                        <span className="text-xs text-muted-foreground line-through">${Math.round(hotel.pricePerNight * 1.3)}</span>
                        <p className="text-xl font-bold text-foreground">${hotel.pricePerNight}<span className="text-xs font-normal text-muted-foreground">/night</span></p>
                      </div>
                      <Badge variant="outline" className="text-gold border-gold/30 text-xs">
                        Save {Math.round(30)}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
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
            {mockPackages.filter(p => p.status === 'active').slice(0, 4).map((pkg) => (
              <Card key={pkg.packageId} className="overflow-hidden group hover:shadow-hover transition-all duration-300 border-0 shadow-card">
                <div className="h-40 bg-gradient-to-br from-gold/10 to-accent flex items-center justify-center relative">
                  <span className="text-5xl group-hover:scale-110 transition-transform duration-500">🕋</span>
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
                      <p className="text-lg font-bold text-primary">${pkg.basePrice}</p>
                    </div>
                    <Button size="sm" className="gradient-primary text-primary-foreground text-xs h-8 rounded-lg">Book Now</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Top Properties by Country */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">Top Properties by Country</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {topCountries.map((c) => (
              <Card key={c.country} className="p-5 hover:shadow-hover transition-all duration-300 cursor-pointer group border-0 shadow-card">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{c.flag}</span>
                  <div>
                    <h3 className="font-semibold text-foreground">{c.country}</h3>
                    <p className="text-xs text-muted-foreground">{c.properties.toLocaleString()} properties</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.popular.map(city => (
                    <Link key={city} to="/hotels-search" className="text-xs text-primary bg-accent px-2.5 py-1 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors">
                      {city}
                    </Link>
                  ))}
                </div>
              </Card>
            ))}
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
            {mockTourPackages.filter(t => t.status === 'active').map((tour) => (
              <Card key={tour.packageId} className="overflow-hidden group hover:shadow-hover transition-all duration-300 cursor-pointer border-0 shadow-card">
                <div className="h-44 bg-gradient-to-br from-info/10 to-accent flex items-center justify-center relative">
                  <span className="text-5xl group-hover:scale-110 transition-transform duration-500">
                    {tour.city.includes('Istanbul') ? '🕌' : tour.city.includes('Dubai') ? '🏙️' : '🌴'}
                  </span>
                  <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground border-0 text-xs rounded-lg">{tour.duration}</Badge>
                  <button className="absolute top-3 right-3 h-8 w-8 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-foreground/40 transition-colors">
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
                      <p className="text-xl font-bold text-foreground">${tour.basePrice}</p>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs h-8 rounded-lg">View Details</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
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
            {mockBlogPosts.filter(b => b.status === 'published').slice(0, 3).map((post) => (
              <Card key={post.postId} className="overflow-hidden hover:shadow-hover transition-all duration-300 cursor-pointer group border-0 shadow-card">
                <div className="h-44 bg-gradient-to-br from-primary/5 to-accent flex items-center justify-center">
                  <span className="text-5xl group-hover:scale-110 transition-transform duration-500">📝</span>
                </div>
                <CardContent className="p-5">
                  <Badge variant="secondary" className="mb-2 text-xs rounded-md">{post.category}</Badge>
                  <h3 className="font-semibold text-foreground line-clamp-2">{post.title}</h3>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
                    <span>By {post.author}</span>
                    <span>{post.publishedAt}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* App Promo */}
      <section className="py-16 gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-foreground/20 rounded-full -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold/20 rounded-full -ml-32 -mb-32" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-gold/20 text-gold text-sm px-4 py-1.5 rounded-full mb-6 border border-gold/30">
            <Award className="h-3.5 w-3.5" /> Verified Platform
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold font-display text-primary-foreground mb-4">
            Get exclusive app-only deals
          </h2>
          <p className="text-primary-foreground/60 mb-8 max-w-lg mx-auto">
            Download the Travelian app for members-only prices, instant booking confirmation, and 24/7 support.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" variant="secondary" className="font-semibold rounded-xl">
              📱 Download App
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 font-semibold rounded-xl" asChild>
              <Link to="/umrah-packages">Browse Packages</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
