import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, MapPin, Wifi, UtensilsCrossed, Dumbbell, Search, SlidersHorizontal, Grid3X3, List, Heart, X, ChevronDown, Map as MapIcon, ArrowUpDown, Users, Waves, Coffee, Hotel } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { searchHotels, type HotelOffer } from "@/lib/travelian-api";
import { useLocale } from "@/contexts/LocaleContext";

const amenityFilters = [
  { id: "wifi", label: "Free WiFi", icon: Wifi },
  { id: "pool", label: "Swimming Pool", icon: Waves },
  { id: "breakfast", label: "Breakfast", icon: Coffee },
  { id: "gym", label: "Fitness Center", icon: Dumbbell },
  { id: "restaurant", label: "Restaurant", icon: UtensilsCrossed },
];

const sortOptions = [
  { label: "Popular", value: "popular" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Rating", value: "rating" },
  { label: "Star Rating", value: "stars" },
];

export default function PublicHotelsPage() {
  const [params, setParams] = useSearchParams();
  const { currency } = useLocale();
  const [search, setSearch] = useState(params.get("location") || "");
  const [apiHotels, setApiHotels] = useState<HotelOffer[]>([]);
  const [apiStatus, setApiStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [apiMessage, setApiMessage] = useState("");
  const [starFilter, setStarFilter] = useState<number[]>([]);
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState("popular");
  const [showFilters, setShowFilters] = useState(true);

  const toggleStar = (s: number) => {
    setStarFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const toggleAmenity = (a: string) => {
    setSelectedAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  useEffect(() => {
    const controller = new AbortController();
    const checkIn = params.get("checkIn") || new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10);
    const checkOut = params.get("checkOut") || new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 10);
    const location = params.get("location") || search || "Dubai";
    const adults = Number(params.get("adults") || 2);

    setApiStatus("loading");
    searchHotels({
      location,
      checkIn,
      checkOut,
      rooms: 1,
      guests: { adults, children: 0 },
      currency,
    }, controller.signal)
      .then(result => {
        setApiHotels(result.hotels);
        setApiStatus("success");
        setApiMessage(result.hotels.length ? "" : "No hotel rates returned.");
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        setApiHotels([]);
        setApiStatus("error");
        setApiMessage(error instanceof Error ? error.message : "Hotel search failed.");
      });

    return () => controller.abort();
  }, [params, currency]);

  let filtered = apiHotels.filter(h => {
    if (search && !h.name.toLowerCase().includes(search.toLowerCase()) && !h.city.toLowerCase().includes(search.toLowerCase())) return false;
    if (starFilter.length > 0 && !starFilter.includes(h.starRating)) return false;
    if (h.pricePerNight < priceRange[0] || h.pricePerNight > priceRange[1]) return false;
    if (selectedAmenities.length > 0) {
      const hotelAmenities = h.amenities.map(a => a.toLowerCase());
      if (!selectedAmenities.every(sa => hotelAmenities.some(ha => ha.includes(sa)))) return false;
    }
    return true;
  });

  if (sort === "price-asc") filtered.sort((a, b) => a.pricePerNight - b.pricePerNight);
  else if (sort === "price-desc") filtered.sort((a, b) => b.pricePerNight - a.pricePerNight);
  else if (sort === "stars") filtered.sort((a, b) => b.starRating - a.starRating);

  const activeFilterCount = starFilter.length + selectedAmenities.length + (priceRange[0] > 0 || priceRange[1] < 500 ? 1 : 0);

  return (
    <div>
      {/* Search Header */}
      <section className="gradient-hero py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl md:text-3xl font-bold font-display text-primary-foreground mb-4">Hotels & Accommodation</h1>
          <div className="flex gap-2 max-w-3xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search hotel, city, or destination..." className="pl-9 h-11 bg-card" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button
              className="gradient-primary text-primary-foreground h-11"
              onClick={() => setParams(new URLSearchParams({
                location: search || "Dubai",
                checkIn: params.get("checkIn") || new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
                checkOut: params.get("checkOut") || new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 10),
                adults: params.get("adults") || "2",
                currency,
              }))}
            ><Search className="h-4 w-4" /></Button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="bg-primary text-primary-foreground h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              {apiStatus === "loading" ? "Searching Travelport hotel rates" : `${filtered.length} properties found`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                className="bg-transparent text-sm font-medium text-foreground border-0 focus:outline-none cursor-pointer"
                value={sort}
                onChange={e => setSort(e.target.value)}
              >
                {sortOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="w-px h-5 bg-border mx-1" />
            <Button size="icon" variant={view === "grid" ? "default" : "ghost"} onClick={() => setView("grid")} className="h-8 w-8">
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button size="icon" variant={view === "list" ? "default" : "ghost"} onClick={() => setView("list")} className="h-8 w-8">
              <List className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" className="gap-2 hidden md:flex">
              <MapIcon className="h-4 w-4" /> Map View
            </Button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Filters */}
          {showFilters && (
            <aside className="hidden md:block w-64 shrink-0 space-y-6">
              {/* Price Range */}
              <div className="bg-card rounded-xl p-5 shadow-card">
                <h3 className="font-semibold text-foreground text-sm mb-4">Price per night</h3>
                <Slider
                  value={priceRange}
                  onValueChange={setPriceRange}
                  min={0}
                  max={500}
                  step={10}
                  className="mb-3"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>PKR {priceRange[0]}</span>
                  <span>PKR {priceRange[1]}+</span>
                </div>
              </div>

              {/* Star Rating */}
              <div className="bg-card rounded-xl p-5 shadow-card">
                <h3 className="font-semibold text-foreground text-sm mb-3">Star Rating</h3>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer group">
                      <Checkbox
                        checked={starFilter.includes(s)}
                        onCheckedChange={() => toggleStar(s)}
                      />
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: s }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground group-hover:text-foreground">{s} Star</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Guest Rating */}
              <div className="bg-card rounded-xl p-5 shadow-card">
                <h3 className="font-semibold text-foreground text-sm mb-3">Guest Rating</h3>
                <div className="space-y-2">
                  {[
                    { label: "Exceptional", min: 9 },
                    { label: "Very Good", min: 8 },
                    { label: "Good", min: 7 },
                    { label: "Pleasant", min: 6 },
                  ].map(r => (
                    <label key={r.label} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox />
                      <span className="text-xs text-muted-foreground">{r.label} ({r.min}+)</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div className="bg-card rounded-xl p-5 shadow-card">
                <h3 className="font-semibold text-foreground text-sm mb-3">Amenities</h3>
                <div className="space-y-2">
                  {amenityFilters.map(a => (
                    <label key={a.id} className="flex items-center gap-2 cursor-pointer group">
                      <Checkbox
                        checked={selectedAmenities.includes(a.id)}
                        onCheckedChange={() => toggleAmenity(a.id)}
                      />
                      <a.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground group-hover:text-foreground">{a.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Property Type */}
              <div className="bg-card rounded-xl p-5 shadow-card">
                <h3 className="font-semibold text-foreground text-sm mb-3">Property Type</h3>
                <div className="space-y-2">
                  {["Hotels", "Resorts", "Apartments", "Villas", "Hostels"].map(t => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox />
                      <span className="text-xs text-muted-foreground">{t}</span>
                    </label>
                  ))}
                </div>
              </div>
            </aside>
          )}

          {/* Results */}
          <div className="flex-1 min-w-0">
            {apiStatus === "error" && (
              <div className="mb-4 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-warning">
                {apiMessage}
              </div>
            )}

            {apiStatus === "loading" && (
              <Card className="mb-4 border-primary/15 shadow-card">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold text-foreground">Searching Travelport hotel rates</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-1/3 animate-[premiumProgress_1.8s_ease-in-out_infinite] bg-gradient-to-r from-primary via-gold to-primary" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Active Filters */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {starFilter.map(s => (
                  <Badge key={s} variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => toggleStar(s)}>
                    {s} Star <X className="h-3 w-3" />
                  </Badge>
                ))}
                {selectedAmenities.map(a => (
                  <Badge key={a} variant="secondary" className="gap-1 text-xs cursor-pointer capitalize" onClick={() => toggleAmenity(a)}>
                    {a} <X className="h-3 w-3" />
                  </Badge>
                ))}
                <button className="text-xs text-primary hover:underline" onClick={() => { setStarFilter([]); setSelectedAmenities([]); setPriceRange([0, 500]); }}>
                  Clear all
                </button>
              </div>
            )}

            {apiStatus !== "loading" && view === "grid" ? (
              <div className={`grid gap-4 ${showFilters ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                {filtered.map(hotel => (
                  <Link to={`/hotel/${hotel.hotelId}`} key={hotel.hotelId}>
                    <Card className="overflow-hidden group hover:shadow-elevated transition-all h-full">
                      <div className="h-44 bg-gradient-to-br from-warning/10 to-accent relative flex items-center justify-center">
                        <Hotel className="h-12 w-12 text-primary/40 transition-transform group-hover:scale-110" />
                        <div className="absolute top-3 left-3 flex items-center gap-0.5">
                          {Array.from({ length: hotel.starRating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-warning text-warning" />
                          ))}
                        </div>
                        <button className="absolute top-3 right-3 h-7 w-7 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-foreground/40 transition-colors">
                          <Heart className="h-3.5 w-3.5" />
                        </button>
                        {hotel.refundable && <Badge className="absolute bottom-3 left-3 bg-success/90 text-success-foreground border-0 text-[10px]">Refundable</Badge>}
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground text-sm truncate">{hotel.name}</h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 shrink-0" /> {hotel.city}, {hotel.country}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {hotel.amenities.slice(0, 3).map(a => (
                            <span key={a} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{a}</span>
                          ))}
                        </div>
                        <div className="flex items-end justify-between mt-3 pt-3 border-t">
                          <div>
                            <p className="text-lg font-bold text-foreground">{hotel.currency} {hotel.pricePerNight}<span className="text-[10px] font-normal text-muted-foreground">/night</span></p>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{hotel.rooms} room option{hotel.rooms === 1 ? "" : "s"}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : apiStatus !== "loading" ? (
              <div className="space-y-4">
                {filtered.map(hotel => (
                  <Link to={`/hotel/${hotel.hotelId}`} key={hotel.hotelId}>
                    <Card className="overflow-hidden hover:shadow-elevated transition-all">
                      <div className="flex flex-col md:flex-row">
                        <div className="w-full md:w-72 h-48 md:h-auto bg-gradient-to-br from-warning/10 to-accent flex items-center justify-center shrink-0 relative">
                          <Hotel className="h-12 w-12 text-primary/40" />
                          <button className="absolute top-3 right-3 h-7 w-7 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground">
                            <Heart className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <CardContent className="p-5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-1 mb-1">
                                  {Array.from({ length: hotel.starRating }).map((_, i) => (
                                    <Star key={i} className="h-3 w-3 fill-warning text-warning" />
                                  ))}
                                </div>
                                <h3 className="font-semibold text-foreground text-lg">{hotel.name}</h3>
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3.5 w-3.5" /> {hotel.city}, {hotel.country}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {hotel.amenities.map(a => (
                                <span key={a} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{a}</span>
                              ))}
                            </div>
                            {hotel.refundable && <Badge className="mt-2 bg-success/10 text-success border-0 text-[10px]">Refundable</Badge>}
                          </div>
                          <div className="flex items-end justify-between mt-4 pt-3 border-t">
                            <div>
                              <span className="text-xs text-muted-foreground">Per night</span>
                              <p className="text-2xl font-bold text-foreground">{hotel.currency} {hotel.pricePerNight}</p>
                            </div>
                            <Button className="gradient-primary text-primary-foreground">Select Room</Button>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : null}

            {apiStatus !== "loading" && filtered.length === 0 && (
              <div className="text-center py-16">
                <MapIcon className="mx-auto mb-4 h-14 w-14 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No properties found</h3>
                <p className="text-sm text-muted-foreground mb-4">No hotel rates returned. Try another city or date.</p>
                <Button variant="outline" onClick={() => { setStarFilter([]); setSelectedAmenities([]); setPriceRange([0, 500]); setSearch(""); }}>
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto mt-14">
          <h2 className="text-lg font-bold text-foreground mb-4 text-center">Hotel Booking FAQs</h2>
          <Accordion type="single" collapsible>
            {[
              { q: "Can I cancel my hotel booking?", a: "Cancellation terms depend on the selected rate. Confirm the supplier terms before booking." },
              { q: "When am I charged?", a: "Either at booking or at the property, depending on the rate selected." },
              { q: "Are taxes included?", a: "Prices shown include applicable taxes unless noted otherwise." },
            ].map((f, i) => (
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




