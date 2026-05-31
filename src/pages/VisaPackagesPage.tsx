import { useState } from "react";
import { FileCheck, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/EmptyState";
import { PricingBreakdownCard } from "@/components/PricingBreakdownCard";

export default function VisaPackagesPage() {
  const [baseCost, setBaseCost] = useState(22000);
  const [margin, setMargin] = useState(10);
  const [serviceFee, setServiceFee] = useState(3500);
  const [minimumMargin, setMinimumMargin] = useState(3000);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Visa Package Management</h1>
          <p className="text-sm text-muted-foreground">Create visit, study, business, country and Umrah visa packages with fee and service-margin control.</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Create Visa Package</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-display">Visa details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Country</Label><Input placeholder="Saudi Arabia, UAE, UK, Turkey" /></div>
            <div className="space-y-2"><Label>Visa type</Label><Select defaultValue="visit"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="country">Country visa package</SelectItem><SelectItem value="visit">Visit visa</SelectItem><SelectItem value="study">Study visa</SelectItem><SelectItem value="business">Business visa</SelectItem><SelectItem value="umrah">Umrah visa</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Processing time</Label><Input placeholder="7 working days" /></div>
            <div className="space-y-2"><Label>Validity</Label><Input placeholder="30 days, 90 days, 1 year" /></div>
            <div className="space-y-2"><Label>Stay duration</Label><Input placeholder="30 days" /></div>
            <div className="space-y-2"><Label>Status</Label><Select defaultValue="draft"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="hidden">Hidden</SelectItem></SelectContent></Select></div>
            <div className="md:col-span-2 space-y-2"><Label>Required documents</Label><Textarea rows={4} placeholder="Passport, CNIC, photo, bank statement, invitation, employment letter..." /></div>
            <div className="md:col-span-2 space-y-2"><Label>Terms</Label><Textarea rows={3} placeholder="Embassy decisions, refund rules, timelines and customer obligations" /></div>
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base font-display">Visa pricing</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2"><Label>Embassy / supplier fee</Label><Input type="number" value={baseCost} onChange={(event) => setBaseCost(Number(event.target.value))} /></div>
              <div className="space-y-2"><Label>Travelian margin %</Label><Input type="number" value={margin} onChange={(event) => setMargin(Number(event.target.value))} /></div>
              <div className="space-y-2"><Label>Service fee</Label><Input type="number" value={serviceFee} onChange={(event) => setServiceFee(Number(event.target.value))} /></div>
              <div className="space-y-2"><Label>Minimum margin</Label><Input type="number" value={minimumMargin} onChange={(event) => setMinimumMargin(Number(event.target.value))} /></div>
            </CardContent>
          </Card>
          <PricingBreakdownCard rule={{ percentage: margin, fixedAmount: serviceFee, minimumMargin }} baseCost={baseCost} />
        </div>
      </div>

      <EmptyState icon={FileCheck} title="No visa packages configured" description="Add published visa packages with required documents, processing time, embassy fee, service fee, margin and terms." />
    </div>
  );
}
