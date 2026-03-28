import { mockPackages } from "@/data/mock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, MapPin, Clock, Hotel } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PackagesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Umrah Packages</h1>
          <p className="text-sm text-muted-foreground">Manage travel packages and pricing</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-2">
          <Plus className="h-4 w-4" /> Add Package
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockPackages.map(pkg => (
          <Card key={pkg.packageId} className="shadow-card hover:shadow-elevated transition-shadow flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base font-display">{pkg.name}</CardTitle>
                <StatusBadge status={pkg.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{pkg.description}</p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between gap-4">
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{pkg.city}</div>
                <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{pkg.duration}</div>
                <div className="flex items-center gap-1.5"><Hotel className="h-3 w-3" />{pkg.hotel}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {pkg.includes.map(inc => (
                  <Badge key={inc} variant="secondary" className="text-[10px]">{inc}</Badge>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Base Price</p>
                  <p className="text-lg font-bold font-display text-primary">${pkg.basePrice.toLocaleString()}</p>
                </div>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
