import { Link } from "react-router-dom";
import { Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function FlightDetailPage() {
  return (
    <div className="flex min-h-[65vh] items-center justify-center bg-muted/20 px-4 py-16">
      <Card className="w-full max-w-lg border-0 shadow-card">
        <CardContent className="p-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
            <Plane className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Select a live flight offer</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Flight details are available only for live provider offers. Search again to view current availability and fares.
          </p>
          <Button asChild className="mt-6 rounded-xl">
            <Link to="/">Search Flights</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
