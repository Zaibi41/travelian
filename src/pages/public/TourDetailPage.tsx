import { CalendarDays, Check, Hotel, Map, Plane, Tag } from "lucide-react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { useAdmin } from "@/contexts/AdminStore";

const whatsappBase = "https://wa.me/923244440014";

function lines(value?: string) {
  return (value || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export default function TourDetailPage() {
  const { id } = useParams();
  const { tourPackages } = useAdmin();
  const tour = tourPackages.find((item) => item.packageId === id && item.status === "active" && !item.archivedAt && !item.deletedAt);

  if (!tour) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="rounded-2xl border bg-card p-8 text-center shadow-card">
          <Map className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">Tour details are not published</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            This tour package is not available from Travelian admin inventory right now. Please contact Travelian for destination, itinerary, hotel, meals, availability and pricing.
          </p>
          <a href={`${whatsappBase}?text=${encodeURIComponent("Hello Travelian, please help me with tour package details.")}`} target="_blank" rel="noreferrer">
            <Button className="mt-5 rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a]">
              <WhatsAppIcon className="mr-2 h-4 w-4" /> Ask on WhatsApp
            </Button>
          </a>
        </div>
      </div>
    );
  }

  const whatsappMessage = [
    "Hello Travelian,",
    "",
    "I want to inquire about this tour package:",
    "",
    `Tour: ${tour.name}`,
    `Travel Dates: ${tour.travelDates || "Please confirm"}`,
    `Duration: ${tour.duration}`,
    `Price From: PKR ${tour.basePrice.toLocaleString()}`,
    tour.contactNumbers ? `Contact shown: ${tour.contactNumbers}` : "",
    "",
    "Please share availability and booking details.",
  ].filter(Boolean).join("\n");

  return (
    <div className="bg-muted/30">
      <section className="gradient-hero">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
          <div className="text-primary-foreground">
            <Badge className="mb-4 bg-white/15 text-primary-foreground hover:bg-white/20 capitalize">{tour.packageType || "Tour"}</Badge>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">{tour.name}</h1>
            <p className="mt-3 max-w-3xl text-primary-foreground/80">{tour.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {tour.travelDates && <Badge className="bg-white/15 text-primary-foreground hover:bg-white/20">{tour.travelDates}</Badge>}
              <Badge className="bg-white/15 text-primary-foreground hover:bg-white/20">{tour.duration}</Badge>
              {tour.urgencyText && <Badge className="bg-amber-400 text-slate-950 hover:bg-amber-400">{tour.urgencyText}</Badge>}
            </div>
          </div>
          <Card className="border-white/10 bg-white shadow-2xl">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Starting from</p>
              <p className="mt-1 text-4xl font-black text-primary">PKR {tour.basePrice.toLocaleString()}</p>
              {tour.agentDiscount && <p className="mt-2 font-semibold text-amber-600">{tour.agentDiscount}</p>}
              <a href={`${whatsappBase}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noreferrer">
                <Button className="mt-5 w-full bg-[#25D366] text-white hover:bg-[#20bd5a]"><WhatsAppIcon className="mr-2 h-4 w-4" /> Contact for Booking</Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {tour.image && <img src={tour.image} alt={tour.name} className="max-h-[460px] w-full rounded-2xl object-cover shadow-card" />}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><Hotel className="h-5 w-5 text-primary" /> Hotels</CardTitle></CardHeader>
              <CardContent className="grid gap-3">
                {lines(tour.hotelsText).map((line) => <p key={line} className="rounded-xl border p-3 text-sm font-medium">{line}</p>)}
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><Plane className="h-5 w-5 text-primary" /> Package includes</CardTitle></CardHeader>
              <CardContent className="grid gap-2 md:grid-cols-2">
                {lines(tour.packageIncludesText).map((line) => <p key={line} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 text-success" /> {line}</p>)}
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> Tour plan</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {lines(tour.itineraryText).map((line, index) => (
                  <div key={line} className="flex gap-3 rounded-xl border p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index + 1}</span>
                    <p className="text-sm font-medium">{line}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5 text-primary" /> Package price</CardTitle></CardHeader>
              <CardContent><p className="whitespace-pre-line text-sm font-medium text-foreground">{tour.pricingText || `PKR ${tour.basePrice.toLocaleString()}`}</p></CardContent>
            </Card>
            {tour.childInfantNote && <Card className="shadow-card"><CardContent className="p-5 text-sm font-semibold">{tour.childInfantNote}</CardContent></Card>}
            {tour.contactNumbers && <Card className="shadow-card"><CardHeader><CardTitle>Contact for booking</CardTitle></CardHeader><CardContent className="text-sm font-semibold">{tour.contactNumbers}</CardContent></Card>}
          </aside>
        </div>
      </div>
    </div>
  );
}
