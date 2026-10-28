import { SearchTabs } from "@/components/public/SearchTabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, ShieldCheck, Ticket, Wallet } from "lucide-react";

export default function AgencyFlightSearchPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <Badge className="w-fit bg-primary/10 text-primary border-primary/20" variant="outline">
          Agency flight desk
        </Badge>
        <h1 className="text-2xl font-bold font-display">Flight Search</h1>
        <p className="text-sm text-muted-foreground">
          Search live fares for customers, compare results, and continue through the booking flow.
        </p>
      </div>

      <SearchTabs initialTab="flights" showProductNavigation={false} flightResultsPath="/admin/flights-search" />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-card">
          <CardContent className="p-5">
            <Plane className="h-5 w-5 text-primary mb-3" />
            <p className="font-semibold text-foreground">Live flight search</p>
            <p className="mt-1 text-sm text-muted-foreground">Use IATA airport codes, date, travelers, and cabin class.</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-5">
            <Ticket className="h-5 w-5 text-primary mb-3" />
            <p className="font-semibold text-foreground">Listing to booking</p>
            <p className="mt-1 text-sm text-muted-foreground">Results continue into fare selection and booking pages.</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-5">
            <Wallet className="h-5 w-5 text-primary mb-3" />
            <p className="font-semibold text-foreground">Agency workflow</p>
            <p className="mt-1 text-sm text-muted-foreground">Use the same flow for agency owner and agency staff users.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
