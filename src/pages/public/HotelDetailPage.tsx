import { Link } from "react-router-dom";
import { Hotel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HotelDetailPage() {
  return (
    <div className="flex min-h-[65vh] items-center justify-center bg-muted/20 px-4 py-16">
      <Card className="w-full max-w-lg border-0 shadow-card">
        <CardContent className="p-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
            <Hotel className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Hotel details are not available yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Live hotel inventory has not returned this property. Start a new search to check current availability.
          </p>
          <Button asChild className="mt-6 rounded-xl">
            <Link to="/hotels-search">Search Hotels</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
