import { SearchTabs } from "@/components/public/SearchTabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, ArrowRight, Shield, Clock, Headphones, CreditCard, Plane, Hotel, FileCheck, Users, Package, Map } from "lucide-react";
import { Link } from "react-router-dom";
import { mockPackages, mockTourPackages, mockHotels, mockBlogPosts } from "@/data/mock";

const destinations = [
  { name: "Makkah", country: "Saudi Arabia", image: "https://images.unsplash.com/photo-1591604129939-f1efa4d99f7e?w=400&h=300&fit=crop", packages: 12 },
  { name: "Istanbul", country: "Turkey", image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=400&h=300&fit=crop", packages: 8 },
  { name: "Dubai", country: "UAE", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop", packages: 6 },
  { name: "Kuala Lumpur", country: "Malaysia", image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=400&h=300&fit=crop", packages: 5 },
  { name: "Cairo", country: "Egypt", image: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=400&h=300&fit=crop", packages: 4 },
  { name: "Madinah", country: "Saudi Arabia", image: "https://images.unsplash.com/photo-1590076215667-875d4ef2d7de?w=400&h=300&fit=crop", packages: 10 },
];

const features = [
  { icon: Shield, title: "Trusted & Verified", desc: "All packages verified by our travel experts" },
  { icon: CreditCard, title: "Best Price Guarantee", desc: "Find a lower price? We'll match it" },
  { icon: Clock, title: "24/7 Support", desc: "Round the clock assistance for travelers" },
  { icon: Headphones, title: "Expert Guidance", desc: "Dedicated travel consultants for you" },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sidebar to-sidebar-accent py-16 md:py-24">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,hsl(172,66%,40%)_0%,transparent_50%)]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">✈️ Your Journey Starts Here</Badge>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold font-display text-sidebar-accent-foreground mb-4 leading-tight">
            Discover Your Perfect
            <span className="text-primary block">Travel Experience</span>
          </h1>
          <p className="text-sidebar-muted text-lg md:text-xl max-w-2xl mx-auto mb-8">
            Book Umrah packages, flights, hotels, tours, and visa services — all in one place with the best deals.
          </p>
          <SearchTabs />
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-accent/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((f) => (
              <div key={f.title} className="flex items-center gap-3 p-4 bg-card rounded-lg shadow-card">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-accent flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-primary" />
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

      {/* Popular Destinations */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground">Popular Destinations</h2>
              <p className="text-muted-foreground mt-1">Explore our most booked destinations</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/tour-packages">View All <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {destinations.map((d) => (
              <Link key={d.name} to="/tour-packages" className="group">
                <div className="relative rounded-xl overflow-hidden aspect-[3/4]">
                  <img src={d.image} alt={d.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-primary-foreground font-semibold text-sm">{d.name}</p>
                    <p className="text-primary-foreground/70 text-xs">{d.packages} packages</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Umrah Packages */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground">Umrah Packages</h2>
              <p className="text-muted-foreground mt-1">Fulfil your spiritual journey with our curated packages</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/umrah-packages">View All <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockPackages.filter(p => p.status === 'active').slice(0, 3).map((pkg) => (
              <Card key={pkg.packageId} className="overflow-hidden group hover:shadow-elevated transition-shadow">
                <div className="h-48 bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
                  <Package className="h-16 w-16 text-primary/40" />
                </div>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{pkg.name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" /> {pkg.city}
                      </p>
                    </div>
                    <Badge variant="secondary">{pkg.duration}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{pkg.description}</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {pkg.includes.slice(0, 4).map((i) => (
                      <Badge key={i} variant="outline" className="text-xs">{i}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <div>
                      <span className="text-xs text-muted-foreground">From</span>
                      <p className="text-xl font-bold text-primary">${pkg.basePrice}</p>
                    </div>
                    <Button size="sm" className="gradient-primary text-primary-foreground">Book Now</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tour Packages */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground">Tour Packages</h2>
              <p className="text-muted-foreground mt-1">Explore the world with our hand-picked tours</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/tour-packages">View All <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {mockTourPackages.filter(t => t.status === 'active').map((tour) => (
              <Card key={tour.packageId} className="overflow-hidden group hover:shadow-elevated transition-shadow">
                <div className="h-40 bg-gradient-to-br from-info/20 to-accent flex items-center justify-center">
                  <MapPin className="h-12 w-12 text-info/40" />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground text-sm">{tour.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tour.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-lg font-bold text-primary">${tour.basePrice}</p>
                    <Badge variant="outline" className="text-xs">{tour.duration}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Hotels Section */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground">Featured Hotels</h2>
              <p className="text-muted-foreground mt-1">Handpicked stays for the perfect trip</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/hotels-search">View All <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockHotels.filter(h => h.status === 'active').slice(0, 3).map((hotel) => (
              <Card key={hotel.hotelId} className="overflow-hidden group hover:shadow-elevated transition-shadow">
                <div className="h-44 bg-gradient-to-br from-warning/10 to-accent flex items-center justify-center relative">
                  <Hotel className="h-14 w-14 text-warning/30" />
                  <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-md">
                    {hotel.starRating}.0 ★
                  </div>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground">{hotel.name}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" /> {hotel.city}, {hotel.country}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {hotel.amenities.slice(0, 3).map((a) => (
                      <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <div>
                      <span className="text-xs text-muted-foreground">Per night</span>
                      <p className="text-xl font-bold text-primary">${hotel.pricePerNight}</p>
                    </div>
                    <Button size="sm" variant="outline">View Details</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground">Travel Blog</h2>
              <p className="text-muted-foreground mt-1">Tips, guides, and travel inspiration</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/blog-public">View All <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mockBlogPosts.filter(b => b.status === 'published').slice(0, 3).map((post) => (
              <Card key={post.postId} className="overflow-hidden hover:shadow-elevated transition-shadow">
                <div className="h-40 bg-gradient-to-br from-primary/10 to-info/10 flex items-center justify-center">
                  <span className="text-4xl">📝</span>
                </div>
                <CardContent className="p-5">
                  <Badge variant="secondary" className="mb-2 text-xs">{post.category}</Badge>
                  <h3 className="font-semibold text-foreground">{post.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                    <span>By {post.author}</span>
                    <span>{post.publishedAt}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 gradient-primary">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold font-display text-primary-foreground mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-primary-foreground/80 mb-6">
            Join thousands of satisfied travelers. Book your next adventure today.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/umrah-packages">Browse Packages</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
