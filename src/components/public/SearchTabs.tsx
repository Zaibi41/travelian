import { useState } from "react";
import { Hotel, Plane, Package, FileCheck, Search, Calendar, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

const tabs = [
  { id: "hotels", label: "Hotels", icon: Hotel },
  { id: "flights", label: "Flights", icon: Plane },
  { id: "packages", label: "Packages", icon: Package },
  { id: "visa", label: "Visa", icon: FileCheck },
];

export function SearchTabs() {
  const [activeTab, setActiveTab] = useState("hotels");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (activeTab === "hotels") navigate("/hotels-search");
    else if (activeTab === "flights") navigate("/flights-search");
    else if (activeTab === "packages") navigate("/umrah-packages");
    else navigate("/visa-services");
  };

  return (
    <div className="bg-card rounded-xl shadow-elevated p-1 max-w-4xl mx-auto">
      {/* Tabs */}
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Form */}
      <div className="p-4">
        {activeTab === "hotels" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="City or destination" className="pl-9" />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="date" placeholder="Check-in" className="pl-9" />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="date" placeholder="Check-out" className="pl-9" />
            </div>
            <Button onClick={handleSearch} className="gradient-primary text-primary-foreground">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </div>
        )}
        {activeTab === "flights" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Plane className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="From" className="pl-9" />
            </div>
            <div className="relative">
              <Plane className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rotate-90" />
              <Input placeholder="To" className="pl-9" />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="date" placeholder="Departure" className="pl-9" />
            </div>
            <Button onClick={handleSearch} className="gradient-primary text-primary-foreground">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </div>
        )}
        {activeTab === "packages" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Package className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search Umrah, tours..." className="pl-9" />
            </div>
            <div className="relative">
              <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Travelers" type="number" className="pl-9" defaultValue={1} />
            </div>
            <Button onClick={handleSearch} className="gradient-primary text-primary-foreground">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </div>
        )}
        {activeTab === "visa" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative md:col-span-2">
              <FileCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Select country for visa" className="pl-9" />
            </div>
            <Button onClick={handleSearch} className="gradient-primary text-primary-foreground">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
