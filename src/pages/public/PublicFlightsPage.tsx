import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plane, Search, Wifi, Coffee, ArrowLeftRight, Shield, Luggage, CalendarIcon, Pencil } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { SEO } from "@/components/SEO";
import { TravelersClassPicker, formatTravelers, type TravelersValue } from "@/components/public/TravelersClassPicker";
import { searchFlights, type TravelianFlight } from "@/lib/travelian-api";
import { AirportCombobox } from "@/components/public/AirportCombobox";
import { FlightSearchLoader } from "@/components/public/FlightSearchLoader";
import { CURRENCIES, useLocale, type CurrencyCode } from "@/contexts/LocaleContext";
import { AirlineLogo } from "@/components/public/AirlineLogo";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";

export default function PublicFlightsPage({ bookingPath = "/booking", adminMode = false }: { bookingPath?: string; adminMode?: boolean } = {}) {
  const { currency: selectedCurrency, setCurrency } = useLocale();
  const [params, setParams] = useSearchParams();
  const initFrom = params.get("from") || "LHE";
  const initTo = params.get("to") || "JED";
  const initDateStr = params.get("depart");
  const initCabin = params.get("cabin") || "Economy";
  const initCurrency = (params.get("currency") as CurrencyCode) || selectedCurrency || "PKR";
  const initAdults = parseInt(params.get("adults") || "1") || 1;
  const initChildren = parseInt(params.get("children") || "0") || 0;
  const initInfants = parseInt(params.get("infants") || "0") || 0;
  const initDate = initDateStr ? new Date(initDateStr) : new Date();

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(initFrom);
  const [to, setTo] = useState(initTo);
  const [currency, setSearchCurrency] = useState<CurrencyCode>(initCurrency);
  const [travelers, setTravelers] = useState<TravelersValue>({
    adults: initAdults, children: initChildren, infants: initInfants, cabin: initCabin,
  });
  const [priceRange, setPriceRange] = useState([0, 700]);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [sort, setSort] = useState("best");
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
  const [departDate, setDepartDate] = useState<Date>(initDate);
  const [selectedDayIndex, setSelectedDayIndex] = useState(3);
  const [modifyOpen, setModifyOpen] = useState(false);
  const [apiFlights, setApiFlights] = useState<TravelianFlight[]>([]);
  const [apiStatus, setApiStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [apiMessage, setApiMessage] = useState("");

  // Modal-local edit state
  const [editFrom, setEditFrom] = useState(from);
  const [editTo, setEditTo] = useState(to);
  const [editDate, setEditDate] = useState<Date | undefined>(departDate);
  const [editTravelers, setEditTravelers] = useState<TravelersValue>(travelers);
  const [editCurrency, setEditCurrency] = useState<CurrencyCode>(currency);

  const openModify = () => {
    setEditFrom(from);
    setEditTo(to);
    setEditDate(departDate);
    setEditTravelers(travelers);
    setEditCurrency(currency);
    setModifyOpen(true);
  };

  const applyModify = () => {
    setFrom(editFrom);
    setTo(editTo);
    if (editDate) setDepartDate(editDate);
    setTravelers(editTravelers);
    setSearchCurrency(editCurrency);
    setCurrency(editCurrency);
    setSelectedAirlines([]);
    setSelectedFlight(null);
    setParams(new URLSearchParams({
      from: editFrom,
      to: editTo,
      depart: editDate ? format(editDate, "yyyy-MM-dd") : format(departDate, "yyyy-MM-dd"),
      adults: String(editTravelers.adults),
      children: String(editTravelers.children),
      infants: String(editTravelers.infants),
      cabin: editTravelers.cabin,
      currency: editCurrency,
    }), { replace: true });
    setModifyOpen(false);
  };

  const swapEdit = () => {
    setEditFrom(editTo);
    setEditTo(editFrom);
  };

  const toggleAirline = (a: string) => setSelectedAirlines(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  useEffect(() => {
    const controller = new AbortController();
    setApiStatus("loading");
    setApiMessage("Searching live providers...");

    searchFlights({
      from,
      to,
      departureDate: format(departDate, "yyyy-MM-dd"),
      cabin: travelers.cabin,
      currency,
      passengers: {
        adults: travelers.adults,
        children: travelers.children,
        infants: travelers.infants,
      },
    }, controller.signal)
      .then(result => {
        setApiFlights(result.flights);
        const liveMaxPrice = Math.max(700, ...result.flights.map(f => f.price));
        setPriceRange([0, Math.ceil(liveMaxPrice / 1000) * 1000]);
        setApiStatus("success");
        setApiMessage(result.flights.length ? "" : "No live fares found for this search.");
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        setApiFlights([]);
        setApiStatus("error");
        setApiMessage(error instanceof Error ? error.message : "Live flight search is unavailable. Please modify your search and try again.");
      });

    return () => controller.abort();
  }, [from, to, departDate, travelers, currency]);

  const flights = apiFlights;
  const maxPrice = Math.max(700, ...flights.map(f => f.price));

  let filtered = flights.filter(f => {
    if (search && !f.origin.toLowerCase().includes(search.toLowerCase()) && !f.destination.toLowerCase().includes(search.toLowerCase()) && !f.airline.toLowerCase().includes(search.toLowerCase())) return false;
    if (f.price < priceRange[0] || f.price > priceRange[1]) return false;
    if (selectedAirlines.length > 0 && !selectedAirlines.includes(f.airline)) return false;
    return true;
  });

  if (sort === "price-asc") filtered.sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") filtered.sort((a, b) => b.price - a.price);

  const getDuration = (dep: string, arr: string) => {
    const ms = new Date(arr).getTime() - new Date(dep).getTime();
    return `${Math.floor(ms / 3600000)}h ${Math.round((ms % 3600000) / 60000)}m`;
  };

  const formatFare = (price: number, currency = "PKR") => {
    return `${currency || "PKR"} ${Math.round(price).toLocaleString()}`;
  };

  const flightWhatsAppHref = (flight: TravelianFlight) => {
    const message = [
      "Hello Travelian,",
      "",
      "I need help with this flight:",
      "",
      `Airline: ${flight.airline}`,
      `Flight: ${flight.flightNumber}`,
      `Route: ${flight.origin} to ${flight.destination}`,
      `Date: ${format(departDate, "MMM dd, yyyy")}`,
      `Cabin: ${flight.class}`,
      `Fare: ${formatFare(flight.price, flight.currency)}`,
      "",
      "Please guide me with booking details.",
    ].join("\n");
    return `https://wa.me/923244440014?text=${encodeURIComponent(message)}`;
  };

  const bestFlight = filtered.length > 0 ? filtered.reduce((best, f) => f.price < best.price ? f : best, filtered[0]) : null;
  const fastestFlight = filtered.length > 0 ? filtered.reduce((fast, f) => {
    const fDur = new Date(f.arrivalTime).getTime() - new Date(f.departureTime).getTime();
    const fastDur = new Date(fast.arrivalTime).getTime() - new Date(fast.departureTime).getTime();
    return fDur < fastDur ? f : fast;
  }, filtered[0]) : null;

  // 7 days centered around selected date (index 3 = center)
  const dateFlexDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(departDate, i - 3);
      return { date: d };
    });
  }, [departDate]);

  return (
    <div className={adminMode ? "-m-4 md:-m-6 bg-muted/30 min-h-[calc(100vh-3.5rem)]" : ""}>
      <SEO
        title={`Flights ${from} to ${to} - Travelian`}
        description={`Compare available ${from} to ${to} flight fares for ${format(departDate, "PPP")}.`}
      />
      {/* Visually-hidden H1 for SEO/a11y, keeps premium look intact */}
      <h1 className="sr-only">Flight search results: {from} to {to}</h1>

      {/* Search summary */}
      <section className={cn("gradient-hero z-30 shadow-md", adminMode ? "py-2" : "py-4")}>
        <div className={cn(adminMode ? "px-4 md:px-6" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8")}>
          <div className="bg-card/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-primary-foreground/10">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-primary-foreground text-sm flex-wrap min-w-0">
                <Plane className="h-4 w-4 shrink-0" />
                <span className="font-semibold truncate">{from}</span>
                <ArrowLeftRight className="h-3.5 w-3.5 opacity-60 shrink-0" />
                <span className="font-semibold truncate">{to}</span>
                <span className="text-primary-foreground/60 text-xs">-</span>
                <span className="text-primary-foreground/80 text-xs whitespace-nowrap">{format(departDate, "EEE, MMM d")}</span>
                <span className="text-primary-foreground/60 text-xs">-</span>
                <span className="text-primary-foreground/80 text-xs whitespace-nowrap">{formatTravelers(travelers)}</span>
                <span className="text-primary-foreground/60 text-xs">-</span>
                <span className="text-primary-foreground/80 text-xs whitespace-nowrap">{currency}</span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={openModify}
                className="rounded-lg gap-2"
              >
                <Pencil className="h-3.5 w-3.5" /> Modify Search
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Date flexibility row with centered "See Price" subtitle */}
      <div className="bg-card border-b">
        <div className={cn(adminMode ? "px-4 md:px-6" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8")}>
          <div className="flex items-center justify-center gap-1.5 py-3 overflow-x-auto scrollbar-hide">
            {dateFlexDays.map((day, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelectedDayIndex(i);
                  setDepartDate(day.date);
                  setSelectedDayIndex(3);
                }}
                className={cn(
                  "flex flex-col items-center px-4 py-2 rounded-xl text-xs font-medium transition-all min-w-[100px] shrink-0",
                  selectedDayIndex === i
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                <span>{format(day.date, "EEE, MMM d")}</span>
                <span className={cn("text-[10px] mt-0.5", selectedDayIndex === i ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  See Price
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={cn(adminMode ? "px-4 md:px-6 py-5" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6")}>
        {/* Sort Tags */}
        <div className="flex items-center gap-3 mb-6 overflow-x-auto scrollbar-hide">
          {[
            { id: "best", label: "Best", sub: bestFlight ? formatFare(bestFlight.price, bestFlight.currency) : "" },
            { id: "price-asc", label: "Cheapest", sub: bestFlight ? formatFare(bestFlight.price, bestFlight.currency) : "" },
            { id: "fastest", label: "Fastest", sub: fastestFlight ? getDuration(fastestFlight.departureTime, fastestFlight.arrivalTime) : "" },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                sort === s.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground border hover:border-primary/30"
              }`}
            >
              {s.label}
              {s.sub && <span className="text-xs opacity-70">{s.sub}</span>}
            </button>
          ))}
          <span className="text-sm text-muted-foreground ml-auto shrink-0">
            {apiStatus === "loading" ? "Searching live fares" : `${filtered.length} flights found`}
          </span>
        </div>

        {apiStatus === "error" && (
          <div className="mb-5 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-warning">
            <span>{apiMessage}</span>
          </div>
        )}

        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <aside className="hidden md:block w-56 xl:w-64 shrink-0 space-y-5">
            <Card className="shadow-card border-0">
              <CardContent className="p-5">
                <h3 className="font-semibold text-foreground text-sm mb-4">Price Range</h3>
                <Slider value={priceRange} onValueChange={setPriceRange} min={0} max={Math.max(700, Math.ceil(maxPrice / 1000) * 1000)} step={100} className="mb-3" />
                <div className="flex justify-between text-xs text-muted-foreground"><span>{formatFare(priceRange[0], currency)}</span><span>{formatFare(priceRange[1], currency)}</span></div>
              </CardContent>
            </Card>
            <Card className="shadow-card border-0">
              <CardContent className="p-5">
                <h3 className="font-semibold text-foreground text-sm mb-3">Airlines</h3>
                <div className="space-y-2.5">
                  {Array.from(new Set(flights.map(f => f.airline))).map(a => (
                    <label key={a} className="flex items-center gap-2 cursor-pointer group">
                      <Checkbox checked={selectedAirlines.includes(a)} onCheckedChange={() => toggleAirline(a)} />
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{a}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card border-0">
              <CardContent className="p-5">
                <h3 className="font-semibold text-foreground text-sm mb-3">Stops</h3>
                <div className="space-y-2.5">
                  {["Non-stop", "1 Stop", "2+ Stops"].map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox /><span className="text-xs text-muted-foreground">{s}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card border-0">
              <CardContent className="p-5">
                <h3 className="font-semibold text-foreground text-sm mb-3">Departure Time</h3>
                <div className="space-y-2.5">
                  {["Early Morning (00-06)", "Morning (06-12)", "Afternoon (12-18)", "Evening (18-24)"].map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox /><span className="text-xs text-muted-foreground">{s}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Results */}
          <div className="flex-1 space-y-4">
            {apiStatus === "loading" && <FlightSearchLoader from={from} to={to} />}

            {apiStatus !== "loading" && filtered.map((flight, idx) => {
              const isBest = bestFlight?.flightId === flight.flightId;
              const isCheapest = sort === "price-asc" && idx === 0;
              const isFastest = fastestFlight?.flightId === flight.flightId;

              return (
                <Card
                  key={flight.flightId}
                  className={`overflow-hidden transition-all duration-300 border-0 shadow-card hover:shadow-hover cursor-pointer ${
                    selectedFlight === flight.flightId ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedFlight(flight.flightId)}
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <AirlineLogo airline={flight.airline} flightNumber={flight.flightNumber} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-sm font-semibold text-foreground">{flight.airline}</p>
                            <Badge variant="secondary" className="text-[10px] rounded-md">{flight.flightNumber}</Badge>
                            <Badge variant="outline" className="text-[10px] capitalize rounded-md">{flight.class}</Badge>
                            {isBest && <Badge className="bg-gold text-gold-foreground border-0 text-[10px] rounded-md">Best</Badge>}
                            {isCheapest && <Badge className="bg-success/10 text-success border-0 text-[10px] rounded-md">Cheapest</Badge>}
                            {isFastest && <Badge className="bg-info/10 text-info border-0 text-[10px] rounded-md">Fastest</Badge>}
                            {flight.status === 'delayed' && <Badge className="bg-warning/10 text-warning border-0 text-[10px] rounded-md">Delayed</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-3">
                            <div className="text-center">
                              <p className="text-xl font-bold text-foreground">{flight.departureTime.split(' ')[1]}</p>
                              <p className="text-xs text-muted-foreground">{flight.origin}</p>
                            </div>
                            <div className="flex-1 flex flex-col items-center px-2">
                              <span className="text-[10px] text-muted-foreground font-medium">{getDuration(flight.departureTime, flight.arrivalTime)}</span>
                              <div className="w-full h-px bg-border my-1.5 relative">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border-2 border-primary bg-card" />
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-primary" />
                              </div>
                              <span className="text-[10px] text-success font-medium">Non-stop</span>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold text-foreground">{flight.arrivalTime.split(' ')[1]}</p>
                              <p className="text-xs text-muted-foreground">{flight.destination}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 md:border-l md:pl-5">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-foreground">{formatFare(flight.price, flight.currency)}</p>
                          <p className="text-[10px] text-muted-foreground">per person, incl. tax</p>
                          <div className="flex items-center gap-1.5 mt-1.5 justify-end">
                            <Wifi className="h-3 w-3 text-muted-foreground" />
                            <Luggage className="h-3 w-3 text-muted-foreground" />
                            <Coffee className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Link to={`${bookingPath}?type=flight&flightId=${flight.flightId}&airline=${encodeURIComponent(flight.airline)}&flightNo=${encodeURIComponent(flight.flightNumber)}&from=${encodeURIComponent(flight.origin)}&to=${encodeURIComponent(flight.destination)}&date=${encodeURIComponent(format(departDate, "MMM dd, yyyy"))}&cabin=${encodeURIComponent(flight.class)}&price=${flight.price}&currency=${encodeURIComponent(flight.currency || "PKR")}`}>
                            <Button className="gradient-primary text-primary-foreground rounded-xl h-11 px-5">Continue Booking</Button>
                          </Link>
                          <a href={flightWhatsAppHref(flight)} target="_blank" rel="noreferrer">
                            <Button variant="outline" size="sm" className="w-full rounded-xl gap-2">
                              <WhatsAppIcon className="h-4 w-4" /> WhatsApp Help
                            </Button>
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Expanded fare options */}
                    {selectedFlight === flight.flightId && (
                      <div className="mt-5 pt-5 border-t grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-in">
                        {(flight.fareOptions || []).length === 0 && (
                          <div className="md:col-span-3 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                            Fare options were not returned by the provider for this offer. Continue with the main fare.
                          </div>
                        )}
                        {(flight.fareOptions || []).map(fare => (
                          <div
                            key={fare.tier}
                            className={`border rounded-xl p-4 relative transition-all hover:border-primary/50 ${
                              fare.popular ? "border-gold bg-gold-light/30 shadow-premium" : ""
                            }`}
                          >
                            {fare.popular && (
                              <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gold text-gold-foreground border-0 text-[10px]">
                                Popular
                              </Badge>
                            )}
                            <h4 className="font-semibold text-foreground text-sm">{fare.tier}</h4>
                            <p className="text-xl font-bold text-foreground mt-1">{formatFare(fare.price.total, fare.price.currency || flight.currency)}</p>
                            <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                              <p className="flex items-center gap-1.5"><Luggage className="h-3 w-3" /> {fare.bags}</p>
                              <p className="flex items-center gap-1.5"><ArrowLeftRight className="h-3 w-3" /> {fare.change}</p>
                              <p className="flex items-center gap-1.5"><Shield className="h-3 w-3" /> {fare.refund}</p>
                            </div>
                            <Link to={`${bookingPath}?type=flight&flightId=${flight.flightId}&airline=${encodeURIComponent(flight.airline)}&flightNo=${encodeURIComponent(flight.flightNumber)}&from=${encodeURIComponent(flight.origin)}&to=${encodeURIComponent(flight.destination)}&date=${encodeURIComponent(format(departDate, "MMM dd, yyyy"))}&cabin=${encodeURIComponent(flight.class)}&fare=${fare.tier}&price=${fare.price.total}&currency=${encodeURIComponent(fare.price.currency || flight.currency || "PKR")}`}>
                              <Button
                                size="sm"
                                className={`w-full mt-3 rounded-lg ${fare.popular ? "gradient-primary text-primary-foreground" : ""}`}
                                variant={fare.popular ? "default" : "outline"}
                              >
                                Continue {fare.tier}
                              </Button>
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {apiStatus !== "loading" && filtered.length === 0 && (
              <div className="text-center py-16">
                <Plane className="mx-auto mb-4 h-14 w-14 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No flights found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  No bookable live fares returned. Modify the search and try again.
                </p>
                <Button variant="outline" className="rounded-lg" onClick={() => { setSelectedAirlines([]); setPriceRange([0, 700]); setSearch(""); }}>
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modify Search Dialog */}
      <Dialog open={modifyOpen} onOpenChange={setModifyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modify Search</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">From</label>
                <AirportCombobox value={editFrom} onChange={setEditFrom} className="h-11" placeholder="From airport" />
              </div>
              <div className="hidden sm:flex items-center justify-center pb-1">
                <button type="button" onClick={swapEdit} aria-label="Swap origin and destination" className="h-9 w-9 rounded-full border-2 border-primary/30 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                  <ArrowLeftRight className="h-4 w-4" />
                </button>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">To</label>
                <AirportCombobox value={editTo} onChange={setEditTo} className="h-11" placeholder="To airport" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Departure Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="flex items-center gap-2 h-11 w-full bg-background border border-input rounded-xl px-3 text-sm text-left">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    {editDate ? format(editDate, "MMM dd, yyyy") : "Select date"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[300]" align="start" side="bottom" sideOffset={8} avoidCollisions={false}>
                  <Calendar mode="single" selected={editDate} onSelect={setEditDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Travelers & Class</label>
              <TravelersClassPicker value={editTravelers} onChange={setEditTravelers} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Currency</label>
              <select
                value={editCurrency}
                onChange={(event) => setEditCurrency(event.target.value as CurrencyCode)}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                {CURRENCIES.map(option => (
                  <option key={option.code} value={option.code}>{option.code} - {option.label}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModifyOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={applyModify} className="gradient-primary text-primary-foreground rounded-xl">
              <Search className="h-4 w-4 mr-2" /> Search Flights
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
