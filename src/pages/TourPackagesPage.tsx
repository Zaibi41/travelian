import { useState } from "react";
import { Map, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/EmptyState";
import { PricingBreakdownCard } from "@/components/PricingBreakdownCard";
import { useAdmin } from "@/contexts/AdminStore";
import { toast } from "sonner";

const defaultIncludes = [
  "International Return Ticket",
  "Domestic Flight (KL to Bangkok)",
  "Sri Lanka ETA + Malaysia E-Visa + Thailand E-Visa",
  "Hotel Stay with Breakfast",
  "Airport Transfers",
  "KL City Tour",
  "Genting Highlands + Cable Car + Batu Caves",
  "Coral Island Tour with Lunch",
  "Bangkok Temples Tour + Gems Gallery",
].join("\n");

const defaultPlan = [
  "Day 1: Colombo Arrival (Transit Stay)",
  "Day 2: Kuala Lumpur Arrival + City Tour",
  "Day 3: Genting Highlands Tour",
  "Day 4: Free Day",
  "Day 5: Flight to Bangkok -> Pattaya",
  "Day 6: Coral Island Tour",
  "Day 7: Transfer to Bangkok",
  "Day 8: Bangkok City Tour",
  "Day 9: Departure",
].join("\n");

export default function TourPackagesPage() {
  const { tourPackages, addTourPackage } = useAdmin();
  const [form, setForm] = useState({
    title: "Sri Lanka + Malaysia + Thailand Tour",
    type: "international",
    destination: "Sri Lanka, Malaysia, Thailand",
    duration: "9 days / 8 nights",
    travelDates: "08 JUN - 16 JUN",
    hotelsText: "Colombo (Transit Stay)\nKuala Lumpur - 3 Nights\nPattaya - 2 Nights\nBangkok - 2 Nights",
    includes: defaultIncludes,
    pricing: "From Lahore\nDouble: PKR 395,000\nTriple: PKR 385,000\n\nFrom Karachi\nDouble: PKR 370,000\nTriple: PKR 360,000",
    itinerary: defaultPlan,
    childInfantNote: "Child & infant rates available",
    agentDiscount: "15000 Agent Discounts",
    urgencyText: "Limited Slots - Book Now!",
    contactNumbers: "0321-7277078 | 0345-7775328",
    image: "",
    status: "draft",
  });
  const [baseCost, setBaseCost] = useState(360000);
  const [margin, setMargin] = useState(0);
  const [fee, setFee] = useState(0);
  const [minimumMargin, setMinimumMargin] = useState(15000);
  const finalPrice = baseCost + Math.max(minimumMargin, Math.round(baseCost * (margin / 100)) + fee);

  const setField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const handleSave = () => {
    if (!form.title.trim()) return toast.error("Tour title is required");
    if (!form.destination.trim()) return toast.error("Destination is required");
    if (!form.travelDates.trim()) return toast.error("Travel dates are required");

    addTourPackage({
      packageId: `tour-${Date.now()}`,
      name: form.title.trim(),
      description: `${form.destination} tour for ${form.travelDates}`,
      basePrice: finalPrice,
      duration: form.duration.trim(),
      hotel: form.hotelsText.trim(),
      city: form.destination.trim(),
      status: form.status === "active" ? "active" : "inactive",
      includes: form.includes.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
      category: "tour",
      image: form.image.trim() || undefined,
      packageType: form.type,
      travelDates: form.travelDates.trim(),
      hotelsText: form.hotelsText.trim(),
      packageIncludesText: form.includes.trim(),
      pricingText: form.pricing.trim(),
      itineraryText: form.itinerary.trim(),
      childInfantNote: form.childInfantNote.trim(),
      agentDiscount: form.agentDiscount.trim(),
      urgencyText: form.urgencyText.trim(),
      contactNumbers: form.contactNumbers.trim(),
    });
    toast.success("Tour package saved");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Tour Package Management</h1>
          <p className="text-sm text-muted-foreground">Create public tour offers with travel dates, hotels, inclusions, pricing, day plan and booking contact.</p>
        </div>
        <Button onClick={handleSave} className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Save Tour</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-display">Tour details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Tour title</Label><Input value={form.title} onChange={(event) => setField("title", event.target.value)} /></div>
            <div className="space-y-2"><Label>Tour type</Label><Select value={form.type} onValueChange={(value) => setField("type", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="domestic">Domestic</SelectItem><SelectItem value="international">International</SelectItem><SelectItem value="group">Group</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Destination</Label><Input value={form.destination} onChange={(event) => setField("destination", event.target.value)} /></div>
            <div className="space-y-2"><Label>Duration</Label><Input value={form.duration} onChange={(event) => setField("duration", event.target.value)} /></div>
            <div className="space-y-2"><Label>Travel dates</Label><Input value={form.travelDates} onChange={(event) => setField("travelDates", event.target.value)} /></div>
            <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(value) => setField("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active / Published</SelectItem><SelectItem value="hidden">Hidden</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Agent discount</Label><Input value={form.agentDiscount} onChange={(event) => setField("agentDiscount", event.target.value)} /></div>
            <div className="space-y-2"><Label>Booking contact numbers</Label><Input value={form.contactNumbers} onChange={(event) => setField("contactNumbers", event.target.value)} /></div>
            <div className="space-y-2"><Label>Urgency label</Label><Input value={form.urgencyText} onChange={(event) => setField("urgencyText", event.target.value)} /></div>
            <div className="space-y-2"><Label>Image</Label><Input value={form.image} onChange={(event) => setField("image", event.target.value)} placeholder="Image URL or upload path" /></div>
            <div className="md:col-span-2 space-y-2"><Label>Hotels</Label><Textarea rows={4} value={form.hotelsText} onChange={(event) => setField("hotelsText", event.target.value)} /></div>
            <div className="md:col-span-2 space-y-2"><Label>Package includes</Label><Textarea rows={6} value={form.includes} onChange={(event) => setField("includes", event.target.value)} /></div>
            <div className="md:col-span-2 space-y-2"><Label>Package pricing</Label><Textarea rows={5} value={form.pricing} onChange={(event) => setField("pricing", event.target.value)} /></div>
            <div className="md:col-span-2 space-y-2"><Label>Child & infant note</Label><Input value={form.childInfantNote} onChange={(event) => setField("childInfantNote", event.target.value)} /></div>
            <div className="md:col-span-2 space-y-2"><Label>Tour plan</Label><Textarea rows={7} value={form.itinerary} onChange={(event) => setField("itinerary", event.target.value)} /></div>
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base font-display">Pricing & margin</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2"><Label>Base cost</Label><Input type="number" value={baseCost} onChange={(event) => setBaseCost(Number(event.target.value))} /></div>
              <div className="space-y-2"><Label>Travelian margin %</Label><Input type="number" value={margin} onChange={(event) => setMargin(Number(event.target.value))} /></div>
              <div className="space-y-2"><Label>Fixed fee</Label><Input type="number" value={fee} onChange={(event) => setFee(Number(event.target.value))} /></div>
              <div className="space-y-2"><Label>Minimum margin</Label><Input type="number" value={minimumMargin} onChange={(event) => setMinimumMargin(Number(event.target.value))} /></div>
            </CardContent>
          </Card>
          <PricingBreakdownCard rule={{ percentage: margin, fixedAmount: fee, minimumMargin }} baseCost={baseCost} />
        </div>
      </div>

      {tourPackages.length === 0 ? (
        <EmptyState icon={Map} title="No real tour packages configured" description="No mock tour packages are displayed. Save a real domestic, international, group or custom tour with itinerary, cost, margin and availability." actionLabel="Save tour" onAction={handleSave} />
      ) : (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-display">Saved tour packages</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {tourPackages.map((tour) => (
              <div key={tour.packageId} className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{tour.name}</p>
                  <p className="text-sm text-muted-foreground">{tour.travelDates} · {tour.duration} · {tour.city}</p>
                </div>
                <p className="font-bold text-primary">PKR {tour.basePrice.toLocaleString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
