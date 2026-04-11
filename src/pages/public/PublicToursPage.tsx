import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Map } from "lucide-react";
import { mockTourPackages } from "@/data/mock";

export default function PublicToursPage() {
  const tours = mockTourPackages.filter(t => t.status === 'active');

  return (
    <div>
      <section className="bg-gradient-to-br from-sidebar to-sidebar-accent py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold font-display text-sidebar-accent-foreground mb-2">Tour Packages</h1>
          <p className="text-sidebar-muted">Explore the world with our hand-picked travel tours</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tours.map(tour => (
            <Card key={tour.packageId} className="overflow-hidden hover:shadow-elevated transition-all group">
              <div className="h-52 bg-gradient-to-br from-info/20 to-accent flex items-center justify-center">
                <Map className="h-16 w-16 text-info/30 group-hover:scale-110 transition-transform" />
              </div>
              <CardContent className="p-5">
                <h3 className="text-lg font-semibold text-foreground">{tour.name}</h3>
                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {tour.city}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {tour.duration}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{tour.description}</p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {tour.includes.map(i => <Badge key={i} variant="outline" className="text-xs">{i}</Badge>)}
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div>
                    <span className="text-xs text-muted-foreground">From</span>
                    <p className="text-2xl font-bold text-primary">${tour.basePrice}</p>
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
