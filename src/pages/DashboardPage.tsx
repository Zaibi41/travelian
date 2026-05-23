import { BarChart3, CalendarCheck, CreditCard, Plane, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { EmptyState } from "@/components/EmptyState";

const cards = [
  { title: "Bookings", icon: CalendarCheck, href: "/admin/bookings" },
  { title: "Revenue", icon: BarChart3, href: "/admin/payments" },
  { title: "Payments", icon: CreditCard, href: "/admin/payments" },
  { title: "Wallet", icon: Wallet, href: "/admin/wallet" },
];

export default function DashboardPage() {
  const { currentRole, currentUser } = useRole();
  const isAgency = currentRole === "agency_owner" || currentRole === "agency_staff";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">{isAgency ? "Agency Dashboard" : "Dashboard"}</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {currentUser.name}. Real operational metrics will appear when connected API/database records exist.
          </p>
        </div>
        <Button asChild className="gradient-primary text-primary-foreground">
          <Link to={isAgency ? "/admin/flight-search" : "/admin/flights"}>{isAgency ? "Search Flights" : "Manage Pricing Rules"}</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <card.icon className="h-5 w-5" />
                </div>
                <span className="text-2xl font-bold text-foreground">0</span>
              </div>
              <p className="mt-4 text-sm font-semibold text-foreground">{card.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">No real records yet</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <EmptyState
        icon={Plane}
        title="No production data connected yet"
        description="Dashboard charts, revenue cards, booking tables and alerts intentionally show no mock data. Connect real bookings, payments, provider health and search logs to populate this dashboard."
        actionLabel={isAgency ? "Start Flight Search" : "Open Flight Pricing"}
        onAction={() => { window.location.href = isAgency ? "/admin/flight-search" : "/admin/flights"; }}
      />
    </div>
  );
}
