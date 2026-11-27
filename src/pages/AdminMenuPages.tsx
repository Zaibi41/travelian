// The tabbed menu pages of the admin sidebar (menu cleanup, 2026-11-27). Each tab is an existing screen; the open
// tab is `?tab=` in the URL. Tabs a role may not open are left out (src/lib/admin-navigation.tsx, ADMIN_HUB_TABS).
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { TabbedAdminPage, type AdminTab } from "@/components/admin/TabbedAdminPage";
import { Notice } from "@/components/admin/ui/feedback";
import { buttonVariants } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import { hubTabsForRole } from "@/lib/admin-navigation";
import { cn } from "@/lib/utils";
import AdminBookingsPage from "./AdminBookingsPage";
import AuditLogPage from "./AuditLogPage";
import BlogPage from "./BlogPage";
import CouponsPage from "./CouponsPage";
import FlightOperationsPage from "./FlightOperationsPage";
import FlightPricingPage from "./FlightPricingPage";
import ProviderSystemsPage from "./ProviderSystemsPage";
import RBACPage from "./RBACPage";
import SiteLogoPage from "./SiteLogoPage";
import UsersPage from "./UsersPage";

/** A tab whose screen is not built yet: says so in one line (no sample data). */
function NotBuiltYet({ children }: { children: ReactNode }) {
  return <Notice title="Not built yet">{children}</Notice>;
}

function MenuPage({ title, basePath, renderers, actions }: {
  title: string;
  basePath: string;
  renderers: Record<string, () => ReactNode>;
  actions?: ReactNode;
}) {
  const { currentRole } = useRole();
  const tabs: AdminTab[] = hubTabsForRole(basePath, currentRole)
    .filter(tab => renderers[tab.id])
    .map(tab => ({ id: tab.id, label: tab.label, render: renderers[tab.id] }));
  return <TabbedAdminPage title={title} basePath={basePath} tabs={tabs} actions={actions} />;
}

/** Bookings: the register (its product sub-tabs stay in the path) and Operations (was Flight Operations). */
export function BookingsMenuPage({ tab }: { tab?: string }) {
  return (
    <MenuPage
      title="Bookings"
      basePath="/admin/bookings"
      actions={(
        <Link to="/admin/bookings/new" className={cn(buttonVariants(), "min-h-11 gap-2")}>
          <Plus className="h-4 w-4" aria-hidden="true" /> New Booking
        </Link>
      )}
      renderers={{
        bookings: () => <AdminBookingsPage tab={tab} showTitle={false} />,
        operations: () => <FlightOperationsPage />,
      }}
    />
  );
}

export function PricingMenuPage() {
  return (
    <MenuPage title="Pricing" basePath="/admin/pricing" renderers={{
      rules: () => <FlightPricingPage />,
      promotions: () => <CouponsPage />,
    }} />
  );
}

export function IntegrationsMenuPage() {
  return (
    <MenuPage title="Integrations" basePath="/admin/integrations" renderers={{
      suppliers: () => <ProviderSystemsPage />,
      payments: () => <NotBuiltYet>Online gateways and the bank accounts shown to agencies for wallet top-ups will be listed here.</NotBuiltYet>,
    }} />
  );
}

export function UsersMenuPage() {
  return (
    <MenuPage title="Users" basePath="/admin/users" renderers={{
      users: () => <UsersPage />,
      roles: () => <RBACPage />,
    }} />
  );
}

export function WebsiteMenuPage() {
  return (
    <MenuPage title="Website" basePath="/admin/website" renderers={{
      blog: () => <BlogPage />,
      pages: () => <NotBuiltYet>Edit the About, Terms, Privacy Policy and Refund Policy pages here.</NotBuiltYet>,
      branding: () => <SiteLogoPage />,
    }} />
  );
}

export function LogsMenuPage() {
  return (
    <MenuPage title="Logs" basePath="/admin/system/logs" renderers={{
      audit: () => <AuditLogPage />,
      errors: () => <NotBuiltYet>Search, booking, payment and supplier errors will be listed here with their booking reference.</NotBuiltYet>,
      jobs: () => <NotBuiltYet>Background jobs (supplier balance check, safe-journey reminders, notification sending) will be listed here with their last result.</NotBuiltYet>,
    }} />
  );
}
