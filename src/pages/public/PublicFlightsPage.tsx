import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Plane, Search, ArrowUpDown, Wifi, Briefcase, Coffee, ArrowLeftRight, Calendar, Users, MapPin, Clock, Shield, Award, ChevronDown, Luggage } from "lucide-react";
import { mockFlights } from "@/data/mock";
import { Link } from "react-router-dom";

export default function PublicFlightsPage() {
  const [search, setSearch] = useState("");
  const [priceRange, setPriceRange] = useState([0, 700]);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [sort, setSort] = useState("best");
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);

  const toggleAirline = (a: string) => setSelectedAirlines(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  let filtered = mockFlights.filter(f => {
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

  const bestFlight = filtered.length > 0 ? filtered.reduce((best, f) => f.price < best.price ? f : best, filtered[0]) : null;
  const fastestFlight = filtered.length > 0 ? filtered.reduce((fast, f) => {
    const fDur = new Date(f.arrivalTime).getTime() - new Date(f.departureTime).getTime();
    const fastDur = new Date(fast.arrivalTime).getTime() - new Date(fast.departureTime).getTime();
    return fDur < fastDur ? f : fast;
  }, filtered[0]) : null;

  return (
    <div>
      {/* Editable Search Hero */}
      <section className="gradient-hero py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl md:text-3xl font-bold font-display text-primary-foreground mb-4">Search Flights</h1>
          <div className="bg-card/10 backdrop-blur-sm rounded-2xl p-4 border border-primary-foreground/10">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="relative md:col-span-3">
                <Plane className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="From where?" className="pl-9 h-12 bg-card rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="hidden md:flex items-center justify-center md:col-span-1">
                <button className="h-9 w-9 rounded-full border-2 border-primary-foreground/30 flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/10 transition-colors">
                  <ArrowLeftRight className="h-4 w-4" />
                </button>
              </div>
              <div className="relative md:col-span-3">
                <Plane className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground rotate-90" />
                <Input placeholder="To where?" className="pl-9 h-12 bg-card rounded-xl" />
              </div>
              <div className="relative md:col-span-2">
                <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input type="date" className="pl-9 h-12 bg-card rounded-xl" />
              </div>
              <div className="relative md:col-span-2">
                <Users className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="1 Adult, Economy" className="pl-9 h-12 bg-card rounded-xl" />
              </div>
              <Button className="md:col-span-1 h-12 gradient-primary text-primary-foreground rounded-xl">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Sort Tags */}
        <div className="flex items-center gap-3 mb-6 overflow-x-auto scrollbar-hide">
          {[
            { id: "best", label: "Best", sub: bestFlight ? `$${bestFlight.price}` : "" },
            { id: "price-asc", label: "Cheapest", sub: bestFlight ? `$${bestFlight.price}` : "" },
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
          <span className="text-sm text-muted-foreground ml-auto shrink-0">{filtered.length} flights found</span>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <aside className="hidden md:block w-64 shrink-0 space-y-5">
            <Card className="shadow-card border-0">
              <CardContent className="p-5">
                <h3 className="font-semibold text-foreground text-sm mb-4">Price Range</h3>
                <Slider value={priceRange} onValueChange={setPriceRange} min={0} max={700} step={10} className="mb-3" />
                <div className="flex justify-between text-xs text-muted-foreground"><span>${priceRange[0]}</span><span>${priceRange[1]}</span></div>
              </CardContent>
            </Card>
            <Card className="shadow-card border-0">
              <CardContent className="p-5">
                <h3 className="font-semibold text-foreground text-sm mb-3">Airlines</h3>
                <div className="space-y-2.5">
                  {["Saudi Airlines", "PIA", "Emirates", "Turkish Airlines"].map(a => (
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
            {filtered.map((flight, idx) => {
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
                        <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
                          <Plane className="h-6 w-6 text-primary" />
                        </div>
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
                          <p className="text-2xl font-bold text-foreground">${flight.price}</p>
                          <p className="text-[10px] text-muted-foreground">per person, incl. tax</p>
                          <div className="flex items-center gap-1.5 mt-1.5 justify-end">
                            <Wifi className="h-3 w-3 text-muted-foreground" />
                            <Luggage className="h-3 w-3 text-muted-foreground" />
                            <Coffee className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>
                        <Link to="/booking">
                          <Button className="gradient-primary text-primary-foreground rounded-xl h-11 px-5">Select</Button>
                        </Link>
                      </div>
                    </div>

                    {/* Expanded fare options */}
                    {selectedFlight === flight.flightId && (
                      <div className="mt-5 pt-5 border-t grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-in">
                        {[
                          { tier: "Basic", price: flight.price, bags: "1 carry-on", change: "No changes", refund: "Non-refundable" },
                          { tier: "Standard", price: flight.price + 60, bags: "1 carry-on + 1 checked", change: "Change for $50", refund: "Partial refund", popular: true },
                          { tier: "Flex", price: flight.price + 130, bags: "2 checked + 1 carry-on", change: "Free changes", refund: "Full refund" },
                        ].map(fare => (
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
                            <p className="text-xl font-bold text-foreground mt-1">${fare.price}</p>
                            <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                              <p className="flex items-center gap-1.5"><Luggage className="h-3 w-3" /> {fare.bags}</p>
                              <p className="flex items-center gap-1.5"><ArrowLeftRight className="h-3 w-3" /> {fare.change}</p>
                              <p className="flex items-center gap-1.5"><Shield className="h-3 w-3" /> {fare.refund}</p>
                            </div>
                            <Link to="/booking">
                              <Button
                                size="sm"
                                className={`w-full mt-3 rounded-lg ${fare.popular ? "gradient-primary text-primary-foreground" : ""}`}
                                variant={fare.popular ? "default" : "outline"}
                              >
                                Select {fare.tier}
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

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <span className="text-6xl mb-4 block">✈️</span>
                <h3 className="text-lg font-semibold text-foreground mb-2">No flights found</h3>
                <p className="text-sm text-muted-foreground mb-4">Try adjusting your search or filters</p>
                <Button variant="outline" className="rounded-lg" onClick={() => { setSelectedAirlines([]); setPriceRange([0, 700]); setSearch(""); }}>
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
