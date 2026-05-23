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

export default function PackagesPage() {
  const [packageCost, setPackageCost] = useState(185000);
  const [margin, setMargin] = useState(12);
  const [serviceFee, setServiceFee] = useState(5000);
  const [minimumMargin, setMinimumMargin] = useState(12000);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Umrah Package Management</h1>
          <p className="text-sm text-muted-foreground">Create Economy, Star, Premium and custom Umrah packages with controlled Travelian margins.</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Create Umrah Package</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-display">Package details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Package title</Label><Input placeholder="Economy Umrah, Star Umrah, Premium Umrah" /></div>
            <div className="space-y-2"><Label>Package type</Label><Select defaultValue="economy"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="economy">Economy</SelectItem><SelectItem value="star">Star</SelectItem><SelectItem value="premium">Premium</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Makkah hotel</Label><Input placeholder="Hotel name" /></div>
            <div className="space-y-2"><Label>Madinah hotel</Label><Input placeholder="Hotel name" /></div>
            <div className="space-y-2"><Label>Room sharing</Label><Input placeholder="Quad, triple, double, private" /></div>
            <div className="space-y-2"><Label>Duration</Label><Input placeholder="7 nights / 14 nights" /></div>
            <div className="space-y-2"><Label>Departure city</Label><Input placeholder="LHE, KHI, ISB, SKT" /></div>
            <div className="space-y-2"><Label>Availability status</Label><Select defaultValue="draft"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="available">Available</SelectItem><SelectItem value="sold-out">Sold out</SelectItem><SelectItem value="hidden">Hidden</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Transport included</Label><Select defaultValue="yes"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Included</SelectItem><SelectItem value="no">Not included</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Visa included</Label><Select defaultValue="yes"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Included</SelectItem><SelectItem value="no">Not included</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Ticket included</Label><Select defaultValue="no"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Included</SelectItem><SelectItem value="no">Not included</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Images</Label><Input placeholder="Image URL or upload path" /></div>
            <div className="md:col-span-2 space-y-2"><Label>Terms and conditions</Label><Textarea placeholder="Cancellation, payment, hotel change, visa and ticket terms" rows={4} /></div>
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

      <EmptyState icon={Package} title="No real Umrah packages configured" description="No mock Umrah packages are shown. Create real packages with hotels, transport, visa/ticket inclusion, images, terms, cost and approved Travelian margin." actionLabel="Create first package" onAction={() => undefined} />
    </div>
  );
}
