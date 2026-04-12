import { useState } from "react";
import { Hotel, Plane, Compass, Car, Search, Calendar, MapPin, Users, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

const tabs = [
  { id: "hotels", label: "Hotels", icon: Hotel },
  { id: "flights", label: "Flights", icon: Plane },
  { id: "activities", label: "Activities", icon: Compass },
  { id: "transport", label: "Transport", icon: Car },
];

export function SearchTabs() {
  const [activeTab, setActiveTab] = useState("hotels");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (activeTab === "hotels") navigate("/hotels-search");
    else if (activeTab === "flights") navigate("/flights-search");
    else if (activeTab === "activities") navigate("/tour-packages");
    else navigate("/tour-packages");
  };

  return (
    <div className="bg-card rounded-2xl shadow-elevated p-0 max-w-4xl mx-auto overflow-hidden">
      {/* Tabs */}
      <div className="flex bg-muted/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-card text-primary border-b-2 border-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Search Form */}
      <div className="p-5">
        {activeTab === "hotels" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="relative md:col-span-4">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="City, hotel, or destination" className="pl-9 h-11 bg-muted/30 border-muted" />
            </div>
            <div className="relative md:col-span-3">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="date" placeholder="Check-in" className="pl-9 h-11 bg-muted/30 border-muted" />
            </div>
            <div className="relative md:col-span-3">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="date" placeholder="Check-out" className="pl-9 h-11 bg-muted/30 border-muted" />
            </div>
            <Button onClick={handleSearch} className="md:col-span-2 h-11 gradient-primary text-primary-foreground font-semibold">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </div>
        )}
        {activeTab === "flights" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="relative md:col-span-3">
              <Plane className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="From where?" className="pl-9 h-11 bg-muted/30 border-muted" />
            </div>
            <div className="relative md:col-span-3">
              <Plane className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rotate-90" />
              <Input placeholder="To where?" className="pl-9 h-11 bg-muted/30 border-muted" />
            </div>
            <div className="relative md:col-span-2">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="date" className="pl-9 h-11 bg-muted/30 border-muted" />
            </div>
            <div className="relative md:col-span-2">
              <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="1 Adult" className="pl-9 h-11 bg-muted/30 border-muted" />
            </div>
            <Button onClick={handleSearch} className="md:col-span-2 h-11 gradient-primary text-primary-foreground font-semibold">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </div>
        )}
        {activeTab === "activities" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="relative md:col-span-5">
              <Compass className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search activities, tours..." className="pl-9 h-11 bg-muted/30 border-muted" />
            </div>
            <div className="relative md:col-span-3">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Destination" className="pl-9 h-11 bg-muted/30 border-muted" />
            </div>
            <div className="relative md:col-span-2">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="date" className="pl-9 h-11 bg-muted/30 border-muted" />
            </div>
            <Button onClick={handleSearch} className="md:col-span-2 h-11 gradient-primary text-primary-foreground font-semibold">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </div>
        )}
        {activeTab === "transport" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="relative md:col-span-4">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pick-up location" className="pl-9 h-11 bg-muted/30 border-muted" />
            </div>
            <div className="relative md:col-span-4">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Drop-off location" className="pl-9 h-11 bg-muted/30 border-muted" />
            </div>
            <div className="relative md:col-span-2">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="date" className="pl-9 h-11 bg-muted/30 border-muted" />
            </div>
            <Button onClick={handleSearch} className="md:col-span-2 h-11 gradient-primary text-primary-foreground font-semibold">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
