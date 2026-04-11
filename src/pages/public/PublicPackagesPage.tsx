import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Package } from "lucide-react";
import { mockPackages } from "@/data/mock";

export default function PublicPackagesPage() {
  const packages = mockPackages.filter(p => p.status === 'active');

  return (
    <div>
      <section className="bg-gradient-to-br from-sidebar to-sidebar-accent py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold font-display text-sidebar-accent-foreground mb-2">Umrah Packages</h1>
          <p className="text-sidebar-muted">Choose from our carefully curated Umrah packages for a blessed journey</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map(pkg => (
            <Card key={pkg.packageId} className="overflow-hidden hover:shadow-elevated transition-all group">
              <div className="h-52 bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
                <Package className="h-16 w-16 text-primary/30 group-hover:scale-110 transition-transform" />
              </div>
              <CardContent className="p-5">
                <h3 className="text-lg font-semibold text-foreground">{pkg.name}</h3>
                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {pkg.city}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {pkg.duration}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{pkg.description}</p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {pkg.includes.map(i => <Badge key={i} variant="outline" className="text-xs">{i}</Badge>)}
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div>
                    <span className="text-xs text-muted-foreground">Starting from</span>
                    <p className="text-2xl font-bold text-primary">${pkg.basePrice}</p>
                  </div>
                  <Button className="gradient-primary text-primary-foreground">Book Now</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
