import { CalendarCheck, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";

export default function BookingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display">Bookings</h1>
        <p className="text-sm text-muted-foreground">Real B2B and B2C bookings will appear here after production booking records are created.</p>
      </div>
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input disabled placeholder="Search bookings after data is connected" className="pl-9" />
          </div>
        </CardContent>
      </Card>
      <EmptyState
        icon={CalendarCheck}
        title="No real bookings yet"
        description="Mock bookings are hidden from production UI. Confirmed API and checkout bookings will populate this lifecycle table with payment, ticketing and invoice status."
      />
    </div>
  );
}
