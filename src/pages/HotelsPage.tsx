import { useState } from "react";
import { BedDouble, Building2, Image, MapPin, Plus, Tags, ToggleLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { PricingBreakdownCard } from "@/components/PricingBreakdownCard";

const hotelSources = ["Agoda API", "Hotelbeds", "Booking.com Affiliate", "Travelport Hotel API"];

export default function HotelsPage() {
  const [baseCost, setBaseCost] = useState(28000);
  const [percentage, setPercentage] = useState(12);
  const [fixedAmount, setFixedAmount] = useState(2000);
  const [minimumMargin, setMinimumMargin] = useState(2500);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Hotel Inventory & Pricing</h1>
          <p className="text-sm text-muted-foreground">Manage API hotels, manual hotels, room types, availability, status and margin rules.</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Add Manual Hotel</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {hotelSources.map((source) => (
          <Card key={source} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground">Not configured</span>
              </div>
              <h3 className="mt-4 font-bold">{source}</h3>
              <p className="mt-1 text-xs text-muted-foreground">No live hotel feed connected yet.</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="api" className="space-y-5">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="api">API Hotels</TabsTrigger>
          <TabsTrigger value="manual">Manual Hotels</TabsTrigger>
          <TabsTrigger value="markup">Markup Rules</TabsTrigger>
          <TabsTrigger value="deals">Deals & Promotions</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="rooms">Room Types</TabsTrigger>
        </TabsList>

        <TabsContent value="api">
          <EmptyState icon={Building2} title="No API hotels available" description="Connect Agoda, Hotelbeds, Booking.com affiliate, or Travelport Hotel API before showing API hotel inventory. Individual hotels can then be enabled or disabled." />
        </TabsContent>

        <TabsContent value="manual" className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base font-display">Manual hotel/package setup</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Hotel name</Label><Input placeholder="Hotel name" /></div>
              <div className="space-y-2"><Label>City / location</Label><Input placeholder="Makkah, Madinah, Dubai" /></div>
              <div className="space-y-2"><Label>Supplier / source</Label><Input placeholder="Manual contract, direct hotel, API supplier" /></div>
              <div className="space-y-2"><Label>Status</Label><Select defaultValue="draft"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="hidden">Hidden</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Amenities</Label><Input placeholder="WiFi, parking, restaurant" /></div>
              <div className="space-y-2"><Label>Images</Label><Input placeholder="Image URL or upload path" /></div>
              <div className="md:col-span-2 space-y-2"><Label>Cancellation policy</Label><Textarea placeholder="Policy shown to agencies and customers" /></div>
              <Button className="md:col-span-2 gradient-primary text-primary-foreground">Save manual hotel</Button>
            </CardContent>
          </Card>
          <EmptyState icon={Image} title="No manual hotels yet" description="Manual inventory will appear here after an admin adds a real hotel contract or package." />
        </TabsContent>

        <TabsContent value="markup" className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base font-display">Hotel markup rule</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Rule type</Label><Select defaultValue="city"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="global">Global</SelectItem><SelectItem value="city">City-based</SelectItem><SelectItem value="supplier">Supplier-based</SelectItem><SelectItem value="seasonal">Seasonal</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Target</Label><Input placeholder="Makkah, Hotelbeds, Ramadan" /></div>
              <div className="space-y-2"><Label>Base cost</Label><Input type="number" value={baseCost} onChange={(event) => setBaseCost(Number(event.target.value))} /></div>
              <div className="space-y-2"><Label>Percentage markup</Label><Input type="number" value={percentage} onChange={(event) => setPercentage(Number(event.target.value))} /></div>
              <div className="space-y-2"><Label>Fixed Rs markup</Label><Input type="number" value={fixedAmount} onChange={(event) => setFixedAmount(Number(event.target.value))} /></div>
              <div className="space-y-2"><Label>Minimum margin</Label><Input type="number" value={minimumMargin} onChange={(event) => setMinimumMargin(Number(event.target.value))} /></div>
            </CardContent>
          </Card>
          <PricingBreakdownCard rule={{ percentage, fixedAmount, minimumMargin }} baseCost={baseCost} />
        </TabsContent>

        <TabsContent value="deals"><EmptyState icon={Tags} title="No hotel deals configured" description="Create seasonal offers, city campaigns, supplier promotions, agency deals and coupon codes without breaching minimum margin rules." /></TabsContent>
        <TabsContent value="availability"><EmptyState icon={ToggleLeft} title="No live availability feed connected" description="Availability should come from API sources or confirmed manual contracts before being shown to agencies or customers." /></TabsContent>
        <TabsContent value="rooms"><EmptyState icon={BedDouble} title="No room types configured" description="Add room types, sharing options, meal plans, cancellation rules and margins for real hotel inventory." /></TabsContent>
      </Tabs>
    </div>
  );
}
