// Flight Operations (menu 06) for internal roles. B26: the old screen here listed and changed bookings through the
// legacy Lambda store (its "mark paid" / "mark issued" buttons never reached the gateway), so it is retired.
// Payments and issuing are on each booking in Bookings (gateway, with payment verification: D43/D45). What remains
// is the gateway's group departures queue; the spec's other queues have no approved screen yet.
import { PageHeading } from "@/components/admin/TabbedAdminPage";
import { GroupDeparturesPanel } from "@/components/admin/flight-operations/GroupDeparturesPanel";

export default function FlightOperationsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeading className="text-page-title font-bold font-display">Flight Operations</PageHeading>
      <GroupDeparturesPanel />
    </div>
  );
}
