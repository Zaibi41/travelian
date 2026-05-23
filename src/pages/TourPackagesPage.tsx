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

export default function TourPackagesPage() {
  const [baseCost, setBaseCost] = useState(95000);
  const [margin, setMargin] = useState(15);
  const [fee, setFee] = useState(3000);
  const [minimumMargin, setMinimumMargin] = useState(9000);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Tour Package Management</h1>
          <p className="text-sm text-muted-foreground">Create domestic, international, group and custom tours with itinerary and margin control.</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Create Tour</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-display">Tour details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Tour type</Label><Select defaultValue="international"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="domestic">Domestic</SelectItem><SelectItem value="international">International</SelectItem><SelectItem value="group">Group</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Destination</Label><Input placeholder="Baku, Bangkok, Hunza, Turkey" /></div>
            <div className="space-y-2"><Label>Duration</Label><Input placeholder="5 days / 4 nights" /></div>
            <div className="space-y-2"><Label>Availability dates</Label><Input placeholder="Date range or departure dates" /></div>
            <div className="space-y-2"><Label>Hotel details</Label><Input placeholder="Hotel names/category" /></div>
            <div className="space-y-2"><Label>Transport</Label><Input placeholder="Private, SIC, coach, none" /></div>
            <div className="space-y-2"><Label>Meals</Label><Input placeholder="Breakfast, half board, full board" /></div>
            <div className="space-y-2"><Label>Status</Label><Select defaultValue="draft"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="hidden">Hidden</SelectItem></SelectContent></Select></div>
            <div className="md:col-span-2 space-y-2"><Label>Itinerary</Label><Textarea rows={4} placeholder="Day-wise itinerary" /></div>
            <div className="md:col-span-2 space-y-2"><Label>Inclusions / exclusions</Label><Textarea rows={3} placeholder="Flights, hotel, transport, meals, guide, visa, exclusions" /></div>
            <div className="md:col-span-2 space-y-2"><Label>Images</Label><Input placeholder="Image URLs or upload paths" /></div>
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base font-display">Pricing</CardTitle></CardHeader>
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

      <EmptyState icon={Map} title="No real tour packages configured" description="No mock tour packages are displayed. Add real domestic, international, group or custom tours with itinerary, cost, margin and availability." />
    </div>
  );
}
