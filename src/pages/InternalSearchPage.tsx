import { Link, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { NotAvailableNotice } from "@/components/admin/bookings/NotAvailable";
import { GroupTicketingSearch } from "@/components/admin/search/GroupTicketingSearch";
import { FlightsBooking } from "@/components/admin/search/FlightsBooking";

const TABS = [
  { id: "flights", label: "Flights" },
  { id: "group-ticketing", label: "Group Ticketing" },
  { id: "hotels", label: "Hotels" },
  { id: "umrah", label: "Umrah" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// Products without a gateway search endpoint yet (docs/backend-todo.md, Search).
const SHELLS: Partial<Record<TabId, { title: string; body: string }>> = {
  hotels: {
    title: "Hotel search isn't available yet",
    body: "No hotel provider is connected to the gateway, and Hotel Inventory isn't served by the gateway yet.",
  },
  umrah: {
    title: "Umrah search isn't available yet",
    body: "Umrah packages aren't served by the gateway yet.",
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
    <div className="flex min-w-0 flex-col gap-section-gap">
      <h1 className="font-display text-page-title font-bold text-foreground">Search</h1>
      <nav aria-label="Search products" className="flex flex-wrap gap-2">
        {TABS.map(tab => (
          <Link
            key={tab.id}
            to={`/admin/search?tab=${tab.id}`}
            aria-current={tab.id === active ? "page" : undefined}
            className={cn(
              "inline-flex h-control items-center rounded-sm border px-3.5 text-body font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab.id === active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-brand-navy hover:bg-accent",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {shell ? <NotAvailableNotice title={shell.title}>{shell.body}</NotAvailableNotice>
        : active === "flights" ? <FlightsBooking /> : <GroupTicketingSearch />}
    </div>
  );
}
