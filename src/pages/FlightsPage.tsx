import { useMemo, useState } from "react";
import { AlertTriangle, Activity, BarChart3, Plane, Plus, Route, ShieldCheck, SlidersHorizontal, Tags } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { PricingBreakdownCard } from "@/components/PricingBreakdownCard";
import type { MarkupRule, MarkupScope } from "@/lib/markup-engine";

const apiSources = ["Travelport", "Sabre", "Amadeus", "Airline APIs"];
const emptyRules: MarkupRule[] = [];

export default function FlightsPage() {
  const [scope, setScope] = useState<MarkupScope>("global");
  const [serviceTarget, setServiceTarget] = useState("");
  const [percentage, setPercentage] = useState(8);
  const [fixedAmount, setFixedAmount] = useState(2500);
  const [minimumMargin, setMinimumMargin] = useState(1500);
  const [baseFare, setBaseFare] = useState(74550);
  const [discount, setDiscount] = useState(0);

  const draftRule = useMemo(
    () => ({ percentage, fixedAmount, minimumMargin }),
    [percentage, fixedAmount, minimumMargin],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Flight Pricing & Rules</h1>
          <p className="text-sm text-muted-foreground">
            Flights are API-driven. Manage supplier priority, markups, deals, API health and fare simulation.
          </p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-2">
          <Plus className="h-4 w-4" /> Create Markup Rule
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {apiSources.map((source) => (
          <Card key={source} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Activity className="h-5 w-5" />
                </div>
                <Badge variant="secondary">Not configured</Badge>
              </div>
              <h3 className="mt-4 font-bold text-foreground">{source}</h3>
              <p className="mt-1 text-xs text-muted-foreground">Connect credentials and health checks through Provider Systems.</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="markup" className="space-y-5">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="markup" className="gap-2"><SlidersHorizontal className="h-4 w-4" /> Markup Rules</TabsTrigger>
          <TabsTrigger value="deals" className="gap-2"><Tags className="h-4 w-4" /> Deals & Promotions</TabsTrigger>
          <TabsTrigger value="priority" className="gap-2"><ShieldCheck className="h-4 w-4" /> Supplier Priority</TabsTrigger>
          <TabsTrigger value="health" className="gap-2"><Activity className="h-4 w-4" /> API Health</TabsTrigger>
          <TabsTrigger value="failed" className="gap-2"><AlertTriangle className="h-4 w-4" /> Failed Searches</TabsTrigger>
          <TabsTrigger value="simulator" className="gap-2"><BarChart3 className="h-4 w-4" /> Fare Simulator</TabsTrigger>
        </TabsList>

        <TabsContent value="markup" className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base font-display">Create pricing rule</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Markup scope</Label>
                <Select value={scope} onValueChange={(value) => setScope(value as MarkupScope)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["global", "supplier", "airline", "route", "cabin", "agency", "b2c", "seasonal"].map((item) => (
                      <SelectItem key={item} value={item}>{item.replace(/\b\w/g, (l) => l.toUpperCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target</Label>
                <Input value={serviceTarget} onChange={(event) => setServiceTarget(event.target.value)} placeholder="e.g. EK, LHE-DXB, Economy, Agency ID" />
              </div>
              <div className="space-y-2">
                <Label>Percentage markup</Label>
                <Input type="number" value={percentage} onChange={(event) => setPercentage(Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Fixed PKR service fee</Label>
                <Input type="number" value={fixedAmount} onChange={(event) => setFixedAmount(Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Minimum margin protection</Label>
                <Input type="number" value={minimumMargin} onChange={(event) => setMinimumMargin(Number(event.target.value))} />
              </div>
              <div className="flex items-end">
                <Button className="w-full gradient-primary text-primary-foreground">Save rule</Button>
              </div>
            </CardContent>
          </Card>
          <PricingBreakdownCard rule={draftRule} baseCost={baseFare} discount={discount} />
          <div className="xl:col-span-2">
            <EmptyState
              icon={SlidersHorizontal}
              title="No flight markup rules configured"
              description="Create global, supplier, airline, route, cabin, agency, B2C or seasonal rules. Until configured, API fares should not be artificially changed."
            />
          </div>
        </TabsContent>

        <TabsContent value="deals">
          <EmptyState icon={Tags} title="No flight promotions configured" description="Deals are marketing discounts and remain separate from markup. Add date ranges, coupon codes and minimum-margin approval rules before publishing offers." />
        </TabsContent>

        <TabsContent value="priority">
          <EmptyState icon={ShieldCheck} title="No supplier priority rules configured" description="Rank Travelport, Sabre, Amadeus and airline APIs once provider credentials and contracts are active." />
        </TabsContent>

        <TabsContent value="health">
          <EmptyState icon={Activity} title="No live API health data yet" description="Provider health should come from real API checks. Configure provider credentials in System before showing status." />
        </TabsContent>

        <TabsContent value="failed">
          <EmptyState icon={AlertTriangle} title="No failed searches recorded" description="Failed search monitoring will populate from production search logs when API requests return no valid fares or provider errors." />
        </TabsContent>

        <TabsContent value="simulator" className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base font-display">Fare preview / simulator</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Base fare from API</Label>
                <Input type="number" value={baseFare} onChange={(event) => setBaseFare(Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Marketing discount</Label>
                <Input type="number" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Route</Label>
                <Input placeholder="LHE-DXB" />
              </div>
              <div className="space-y-2">
                <Label>Cabin</Label>
                <Input placeholder="Economy" />
              </div>
            </CardContent>
          </Card>
          <PricingBreakdownCard rule={draftRule} baseCost={baseFare} discount={discount} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
