import { Navigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { isInternalRole } from "@/lib/admin-navigation";
import AdminBookingsPage from "./AdminBookingsPage";
import AdminBookingDetailPage from "./AdminBookingDetailPage";
import BookingRequestsPage from "./BookingRequestsPage";
import GroupBookingPage from "./GroupBookingPage";

// The Bookings register is back office only (the gateway refuses other roles).
// Agency and customer roles keep their existing destinations for these URLs.

export function BookingsRoute({ tab }: { tab?: string }) {
  const { currentRole } = useRole();
  return isInternalRole(currentRole) ? <AdminBookingsPage tab={tab} /> : <Navigate to="/admin/flight-bookings?tab=all" replace />;
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

/** The old /admin/requests bookings screen: replaced by /admin/bookings for internal roles. */
export function LegacyRequestsRoute() {
  const { currentRole } = useRole();
  return isInternalRole(currentRole) ? <Navigate to="/admin/bookings" replace /> : <BookingRequestsPage />;
}
