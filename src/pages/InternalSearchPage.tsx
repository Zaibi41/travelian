import { useSearchParams } from "react-router-dom";
import { NotAvailableNotice } from "@/components/admin/bookings/NotAvailable";
import { GroupTicketingSearch } from "@/components/admin/search/GroupTicketingSearch";
import { FlightsBooking } from "@/components/admin/search/FlightsBooking";
import { SearchProductTabs } from "@/components/admin/ui/search-form";
import { loadAirports } from "@/lib/admin-search/airports";

// Airport suggestions start loading as soon as this page's module loads, so the list is ready
// before anyone reaches the From field (its own chunk; not in the main bundle).
void loadAirports().catch(() => undefined);

const TABS = [
  { id: "flights", label: "Flights" },
  { id: "group-ticketing", label: "Group Ticketing" },
  { id: "hotels", label: "Hotels" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// Products without a gateway search endpoint yet (docs/backend-todo.md, Search).
const SHELLS: Partial<Record<TabId, { title: string; body: string }>> = {
  hotels: {
    title: "Hotel search isn't available yet",
    body: "No hotel provider is connected to the gateway, and Hotel Inventory isn't served by the gateway yet.",
  },
};

// Search for internal roles (spec 6, mockups search-*). Data: travelian-api-gateway only.
// Agency and customer roles keep the existing search.
export default function InternalSearchPage() {
  const [params] = useSearchParams();
  const requested = params.get("tab");
  const active: TabId = TABS.some(tab => tab.id === requested) ? (requested as TabId) : "flights";
  const shell = SHELLS[active];

  return (
    // At most 1600px wide, centred (as on the public site), so a large monitor doesn't stretch the rows.
    // Search card, status line, filters and results share these left and right edges.
    <div className="mx-auto flex w-full min-w-0 max-w-[100rem] flex-col gap-section-gap">
      <h1 className="font-display text-page-title font-bold text-foreground">Search</h1>
      <SearchProductTabs active={active} />
      {shell ? <NotAvailableNotice title={shell.title}>{shell.body}</NotAvailableNotice>
        : active === "flights" ? <FlightsBooking /> : <GroupTicketingSearch />}
    </div>
  );
}
