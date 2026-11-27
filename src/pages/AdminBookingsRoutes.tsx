import { Navigate, useSearchParams } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { isInternalRole } from "@/lib/admin-navigation";
import AdminBookingDetailPage from "./AdminBookingDetailPage";
import { BookingsMenuPage } from "./AdminMenuPages";
import GroupBookingPage from "./GroupBookingPage";
import RoadmapPlaceholderPage from "./RoadmapPlaceholderPage";

// The Bookings register is back office only (the gateway refuses other roles).
// Agency and customer roles keep their existing destinations for these URLs.

export function BookingsRoute({ tab }: { tab?: string }) {
  const { currentRole } = useRole();
  return isInternalRole(currentRole) ? <BookingsMenuPage tab={tab} /> : <Navigate to="/admin/flight-bookings?tab=all" replace />;
}

export function BookingDetailRoute() {
  const { currentRole } = useRole();
  return isInternalRole(currentRole) ? <AdminBookingDetailPage /> : <Navigate to="/admin" replace />;
}

/** A group hold's booking page (Search > Group Ticketing step 4): back office only. */
export function GroupBookingRoute() {
  const { currentRole } = useRole();
  return isInternalRole(currentRole) ? <GroupBookingPage /> : <Navigate to="/admin" replace />;
}

// The old screens below read the unauthenticated /content/* API, which returns supplier names and supplier cost
// to any caller. Agency and customer roles get the menu placeholder until the gateway has an agency bookings
// endpoint (docs/backend-todo.md), so their browsers never request that data.

/** The old /admin/requests bookings screen: replaced by /admin/bookings for internal roles. */
export function LegacyRequestsRoute() {
  const { currentRole } = useRole();
  return isInternalRole(currentRole) ? <Navigate to="/admin/bookings" replace /> : <RoadmapPlaceholderPage title="Bookings" />;
}

const FLIGHT_MENU_BY_TAB: Record<string, string> = { issued: "Invoices", refund: "Refunds" };

/** /admin/flight-bookings: internal roles go to Bookings → Operations (was Flight Operations, the gateway's group
 *  departures queue); agency roles' Refunds and Invoices menus keep their placeholder (no approved screen yet). B26: the old screen that changed
 *  bookings through the legacy Lambda store is retired; payments and issuing are on each booking in Bookings. */
export function FlightBookingsRoute() {
  const { currentRole } = useRole();
  const [params] = useSearchParams();
  const menu = FLIGHT_MENU_BY_TAB[params.get("tab") ?? ""];
  if (isInternalRole(currentRole)) return <Navigate to="/admin/bookings?tab=operations" replace />;
  return <RoadmapPlaceholderPage title={menu ?? "Flight Operations"} />;
}
