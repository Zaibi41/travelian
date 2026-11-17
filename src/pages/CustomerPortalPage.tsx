import { CalendarCheck, CreditCard, Gift, Heart, LifeBuoy, User, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/admin/ui/card";
import { Button } from "@/components/admin/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { getSession } from "@/lib/auth-session";

const sections = [
  { title: "My Bookings", icon: CalendarCheck },
  { title: "Upcoming Trips", icon: CalendarCheck },
  { title: "Wallet", icon: Wallet },
  { title: "Payments", icon: CreditCard },
  { title: "Wishlist", icon: Heart },
  { title: "Rewards", icon: Gift },
  { title: "Profile", icon: User },
  { title: "Support", icon: LifeBuoy },
];

export default function CustomerPortalPage() {
  const session = getSession();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-3xl gradient-hero p-6 text-primary-foreground shadow-card">
        <p className="text-body text-primary-foreground/70">Customer Portal</p>
        <h1 className="mt-1 text-page-title font-bold font-display">{session?.name || "Travelian Customer"}</h1>
        <p className="mt-1 text-body text-primary-foreground/70">{session?.email || "Manage your Travelian account, trips and support requests."}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {sections.map((item) => (
          <Card key={item.title} className="shadow-card">
            <CardContent className="p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 font-bold text-foreground">{item.title}</h2>
              <p className="mt-1 text-helper text-muted-foreground">No records available yet.</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <EmptyState
        icon={CalendarCheck}
        title="No customer bookings yet"
        description="Your confirmed bookings, upcoming trips, invoices, wallet activity, wishlist and rewards will appear here once real booking records exist."
        actionLabel="Search Flights"
        onAction={() => { window.location.href = "/"; }}
      />
    </div>
  );
}
