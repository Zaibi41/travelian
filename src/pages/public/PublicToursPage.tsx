import { CalendarDays, Map, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/public/PageHeader";
import { PackageImage } from "@/components/public/PackageImage";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { useAdmin } from "@/contexts/AdminStore";

const categories = ["Domestic tours", "International tours", "Group tours", "Custom tours"];
const whatsappBase = "https://wa.me/923244440014";
const siteBase = "https://www.travelian.pk";

export default function PublicToursPage() {
  const { tourPackages } = useAdmin();
  const activeTours = tourPackages.filter((tour) => tour.status === "active" && !tour.archivedAt && !tour.deletedAt);

  return (
    <div>
      <PageHeader title="Tour Packages" tagline="Admin-managed domestic, international, group and custom tours" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">Tour Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map((category) => (
              <div key={category} className="rounded-2xl border bg-card p-5 shadow-card">
                <Map className="h-5 w-5 text-primary" />
                <p className="mt-3 font-semibold text-foreground">{category}</p>
              </div>
            ))}
          </div>
        </section>

        {activeTours.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center shadow-card">
            <Map className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-bold text-foreground">No tour packages are published right now</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
              Travelian only displays active tour packages from admin inventory. Our team can still prepare a custom itinerary with hotels, transport, meals and availability dates.
            </p>
            <a href={`${whatsappBase}?text=${encodeURIComponent("Hello Travelian, please help me with a custom tour package.")}`} target="_blank" rel="noreferrer">
              <Button className="mt-5 rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a]">
                <WhatsAppIcon className="mr-2 h-4 w-4" /> Request a Tour
              </Button>
            </a>
          </div>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {activeTours.map((tour) => (
              <Card key={tour.packageId} className="overflow-hidden border-0 shadow-card">
                <PackageImage src={tour.image} alt={tour.name} className="h-48 w-full" />
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge className="mb-2 capitalize">{tour.packageType || "Tour"}</Badge>
                      <h2 className="text-lg font-bold text-foreground">{tour.name}</h2>
                      <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" /> {tour.travelDates || tour.duration}</p>
                    </div>
                    <p className="text-right text-lg font-black text-primary">PKR {tour.basePrice.toLocaleString()}</p>
                  </div>
                  <p className="line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">{tour.hotelsText || tour.description}</p>
                  {tour.agentDiscount && <Badge variant="secondary">{tour.agentDiscount}</Badge>}
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild className="gradient-primary text-primary-foreground"><Link to={`/tour/${tour.packageId}`}>View Details</Link></Button>
                    <a href={`${whatsappBase}?text=${encodeURIComponent(`Hello Travelian,\n\nI want to inquire about this tour:\n${tour.name}\nDates: ${tour.travelDates || "Please confirm"}\nPrice from: PKR ${tour.basePrice.toLocaleString()}\nPackage URL: ${siteBase}/tour/${tour.packageId}`)}`} target="_blank" rel="noreferrer">
                      <Button variant="outline" className="w-full"><WhatsAppIcon className="mr-2 h-4 w-4" /> WhatsApp</Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        <section className="rounded-2xl border bg-muted/30 p-6">
          <div className="flex gap-3">
            <MessageCircle className="mt-1 h-5 w-5 text-primary" />
            <div>
              <h2 className="font-bold text-foreground">Custom tour planning</h2>
              <p className="mt-1 text-sm text-muted-foreground">Share destination, duration, hotel class, transport, meals, inclusions and preferred dates for a Travelian quote.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
