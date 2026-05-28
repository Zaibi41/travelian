import { useState } from "react";
import { Hotel, Image, Package, Plus } from "lucide-react";
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

export default function PackagesPage() {
  const { packages, addPackage } = useAdmin();
  const [form, setForm] = useState({
    title: "",
    type: "economy",
    makkahHotel: "",
    madinahHotel: "",
    roomSharing: "",
    duration: "",
    departureCity: "",
    status: "draft",
    transportIncluded: "yes",
    visaIncluded: "yes",
    ticketIncluded: "no",
    image: "",
    terms: "",
  });
  const [packageCost, setPackageCost] = useState(185000);
  const [margin, setMargin] = useState(12);
  const [serviceFee, setServiceFee] = useState(5000);
  const [minimumMargin, setMinimumMargin] = useState(12000);
  const markupAmount = Math.max(minimumMargin, Math.round(packageCost * (margin / 100)) + serviceFee);
  const finalPrice = packageCost + markupAmount;

  const setField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const handleSave = () => {
    if (!form.title.trim()) {
      toast.error("Package title is required");
      return;
    }
    if (!form.duration.trim()) {
      toast.error("Duration is required");
      return;
    }
    if (packageCost <= 0) {
      toast.error("Package cost must be greater than zero");
      return;
    }

    addPackage({
      packageId: `umrah-${Date.now()}`,
      name: form.title.trim(),
      description: form.terms.trim() || `${form.type} Umrah package from ${form.departureCity || "Travelian"}`,
      basePrice: finalPrice,
      duration: form.duration.trim(),
      hotel: [form.makkahHotel, form.madinahHotel].filter(Boolean).join(" / "),
      city: form.departureCity.trim(),
      status: form.status === "available" ? "active" : "inactive",
      includes: [
        form.transportIncluded === "yes" ? "Transport" : "",
        form.visaIncluded === "yes" ? "Visa" : "",
        form.ticketIncluded === "yes" ? "Ticket" : "",
      ].filter(Boolean),
      category: "umrah",
      image: form.image.trim() || undefined,
    });
    toast.success("Umrah package saved");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Umrah Package Management</h1>
          <p className="text-sm text-muted-foreground">Create Economy, Star, Premium and custom Umrah packages with controlled Travelian margins.</p>
        </div>
        <Button onClick={handleSave} className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Save Umrah Package</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-display">Package details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Package title</Label><Input value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="Economy Umrah, Star Umrah, Premium Umrah" /></div>
            <div className="space-y-2"><Label>Package type</Label><Select value={form.type} onValueChange={(value) => setField("type", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="economy">Economy</SelectItem><SelectItem value="star">Star</SelectItem><SelectItem value="premium">Premium</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Makkah hotel</Label><Input value={form.makkahHotel} onChange={(event) => setField("makkahHotel", event.target.value)} placeholder="Hotel name" /></div>
            <div className="space-y-2"><Label>Madinah hotel</Label><Input value={form.madinahHotel} onChange={(event) => setField("madinahHotel", event.target.value)} placeholder="Hotel name" /></div>
            <div className="space-y-2"><Label>Room sharing</Label><Input value={form.roomSharing} onChange={(event) => setField("roomSharing", event.target.value)} placeholder="Quad, triple, double, private" /></div>
            <div className="space-y-2"><Label>Duration</Label><Input value={form.duration} onChange={(event) => setField("duration", event.target.value)} placeholder="7 nights / 14 nights" /></div>
            <div className="space-y-2"><Label>Departure city</Label><Input value={form.departureCity} onChange={(event) => setField("departureCity", event.target.value)} placeholder="LHE, KHI, ISB, SKT" /></div>
            <div className="space-y-2"><Label>Availability status</Label><Select value={form.status} onValueChange={(value) => setField("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="available">Available</SelectItem><SelectItem value="sold-out">Sold out</SelectItem><SelectItem value="hidden">Hidden</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Transport included</Label><Select value={form.transportIncluded} onValueChange={(value) => setField("transportIncluded", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Included</SelectItem><SelectItem value="no">Not included</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Visa included</Label><Select value={form.visaIncluded} onValueChange={(value) => setField("visaIncluded", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Included</SelectItem><SelectItem value="no">Not included</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Ticket included</Label><Select value={form.ticketIncluded} onValueChange={(value) => setField("ticketIncluded", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Included</SelectItem><SelectItem value="no">Not included</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Images</Label><Input value={form.image} onChange={(event) => setField("image", event.target.value)} placeholder="Image URL or upload path" /></div>
            <div className="md:col-span-2 space-y-2"><Label>Terms and conditions</Label><Textarea value={form.terms} onChange={(event) => setField("terms", event.target.value)} placeholder="Cancellation, payment, hotel change, visa and ticket terms" rows={4} /></div>
            <Button onClick={handleSave} className="md:col-span-2 gradient-primary text-primary-foreground">Save package</Button>
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base font-display">Cost & margin</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2"><Label>Package cost</Label><Input type="number" value={packageCost} onChange={(event) => setPackageCost(Number(event.target.value))} /></div>
              <div className="space-y-2"><Label>Travelian margin %</Label><Input type="number" value={margin} onChange={(event) => setMargin(Number(event.target.value))} /></div>
              <div className="space-y-2"><Label>Fixed service fee</Label><Input type="number" value={serviceFee} onChange={(event) => setServiceFee(Number(event.target.value))} /></div>
              <div className="space-y-2"><Label>Minimum margin</Label><Input type="number" value={minimumMargin} onChange={(event) => setMinimumMargin(Number(event.target.value))} /></div>
            </CardContent>
          </Card>
          <PricingBreakdownCard rule={{ percentage: margin, fixedAmount: serviceFee, minimumMargin }} baseCost={packageCost} />
        </div>
      </div>

      {packages.length === 0 ? (
        <EmptyState icon={Package} title="No real Umrah packages configured" description="No mock Umrah packages are shown. Create real packages with hotels, transport, visa/ticket inclusion, images, terms, cost and approved Travelian margin." actionLabel="Save package" onAction={handleSave} />
      ) : (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-display">Saved Umrah packages</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {packages.map((item) => (
              <div key={item.packageId} className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-foreground">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.duration} · {item.hotel || "Hotels not set"} · {item.city || "Departure city not set"}</p>
                </div>
                <p className="font-bold text-primary">PKR {item.basePrice.toLocaleString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
