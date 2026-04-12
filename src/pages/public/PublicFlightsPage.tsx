import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Plane, Search, ArrowUpDown, Wifi, Briefcase, Coffee } from "lucide-react";
import { mockFlights } from "@/data/mock";

export default function PublicFlightsPage() {
  const [search, setSearch] = useState("");
  const [priceRange, setPriceRange] = useState([0, 700]);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [sort, setSort] = useState("price-asc");

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

  return (
    <div>
      <section className="gradient-hero py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl md:text-3xl font-bold font-display text-primary-foreground mb-4">Search Flights</h1>
          <div className="flex gap-2 max-w-3xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by city, airline..." className="pl-9 h-11 bg-card" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button className="gradient-primary text-primary-foreground h-11"><Search className="h-4 w-4" /></Button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm text-muted-foreground">{filtered.length} flights found</span>
          <div className="flex items-center gap-2 text-sm">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <select className="bg-transparent text-sm font-medium border-0 focus:outline-none cursor-pointer" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        <div className="flex gap-6">
          <aside className="hidden md:block w-64 shrink-0 space-y-6">
            <div className="bg-card rounded-xl p-5 shadow-card">
              <h3 className="font-semibold text-foreground text-sm mb-4">Price Range</h3>
              <Slider value={priceRange} onValueChange={setPriceRange} min={0} max={700} step={10} className="mb-3" />
              <div className="flex justify-between text-xs text-muted-foreground"><span>${priceRange[0]}</span><span>${priceRange[1]}</span></div>
            </div>
            <div className="bg-card rounded-xl p-5 shadow-card">
              <h3 className="font-semibold text-foreground text-sm mb-3">Airlines</h3>
              <div className="space-y-2">
                {["Saudi Airlines", "PIA", "Emirates", "Turkish Airlines"].map(a => (
                  <label key={a} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={selectedAirlines.includes(a)} onCheckedChange={() => toggleAirline(a)} />
                    <span className="text-xs text-muted-foreground">{a}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="bg-card rounded-xl p-5 shadow-card">
              <h3 className="font-semibold text-foreground text-sm mb-3">Stops</h3>
              <div className="space-y-2">
                {["Non-stop", "1 Stop", "2+ Stops"].map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox /><span className="text-xs text-muted-foreground">{s}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          <div className="flex-1 space-y-4">
            {filtered.map(flight => (
              <Card key={flight.flightId} className="overflow-hidden hover:shadow-elevated transition-all">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
                        <Plane className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-foreground">{flight.airline}</p>
                          <Badge variant="secondary" className="text-[10px]">{flight.flightNumber}</Badge>
                          <Badge variant="outline" className="text-[10px] capitalize">{flight.class}</Badge>
                          {flight.status === 'delayed' && <Badge className="bg-warning/10 text-warning border-0 text-[10px]">Delayed</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="text-center">
                            <p className="text-lg font-bold text-foreground">{flight.departureTime.split(' ')[1]}</p>
                            <p className="text-xs text-muted-foreground">{flight.origin}</p>
                          </div>
                          <div className="flex-1 flex flex-col items-center px-2">
                            <span className="text-[10px] text-muted-foreground">{getDuration(flight.departureTime, flight.arrivalTime)}</span>
                            <div className="w-full h-px bg-border my-1 relative">
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
                            </div>
                            <span className="text-[10px] text-success">Non-stop</span>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-foreground">{flight.arrivalTime.split(' ')[1]}</p>
                            <p className="text-xs text-muted-foreground">{flight.destination}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 md:border-l md:pl-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-foreground">${flight.price}</p>
                        <p className="text-[10px] text-muted-foreground">per person</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Wifi className="h-3 w-3 text-muted-foreground" />
                          <Briefcase className="h-3 w-3 text-muted-foreground" />
                          <Coffee className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </div>
                      <Button className="gradient-primary text-primary-foreground">Select</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
