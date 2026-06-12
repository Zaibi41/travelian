import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarIcon, FileCheck, Hotel, Map, Package, Plane, Search, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchTabs } from "@/components/public/SearchTabs";
import { GroupTicketingCategories } from "@/components/public/GroupTicketingCategories";

const searchTabs = [
  { id: "flights", label: "Flights", icon: Plane },
  { id: "hotels", label: "Hotels", icon: Hotel },
  { id: "umrah", label: "Umrah", icon: Package },
  { id: "visas", label: "Visas", icon: FileCheck },
  { id: "tours", label: "Tours", icon: Map },
  { id: "group-ticketing", label: "Group Ticketing", icon: UsersRound },
] as const;

type SearchTabId = typeof searchTabs[number]["id"];

function PackageSearchCard({
  title,
  description,
  placeholder,
  cta,
  to,
}: {
  title: string;
  description: string;
  placeholder: string;
  cta: string;
  to: string;
}) {
  return (
    <Card className="shadow-card">
      <CardContent className="space-y-5 p-5">
        <div>
          <h2 className="text-xl font-bold font-display">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-12 rounded-xl pl-9" placeholder={placeholder} />
          </div>
          <Button asChild className="h-12 rounded-xl px-6">
            <Link to={to}>{cta}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function HotelSearchPanel() {
  return (
    <Card className="shadow-card">
      <CardContent className="space-y-5 p-5">
        <div>
          <h2 className="text-xl font-bold font-display">Hotel Search</h2>
          <p className="mt-1 text-sm text-muted-foreground">Search hotel availability and continue through the customer booking flow.</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_0.8fr_auto]">
          <Input className="h-12 rounded-xl" placeholder="Destination or city" />
          <div className="relative">
            <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-12 rounded-xl pl-9" placeholder="Check-in" />
          </div>
          <div className="relative">
            <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-12 rounded-xl pl-9" placeholder="Check-out" />
          </div>
          <Input className="h-12 rounded-xl" placeholder="Guests / rooms" />
          <Button asChild className="h-12 rounded-xl px-6">
            <Link to="/hotels-search">Search Hotels</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminSearchPage() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab") as SearchTabId | null;
  const activeTab = useMemo(
    () => searchTabs.some((tab) => tab.id === tabParam) ? tabParam! : "flights",
    [tabParam],
  );

  useEffect(() => {
    if (!tabParam || !searchTabs.some((tab) => tab.id === tabParam)) {
      setParams({ tab: "flights" }, { replace: true });
    }
  }, [setParams, tabParam]);

  const setTab = (tab: SearchTabId) => setParams({ tab });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">Search live fares and Travelian services. Management, inventory and pricing settings stay in their own admin modules.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border bg-card p-2 shadow-card">
        {searchTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={`inline-flex min-w-max items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
              activeTab === tab.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "flights" && (
        <SearchTabs initialTab="flights" visibleTabIds={["flights"]} flightResultsPath="/admin/flights-search" />
      )}
      {activeTab === "hotels" && <HotelSearchPanel />}
      {activeTab === "umrah" && (
        <PackageSearchCard title="Umrah Packages" description="Search published Umrah inventory and start an assisted package request." placeholder="Search package, hotel, city, duration, or price" cta="View Umrah Packages" to="/umrah-packages" />
      )}
      {activeTab === "visas" && (
        <PackageSearchCard title="Visa Services" description="Search active visa services by country, visa type, processing time, or documents." placeholder="Search country, visa type, or processing time" cta="View Visa Services" to="/visa-services" />
      )}
      {activeTab === "tours" && (
        <PackageSearchCard title="Tour Packages" description="Search active domestic and international tour packages from Travelian inventory." placeholder="Search destination, itinerary, duration, or price" cta="View Tour Packages" to="/tour-packages" />
      )}
      {activeTab === "group-ticketing" && (
        <Card className="shadow-card">
          <CardContent className="space-y-5 p-5">
            <div>
              <h2 className="text-xl font-bold font-display">Group Ticketing</h2>
              <p className="mt-1 text-sm text-muted-foreground">Choose a live group-ticketing category. This is separate from manual booking requests.</p>
            </div>
            <GroupTicketingCategories compact />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
