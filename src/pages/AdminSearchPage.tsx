import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Hotel, Plane, Users } from "lucide-react";
import { AdminHotelSearchPanel } from "@/components/AdminHotelSearchPanel";
import { SearchTabs } from "@/components/public/SearchTabs";
import { useAdmin } from "@/contexts/AdminStore";
import { useRole } from "@/contexts/RoleContext";
import { isInternalRole } from "@/lib/admin-navigation";
import InternalSearchPage from "./InternalSearchPage";

const searchTabs = [
  { id: "flights", label: "Flights", icon: Plane },
  { id: "group-ticketing", label: "Group Ticketing", icon: Users },
  { id: "hotels", label: "Hotels", icon: Hotel },
] as const;

type SearchTabId = typeof searchTabs[number]["id"];
/** Internal roles get the gateway Search (spec 6); agency and customer roles keep this one. */
export default function AdminSearchPage() {
  const { currentRole } = useRole();
  return isInternalRole(currentRole) ? <InternalSearchPage /> : <LegacyAdminSearchPage />;
}

function LegacyAdminSearchPage() {
  const [params, setParams] = useSearchParams();
  const { hotels, loadHotelContent } = useAdmin();
  const tabParam = params.get("tab") as SearchTabId | null;
  const activeTab = useMemo(
    () => searchTabs.some((tab) => tab.id === tabParam) ? tabParam! : "flights",
    [tabParam],
  );

  useEffect(() => {
    if (activeTab === "hotels") loadHotelContent();
  }, [activeTab, loadHotelContent]);

  useEffect(() => {
    if (!tabParam || !searchTabs.some((tab) => tab.id === tabParam)) {
      setParams({ tab: "flights" }, { replace: true });
    }
  }, [setParams, tabParam]);

  const setTab = (tab: SearchTabId) => setParams({ tab });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-page-title font-bold font-display">Search</h1>
        <p className="mt-1 text-body text-muted-foreground">Search live fares and published Travelian services. Inventory, pricing and supplier settings stay in their own admin modules.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border bg-card p-2 shadow-card">
        {searchTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={`inline-flex min-w-max items-center gap-2 rounded-xl px-4 py-2.5 text-body font-bold transition-colors ${
              activeTab === tab.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "flights" && (
        <div className="admin-product-search">
          <SearchTabs initialTab="flights" showProductNavigation={false} flightResultsPath="/admin/flights-search" />
        </div>
      )}
      {activeTab === "group-ticketing" && (
        <div className="admin-product-search">
          <SearchTabs initialTab="group-ticketing" showProductNavigation={false} />
        </div>
      )}
      {activeTab === "hotels" && <AdminHotelSearchPanel hotels={hotels} />}
    </div>
  );
}
