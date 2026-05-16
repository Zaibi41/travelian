import { Link, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Check, ArrowLeft, Map } from "lucide-react";
import { mockTourPackages } from "@/data/mock";
import { SEO } from "@/components/SEO";

export default function TourDetailPage() {
  const { id } = useParams();
  const tour = mockTourPackages.find(t => t.packageId === id);

  if (!tour) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Tour not found</h1>
        <p className="text-muted-foreground mt-2">The tour you're looking for doesn't exist or is no longer available.</p>
        <Link to="/tour-packages"><Button className="mt-6">Browse all tours</Button></Link>
      </div>
    );
  }

  return (
    <div>
      <SEO title={`${tour.name} | Travelian Tours`} description={tour.description} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/tour-packages" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to tours
        </Link>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-3 gap-8 pb-12">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl overflow-hidden aspect-[16/9] bg-muted">
            {tour.image ? (
              <img src={tour.image} alt={tour.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Map className="h-16 w-16 text-muted-foreground/40" /></div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold font-display">{tour.name}</h1>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {tour.city}</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {tour.duration}</span>
              <Badge variant="secondary">{tour.category}</Badge>
            </div>
            <p className="mt-4 text-muted-foreground leading-relaxed">{tour.description}</p>
          </div>
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-3">What's included</h2>
              <ul className="grid sm:grid-cols-2 gap-2">
                {tour.includes.map(i => (
                  <li key={i} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-success" /> {i}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
        <aside>
          <Card className="sticky top-24">
            <CardContent className="p-6">
              <span className="text-xs text-muted-foreground">From</span>
              <p className="text-3xl font-bold text-primary">${tour.basePrice}</p>
              <p className="text-xs text-muted-foreground mb-4">per person</p>
              <Link to={`/booking?type=tour&id=${tour.packageId}`}>
                <Button className="w-full gradient-primary text-primary-foreground">Book this tour</Button>
              </Link>
              <Link to={`/contact?type=tour&id=${tour.packageId}`}>
                <Button variant="outline" className="w-full mt-2">Enquire</Button>
              </Link>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
