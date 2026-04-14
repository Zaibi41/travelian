import { useState } from "react";
import { Hotel, Plane, Compass, Car, Package, Search, Calendar, MapPin, Users, ChevronDown, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

const tabs = [
  { id: "flights", label: "Flights", icon: Plane },
  { id: "hotels", label: "Hotels", icon: Hotel },
  { id: "packages", label: "Packages", icon: Package },
  { id: "activities", label: "Activities", icon: Compass },
  { id: "transfers", label: "Transfers", icon: Car },
];

const tripTypes = [
  { id: "oneway", label: "One-way" },
  { id: "roundtrip", label: "Round-trip" },
  { id: "multicity", label: "Multi-city" },
];

const cabinClasses = ["Economy", "Premium Economy", "Business", "First"];

export function SearchTabs() {
  const [activeTab, setActiveTab] = useState("flights");
  const [tripType, setTripType] = useState("roundtrip");
  const [showPassengers, setShowPassengers] = useState(false);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [cabin, setCabin] = useState("Economy");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (activeTab === "flights") navigate("/flights-search");
    else if (activeTab === "hotels") navigate("/hotels-search");
    else if (activeTab === "packages") navigate("/umrah-packages");
    else if (activeTab === "activities") navigate("/tour-packages");
    else navigate("/tour-packages");
  };

  const totalPassengers = adults + children + infants;

  return (
    <div className="bg-card rounded-2xl shadow-elevated p-0 max-w-5xl mx-auto overflow-hidden animate-scale-in">
      {/* Tabs */}
      <div className="flex bg-muted/60">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-card text-primary border-b-2 border-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-card/60"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4">
        {/* Flight-specific controls */}
        {activeTab === "flights" && (
          <>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center bg-muted/40 rounded-lg p-0.5">
                {tripTypes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTripType(t.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      tripType === t.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowPassengers(!showPassengers)}
                  className="flex items-center gap-2 text-xs font-medium text-foreground bg-muted/40 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <Users className="h-3.5 w-3.5" />
                  {totalPassengers} Traveler{totalPassengers > 1 ? 's' : ''}, {cabin}
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showPassengers && (
                  <div className="absolute top-full left-0 mt-2 bg-card border rounded-xl shadow-elevated p-4 z-50 w-72 animate-scale-in">
                    <div className="space-y-3">
                      {[
                        { label: "Adults", sub: "12+ years", value: adults, set: setAdults, min: 1 },
                        { label: "Children", sub: "2-11 years", value: children, set: setChildren, min: 0 },
                        { label: "Infants", sub: "Under 2", value: infants, set: setInfants, min: 0 },
                      ].map(p => (
                        <div key={p.label} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">{p.label}</p>
                            <p className="text-[10px] text-muted-foreground">{p.sub}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => p.set(Math.max(p.min, p.value - 1))}
                              className="h-7 w-7 rounded-full border flex items-center justify-center text-sm hover:bg-muted disabled:opacity-40"
                              disabled={p.value <= p.min}
                            >−</button>
                            <span className="text-sm font-semibold w-5 text-center">{p.value}</span>
                            <button
                              onClick={() => p.set(p.value + 1)}
                              className="h-7 w-7 rounded-full border flex items-center justify-center text-sm hover:bg-muted"
                            >+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Cabin Class</p>
                      <div className="grid grid-cols-2 gap-1">
                        {cabinClasses.map(c => (
                          <button
                            key={c}
                            onClick={() => setCabin(c)}
                            className={`text-xs px-2 py-1.5 rounded-md transition-all ${
                              cabin === c ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                            }`}
                          >{c}</button>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" className="w-full mt-3 gradient-primary text-primary-foreground" onClick={() => setShowPassengers(false)}>
                      Done
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="relative md:col-span-3">
                <Plane className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="From where?" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
              </div>
              <div className="hidden md:flex items-center justify-center md:col-span-1">
                <button className="h-9 w-9 rounded-full border-2 border-primary/30 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                  <ArrowLeftRight className="h-4 w-4" />
                </button>
              </div>
              <div className="relative md:col-span-3">
                <Plane className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground rotate-90" />
                <Input placeholder="To where?" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
              </div>
              <div className="relative md:col-span-2">
                <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input type="date" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
              </div>
              {tripType === "roundtrip" && (
                <div className="relative md:col-span-2">
                  <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input type="date" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
                </div>
              )}
              <Button
                onClick={handleSearch}
                className={`${tripType === "roundtrip" ? "md:col-span-1" : "md:col-span-3"} h-12 gradient-primary text-primary-foreground font-semibold rounded-xl`}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {activeTab === "hotels" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="relative md:col-span-4">
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="City, hotel, or destination" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <div className="relative md:col-span-3">
              <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input type="date" placeholder="Check-in" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <div className="relative md:col-span-3">
              <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input type="date" placeholder="Check-out" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <Button onClick={handleSearch} className="md:col-span-2 h-12 gradient-primary text-primary-foreground font-semibold rounded-xl">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </div>
        )}

        {activeTab === "packages" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="relative md:col-span-5">
              <Package className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Umrah, Hajj, or custom package..." className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <div className="relative md:col-span-3">
              <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input type="date" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <div className="relative md:col-span-2">
              <Users className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Travelers" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <Button onClick={handleSearch} className="md:col-span-2 h-12 gradient-primary text-primary-foreground font-semibold rounded-xl">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </div>
        )}

        {activeTab === "activities" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="relative md:col-span-5">
              <Compass className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search activities, tours..." className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <div className="relative md:col-span-3">
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Destination" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <div className="relative md:col-span-2">
              <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input type="date" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <Button onClick={handleSearch} className="md:col-span-2 h-12 gradient-primary text-primary-foreground font-semibold rounded-xl">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </div>
        )}

        {activeTab === "transfers" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="relative md:col-span-4">
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pick-up location" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <div className="relative md:col-span-4">
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Drop-off location" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <div className="relative md:col-span-2">
              <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input type="date" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <Button onClick={handleSearch} className="md:col-span-2 h-12 gradient-primary text-primary-foreground font-semibold rounded-xl">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
