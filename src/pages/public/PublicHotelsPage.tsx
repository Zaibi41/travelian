import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, MapPin, Wifi, UtensilsCrossed, Dumbbell, Search, SlidersHorizontal, Grid3X3, List } from "lucide-react";
import { mockHotels } from "@/data/mock";

export default function PublicHotelsPage() {
  const [search, setSearch] = useState("");
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");

  const filtered = mockHotels.filter(h => {
    if (h.status !== 'active') return false;
    if (search && !h.name.toLowerCase().includes(search.toLowerCase()) && !h.city.toLowerCase().includes(search.toLowerCase())) return false;
    if (starFilter && h.starRating !== starFilter) return false;
    return true;
  });

  const amenityIcon = (a: string) => {
    if (a.toLowerCase().includes('wifi')) return <Wifi className="h-3 w-3" />;
    if (a.toLowerCase().includes('restaurant') || a.toLowerCase().includes('meal')) return <UtensilsCrossed className="h-3 w-3" />;
    if (a.toLowerCase().includes('gym')) return <Dumbbell className="h-3 w-3" />;
    return null;
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-sidebar to-sidebar-accent py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold font-display text-sidebar-accent-foreground mb-2">Find Your Perfect Stay</h1>
          <p className="text-sidebar-muted mb-6">Search from our curated collection of hotels worldwide</p>
          <div className="max-w-2xl mx-auto flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by hotel name or city..." className="pl-9 bg-card" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button className="gradient-primary text-primary-foreground"><Search className="h-4 w-4" /></Button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground mr-2">Filter:</span>
          {[3, 4, 5].map(s => (
            <Button key={s} size="sm" variant={starFilter === s ? "default" : "outline"} onClick={() => setStarFilter(starFilter === s ? null : s)} className="text-xs">
              {s} <Star className="h-3 w-3 ml-1 fill-current" />
            </Button>
          ))}
          <div className="ml-auto flex gap-1">
            <Button size="icon" variant={view === "grid" ? "default" : "outline"} onClick={() => setView("grid")} className="h-8 w-8">
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button size="icon" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")} className="h-8 w-8">
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{filtered.length} hotels found</p>

        {view === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(hotel => (
              <Card key={hotel.hotelId} className="overflow-hidden group hover:shadow-elevated transition-all">
                <div className="h-48 bg-gradient-to-br from-warning/10 to-accent relative flex items-center justify-center">
                  <span className="text-6xl">🏨</span>
                  <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                    {hotel.starRating}.0 <Star className="h-3 w-3 fill-current" />
                  </div>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground text-lg">{hotel.name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3.5 w-3.5" /> {hotel.city}, {hotel.country}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {hotel.amenities.slice(0, 4).map(a => (
                      <Badge key={a} variant="outline" className="text-xs flex items-center gap-1">
                        {amenityIcon(a)} {a}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <div>
                      <span className="text-xs text-muted-foreground">Per night from</span>
                      <p className="text-2xl font-bold text-primary">${hotel.pricePerNight}</p>
                    </div>
                    <Button className="gradient-primary text-primary-foreground">Book Now</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(hotel => (
              <Card key={hotel.hotelId} className="overflow-hidden hover:shadow-elevated transition-all">
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-64 h-48 md:h-auto bg-gradient-to-br from-warning/10 to-accent flex items-center justify-center shrink-0">
                    <span className="text-5xl">🏨</span>
                  </div>
                  <CardContent className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground text-lg">{hotel.name}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3.5 w-3.5" /> {hotel.city}, {hotel.country}
                          </p>
                        </div>
                        <Badge className="bg-primary text-primary-foreground">{hotel.starRating} <Star className="h-3 w-3 ml-1 fill-current" /></Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {hotel.amenities.map(a => (
                          <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <div>
                        <span className="text-xs text-muted-foreground">Per night from</span>
                        <p className="text-2xl font-bold text-primary">${hotel.pricePerNight}</p>
                      </div>
                      <Button className="gradient-primary text-primary-foreground">Book Now</Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
