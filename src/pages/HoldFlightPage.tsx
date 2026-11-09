import { Link, useLocation, useSearchParams } from "react-router-dom";
import { NotAvailableNotice } from "@/components/admin/bookings/NotAvailable";
import { SelectedFareSummary } from "@/components/admin/search/SelectedFareSummary";
import type { HoldDraft } from "@/lib/admin-search/hold";

// Hold flight / Book flight (mockup flights-hold-form). Opened by the fare check with the
// gateway's quote in the router state; without it (reload, direct link) the fare must be checked again.
export default function HoldFlightPage() {
  const location = useLocation();
  const [params] = useSearchParams();
  const draft = location.state as HoldDraft | null;
  const mode = params.get("mode") === "book" ? "book" : "hold";
  const title = mode === "book" ? "Book flight" : "Hold flight";
  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      <nav aria-label="Breadcrumb" className="text-body text-muted-foreground">
        <Link to="/admin/search?tab=flights" className="hover:underline">Search</Link> › <Link to="/admin/search?tab=flights" className="hover:underline">Flights</Link> › {title}
      </nav>
      <h1 className="font-display text-page-title font-bold text-foreground">{title}</h1>
      {draft?.quote ? (
        <div className="grid min-w-0 grid-cols-1 items-start gap-section-gap lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
          <div className="min-w-0 lg:order-1" />
          <div className="min-w-0 lg:order-2"><SelectedFareSummary draft={draft} /></div>
        </div>
      ) : (
        <NotAvailableNotice title="This fare check has ended">
          Choose the fare again from the search results: the fare is checked with the supplier before booking.{" "}
          <Link to="/admin/search?tab=flights" className="font-medium text-teal hover:underline">Back to search</Link>
        </NotAvailableNotice>
      )}
    </div>
  );
}
