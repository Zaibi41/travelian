import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, MapPin, Wifi, UtensilsCrossed, Dumbbell, SlidersHorizontal, X, Map as MapIcon, ArrowUpDown, Waves, Coffee, Hotel } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { searchHotels, type HotelOffer } from "@/lib/travelian-api";
import { useLocale } from "@/contexts/LocaleContext";
import { addDays } from "date-fns";
import { formatDateOnly } from "@/lib/date-only";
import { HotelSearchBar } from "@/components/public/HotelSearchBar";

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
  const [retry, setRetry] = useState(0);
  const searchValues = useMemo(() => {
    const count = (key: string, fallback: number, min: number) => Math.max(min, Math.min(20, Number(params.get(key)) || fallback));
    const adults = count("adults", 2, 1);
    return {
      location: params.get("location") || "",
      checkIn: params.get("checkIn") || formatDateOnly(addDays(new Date(), 7)),
      checkOut: params.get("checkOut") || formatDateOnly(addDays(new Date(), 10)),
      adults, children: count("children", 0, 0), rooms: Math.min(adults, count("rooms", 1, 1)),
    };
  }, [params]);
  const hasSearch = !!params.get("location");
  const [apiHotels, setApiHotels] = useState<HotelOffer[]>([]);
  const [apiStatus, setApiStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [apiMessage, setApiMessage] = useState("");
  const [starFilter, setStarFilter] = useState<number[]>([]);
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const priceMaximum = Math.max(100000, ...apiHotels.map(h => Math.ceil(h.pricePerNight / 1000) * 1000));
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [sort, setSort] = useState("popular");
  const [showFilters, setShowFilters] = useState(() => window.innerWidth >= 768);
  const [failedImages, setFailedImages] = useState<string[]>([]);

  const toggleStar = (s: number) => {
    setStarFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const toggleAmenity = (a: string) => {
    setSelectedAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  useEffect(() => {
    if (!hasSearch) { setApiStatus("idle"); setApiHotels([]); return; }
    const controller = new AbortController();
    setApiStatus("loading");
    setApiMessage("");
    searchHotels({ ...searchValues, guests: { adults: searchValues.adults, children: searchValues.children }, currency }, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return;
        setApiHotels(result.hotels);
        setApiStatus("success");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setApiHotels([]);
        setApiStatus("error");
        setApiMessage("Hotel rates could not be loaded. Please try again shortly.");
      });
    return () => controller.abort();
  }, [searchValues, hasSearch, currency, retry]);

  let filtered = apiHotels.filter(h => {
    if (starFilter.length > 0 && !starFilter.includes(h.starRating)) return false;
    if (h.pricePerNight < priceRange[0] || (priceRange[1] < 100000 && h.pricePerNight > priceRange[1])) return false;
    if (selectedAmenities.length > 0) {
      const hotelAmenities = h.amenities.map(a => a.toLowerCase());
      if (!selectedAmenities.every(sa => hotelAmenities.some(ha => ha.includes(sa)))) return false;
    }
    return true;
  });

  if (sort === "price-asc") filtered.sort((a, b) => a.pricePerNight - b.pricePerNight);
  else if (sort === "price-desc") filtered.sort((a, b) => b.pricePerNight - a.pricePerNight);
  else if (sort === "stars" || sort === "rating") filtered.sort((a, b) => b.starRating - a.starRating);

  const activeFilterCount = starFilter.length + selectedAmenities.length + (priceRange[0] > 0 || priceRange[1] < 100000 ? 1 : 0);

  return (
    <div>
      <section className="border-b bg-card py-5 md:py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-4 font-display text-xl font-bold text-foreground">{hasSearch ? `Hotels in ${searchValues.location}` : "Hotels & Accommodation"}</h1>
          <HotelSearchBar initialValues={searchValues} loading={apiStatus === "loading"} onSearch={values => {
            setParams(new URLSearchParams({ location: values.location, checkIn: values.checkIn, checkOut: values.checkOut, adults: String(values.adults), children: String(values.children), rooms: String(values.rooms), currency }));
            setRetry(value => value + 1);
          }} />
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
              {apiStatus === "loading" ? "Searching hotel rates…" : hasSearch ? `${filtered.length} properties found` : "Find your next stay"}
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

          </div>
        </div>

        <div className="flex flex-col gap-6 md:flex-row">
          {/* Sidebar Filters */}
          {showFilters && (
            <aside className="grid w-full shrink-0 gap-4 sm:grid-cols-2 md:block md:w-56 md:space-y-4">
              {/* Price Range */}
              <div className="bg-card rounded-xl p-5 shadow-card">
                <h3 className="font-semibold text-foreground text-sm mb-4">Price per night</h3>
                <Slider
                  value={priceRange}
                  onValueChange={setPriceRange}
                  min={0}
                  max={priceMaximum}
                  step={100}
                  className="mb-3"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{currency} {priceRange[0].toLocaleString()}</span>
                  <span>{currency} {priceRange[1].toLocaleString()}{priceRange[1] >= 100000 ? "+" : ""}</span>
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
                          <Star key={i} className="h-3.5 w-3.5 fill-gold text-gold" />
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
                {apiMessage} <Button variant="outline" size="sm" className="ml-2" onClick={() => setRetry(value => value + 1)}>Try again</Button>
              </div>
            )}

            {apiStatus === "loading" && (
              <Card className="mb-4 border-primary/15 shadow-card">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold text-foreground">Searching hotel rates</p>
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
                <Button variant="ghost" size="sm" className="text-xs text-primary hover:underline" onClick={() => { setStarFilter([]); setSelectedAmenities([]); setPriceRange([0, 100000]); }}>
                  Clear all
                </Button>
              </div>
            )}

            {apiStatus === "success" && (
              <div className="space-y-4">
                {filtered.map(hotel => (
                  <Card key={hotel.hotelId} className="overflow-hidden rounded-lg shadow-card transition-shadow hover:shadow-elevated">
                    <div className="grid md:grid-cols-[180px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_190px]">
                      <Link to={`/hotel/${encodeURIComponent(hotel.hotelId)}`} aria-label={`View ${hotel.name}`} className="flex aspect-[16/9] items-center justify-center bg-muted md:aspect-auto md:min-h-48">
                        {hotel.image && !failedImages.includes(hotel.hotelId) ? <img src={hotel.image} alt={hotel.name} className="h-full max-h-64 w-full object-cover md:max-h-none" loading="lazy" onError={() => setFailedImages(current => [...current, hotel.hotelId])} /> : <Hotel className="h-12 w-12 text-muted-foreground" />}
                      </Link>
                      <div className="min-w-0 p-4">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Link to={`/hotel/${encodeURIComponent(hotel.hotelId)}`} className="min-w-0 max-w-full"><h2 className="break-words text-base font-bold text-foreground">{hotel.name}</h2></Link>
                          <div className="flex shrink-0 gap-0.5" aria-label={`${hotel.starRating} stars`}>{Array.from({ length: Math.max(0, Math.min(5, hotel.starRating)) }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-gold text-gold" />)}</div>
                        </div>
                        <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{hotel.city}, {hotel.country}</span></p>
                        {hotel.refundable && <p className="mt-3 text-xs font-semibold text-success">Refundable rate available</p>}
                        <div className="mt-3 grid gap-x-3 gap-y-2 sm:grid-cols-2">{hotel.amenities.slice(0, 6).map(amenity => <span key={amenity} className="truncate text-xs text-muted-foreground">{amenity}</span>)}</div>
                      </div>
                      <div className="flex items-end justify-between gap-3 border-t p-4 md:col-span-2 xl:col-span-1 xl:flex-col xl:justify-center xl:border-l xl:border-t-0 xl:text-right">
                        <div className="min-w-0"><p className="text-xs text-muted-foreground">Per night</p><p className="break-words text-xl font-bold text-foreground">{hotel.currency} {hotel.pricePerNight.toLocaleString()}</p><p className="mt-1 text-xs text-muted-foreground">{hotel.rooms} room option{hotel.rooms === 1 ? "" : "s"}</p></div>
                        <Button asChild size="sm" className="shrink-0"><Link to={`/hotel/${encodeURIComponent(hotel.hotelId)}`}>Select Room</Link></Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {apiStatus === "success" && filtered.length === 0 && (
              <div className="text-center py-16">
                <MapIcon className="mx-auto mb-4 h-14 w-14 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No properties found</h3>
                <p className="text-sm text-muted-foreground mb-4">No hotel rates returned. Try another city or date.</p>
                <Button variant="outline" onClick={() => { setStarFilter([]); setSelectedAmenities([]); setPriceRange([0, 100000]); }}>
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




