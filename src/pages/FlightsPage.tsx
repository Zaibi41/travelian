import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, BarChart3, Pencil, Plus, ShieldCheck, SlidersHorizontal, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Input } from "@/components/admin/ui/field";
import { Label } from "@/components/admin/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { PricingBreakdownCard } from "@/components/PricingBreakdownCard";
import { deletePricingRule, fetchEnabledFlightProviders, listPricingRules, savePricingRule } from "@/lib/pricing-rule-api";
import type { MarkupRule, MarkupScope } from "@/lib/markup-engine";
import { listFlightSearchLogs, type FlightSearchLogRecord } from "@/lib/flight-search-log-api";

const scopeOptions: MarkupScope[] = ["global", "supplier", "airline", "route", "cabin", "agency", "b2c", "seasonal"];

// Common airlines for quick selection
const commonAirlines = [
  { code: "G9", name: "Air Arabia", label: "Air Arabia (G9)" },
  { code: "PA", name: "Airblue", label: "Airblue (PA)" },
  { code: "PK", name: "Pakistan International Airlines", label: "PIA (PK)" },
  { code: "ER", name: "Fly Jinnah", label: "Fly Jinnah (ER)" },
  { code: "9P", name: "Air Sial", label: "AirSial (9P)" },
  { code: "EK", name: "Emirates", label: "Emirates (EK)" },
  { code: "QR", name: "Qatar Airways", label: "Qatar Airways (QR)" },
  { code: "SV", name: "Saudia", label: "Saudia (SV)" },
  { code: "TK", name: "Turkish Airlines", label: "Turkish Airlines (TK)" },
  { code: "GF", name: "Gulf Air", label: "Gulf Air (GF)" },
  { code: "FZ", name: "Flydubai", label: "flydubai (FZ)" },
  { code: "XY", name: "Flynas", label: "Flynas (XY)" },
  { code: "OV", name: "Salam Air", label: "Salam Air (OV)" },
];

export default function FlightsPage() {
  const [scope, setScope] = useState<MarkupScope>("supplier");
  const [serviceTarget, setServiceTarget] = useState("");
  const [percentage, setPercentage] = useState("0");
  const [fixedAmount, setFixedAmount] = useState("0");
  const [minimumMargin, setMinimumMargin] = useState("0");
  const [baseFare, setBaseFare] = useState(74550);
  const [discount, setDiscount] = useState(0);
  const [providers, setProviders] = useState<string[]>([]);
  const [rules, setRules] = useState<MarkupRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [searchLogs, setSearchLogs] = useState<FlightSearchLogRecord[]>([]);

  const draftRule = useMemo(
    () => ({
      percentage: pricingNumberOrZero(percentage),
      fixedAmount: pricingNumberOrZero(fixedAmount),
      minimumMargin: pricingNumberOrZero(minimumMargin),
    }),
    [percentage, fixedAmount, minimumMargin],
  );

  useEffect(() => {
    let active = true;
    Promise.all([listPricingRules("flights"), fetchEnabledFlightProviders(), listFlightSearchLogs()])
      .then(([savedRules, enabledProviders, logs]) => {
        if (!active) return;
        setRules(savedRules);
        setProviders(enabledProviders);
        setSearchLogs(logs);
        if (enabledProviders.includes("skypass")) setServiceTarget("skypass");
      })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const saveRule = async () => {
    if (requiresTarget(scope) && !serviceTarget.trim()) {
      toast.error("Select or enter a target for this pricing rule.");
      return;
    }
    const parsedPercentage = parsePricingNumber(percentage);
    const parsedFixedAmount = parsePricingNumber(fixedAmount);
    const parsedMinimumMargin = parsePricingNumber(minimumMargin);
    if (parsedPercentage === null || parsedFixedAmount === null || parsedMinimumMargin === null) {
      toast.error("Enter valid numeric values for the pricing adjustment.");
      return;
    }
    if (parsedMinimumMargin < 0) {
      toast.error("Minimum margin protection cannot be negative.");
      return;
    }
    setSaving(true);
    try {
      const rule = await savePricingRule({
        id: editingRuleId || "",
        name: pricingRuleName(scope, serviceTarget),
        service: "flights",
        scope,
        target: requiresTarget(scope) ? serviceTarget.trim() : "",
        percentage: parsedPercentage,
        fixedAmount: parsedFixedAmount,
        minimumMargin: parsedMinimumMargin,
        enabled: true,
      });
      setRules((current) => [rule, ...current.filter((item) => item.id !== rule.id)]);
      setEditingRuleId(null);
      toast.success(editingRuleId ? "Flight pricing rule updated." : "Flight pricing rule saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save pricing rule.");
    } finally {
      setSaving(false);
    }
  };

  const startNewRule = () => {
    setEditingRuleId(null);
    setScope("supplier");
    setServiceTarget(providers.includes("skypass") ? "skypass" : "");
    setPercentage("0");
    setFixedAmount("0");
    setMinimumMargin("0");
    scrollToPricingForm();
  };

  const startEditRule = (rule: MarkupRule) => {
    setEditingRuleId(rule.id);
    setScope(rule.scope);
    setServiceTarget(rule.target || "");
    setPercentage(String(rule.percentage));
    setFixedAmount(String(rule.fixedAmount));
    setMinimumMargin(String(rule.minimumMargin));
    scrollToPricingForm();
  };

  const removeRule = async (rule: MarkupRule) => {
    if (!window.confirm(`Remove "${rule.name}"?`)) return;
    try {
      await deletePricingRule(rule.service, rule.id);
      setRules((current) => current.filter((item) => item.id !== rule.id));
      toast.success("Pricing rule removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove pricing rule.");
    }
  };

  return (
      <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-page-title font-bold font-display">Flight Pricing & Rules</h1>
          <p className="text-body text-muted-foreground">
            Apply server-side pricing adjustments to live API fares by provider, airline, route, cabin or agency.
          </p>
        </div>
        <Button
          className="gradient-primary gap-2 text-primary-foreground"
          onClick={startNewRule}
        >
          <Plus className="h-4 w-4" /> Create Markup Rule
        </Button>
      </div>

      {/* Airline-based promotion example */}
      <Card className="border-primary/20 bg-primary/5 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Tags className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <h3 className="font-bold">Airline-Based Promotions</h3>
              <p className="text-body text-muted-foreground">
                Apply different discounts per airline, regardless of which provider returns them. 
                Example: <span className="font-semibold">Airblue flights get Rs 200 off</span>, 
                <span className="font-semibold ml-1">Air Arabia flights get Rs 100 off</span>, 
                other airlines unchanged.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="outline" className="font-normal">Scope: Airline</Badge>
                <Badge variant="outline" className="font-normal">Works across all providers</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {providers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {providers.map((provider) => (
            <Card key={provider} className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Activity className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary">Enabled</Badge>
                </div>
                <h3 className="mt-4 font-bold text-foreground">{providerLabel(provider)}</h3>
                <p className="mt-1 text-helper text-muted-foreground">Available in the production flight-search provider registry.</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Activity} title="No flight providers enabled" description="Onboard a flight provider before creating supplier-specific pricing rules." />
      )}

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
          <Card id="create-flight-pricing-rule" className="scroll-mt-6 shadow-card">
            <CardHeader>
              <CardTitle className="text-body font-display">{editingRuleId ? "Edit pricing rule" : "Create pricing rule"}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Pricing scope</Label>
                <Select value={scope} onValueChange={(value) => {
                  setScope(value as MarkupScope);
                  setServiceTarget(value === "supplier" && providers.includes("skypass") ? "skypass" : "");
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {scopeOptions.map((item) => (
                      <SelectItem key={item} value={item}>{titleCase(item)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <RuleTarget scope={scope} providers={providers} value={serviceTarget} onChange={setServiceTarget} />
              <div className="space-y-2">
                <Label>Percentage adjustment</Label>
                <Input inputMode="decimal" type="text" value={percentage} onChange={(event) => updatePricingText(event.target.value, setPercentage, true)} />
              </div>
              <div className="space-y-2">
                <Label>Fixed Rs adjustment</Label>
                <Input inputMode="decimal" type="text" value={fixedAmount} onChange={(event) => updatePricingText(event.target.value, setFixedAmount, true)} />
                <p className="text-helper text-muted-foreground">Use a signed value. Example: <span className="font-semibold text-foreground">-500</span> reduces each matching fare by Rs 500.</p>
              </div>
              <div className="space-y-2">
                <Label>Minimum margin protection</Label>
                <Input inputMode="decimal" type="text" value={minimumMargin} onChange={(event) => updatePricingText(event.target.value, setMinimumMargin, false)} />
                <p className="text-helper text-muted-foreground">Keep this at 0 when a negative supplier adjustment must be applied.</p>
              </div>
              <div className="flex items-end">
                <Button className="w-full gradient-primary text-primary-foreground" disabled={saving} onClick={saveRule}>
                  {saving ? "Saving..." : editingRuleId ? "Update rule" : "Save rule"}
                </Button>
              </div>
            </CardContent>
          </Card>
          <PricingBreakdownCard rule={draftRule} baseCost={baseFare} discount={discount} />
          <div className="space-y-3 xl:col-span-2">
            <h2 className="text-body font-bold font-display">Saved flight pricing rules</h2>
            {loading ? (
              <Card className="shadow-card"><CardContent className="p-5 text-body text-muted-foreground">Loading pricing rules...</CardContent></Card>
            ) : rules.length === 0 ? (
              <EmptyState
                icon={SlidersHorizontal}
                title="No flight pricing rules configured"
                description="Live API fares are returned unchanged until a saved server-side pricing rule matches the fare."
              />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {rules.map((rule) => (
                  <Card key={rule.id} className="shadow-card">
                    <CardContent className="flex items-center justify-between gap-4 p-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-foreground">{rule.name}</h3>
                          <Badge variant="secondary">{titleCase(rule.scope)}</Badge>
                        </div>
                        <p className="mt-2 text-body text-muted-foreground">
                          {rule.percentage}% + Rs {rule.fixedAmount.toLocaleString()} adjustment
                          {rule.minimumMargin > 0 ? ` · minimum margin Rs ${rule.minimumMargin.toLocaleString()}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button variant="outline" size="icon" title="Edit pricing rule" onClick={() => startEditRule(rule)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" title="Remove pricing rule" onClick={() => removeRule(rule)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="deals">
          <EmptyState icon={Tags} title="No flight promotions configured" description="Deals are marketing discounts and remain separate from pricing adjustments." />
        </TabsContent>

        <TabsContent value="priority">
          <EmptyState icon={ShieldCheck} title="No supplier priority rules configured" description="Rank onboarded flight providers after supplier priority logic is configured." />
        </TabsContent>

        <TabsContent value="health">
          <EmptyState icon={Activity} title="Provider registry loaded" description="Enabled provider systems are listed above. Detailed provider monitoring is not configured yet." />
        </TabsContent>

        <TabsContent value="failed">
          {searchLogs.filter(log => log.status !== "found").length === 0 ? (
            <EmptyState icon={AlertTriangle} title="No failed searches recorded" description="No-result and provider-error searches will appear here after live requests are recorded." />
          ) : (
            <Card className="shadow-card">
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[760px] text-left text-body">
                  <thead className="border-b bg-muted/40 text-helper uppercase text-muted-foreground">
                    <tr><th className="p-3">Route</th><th className="p-3">Trip</th><th className="p-3">Departure</th><th className="p-3">Return</th><th className="p-3">Providers</th><th className="p-3">Status</th><th className="p-3">Time</th></tr>
                  </thead>
                  <tbody>
                    {searchLogs.filter(log => log.status !== "found").map(log => (
                      <tr key={log.searchLogId} className="border-b last:border-0">
                        <td className="p-3 font-semibold">{log.route}</td>
                        <td className="p-3 capitalize">{log.tripType}</td>
                        <td className="p-3">{log.departureDate}</td>
                        <td className="p-3">{log.returnDate || "-"}</td>
                        <td className="p-3 text-helper text-muted-foreground">{Object.entries(log.providers || {}).map(([provider, status]) => `${provider}: ${status}`).join(", ")}</td>
                        <td className="p-3"><Badge variant={log.status === "error" ? "destructive" : "secondary"}>{log.status.replace("_", " ")}</Badge></td>
                        <td className="p-3 text-helper text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="simulator" className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-body font-display">Fare preview / simulator</CardTitle>
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

function RuleTarget({ scope, providers, value, onChange }: { scope: MarkupScope; providers: string[]; value: string; onChange: (value: string) => void }) {
  if (!requiresTarget(scope)) {
    return (
      <div className="space-y-2">
        <Label>Target</Label>
        <Input disabled value="Applies to all matching fares" />
      </div>
    );
  }
  
  if (scope === "airline") {
    return (
      <div className="space-y-2 md:col-span-2">
        <Label>Airline target</Label>
        <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/20 p-3">
          {commonAirlines.map((airline) => (
            <Button
              key={airline.code}
              type="button"
              size="sm"
              variant={value.toLowerCase() === airline.name.toLowerCase() || value.toUpperCase() === airline.code ? "default" : "outline"}
              onClick={() => onChange(airline.name)}
              className="text-helper"
            >
              {airline.label}
            </Button>
          ))}
        </div>
        <Input 
          value={value} 
          onChange={(event) => onChange(event.target.value)} 
          placeholder={targetPlaceholder(scope)}
          className="mt-2"
        />
        <p className="text-helper text-muted-foreground">
          Select a common airline or type airline name/code. Discount applies to all fares from this airline, regardless of provider.
        </p>
      </div>
    );
  }
  
  if (scope === "supplier") {
    return (
      <div className="space-y-2">
        <Label>API provider</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Select onboarded provider" /></SelectTrigger>
          <SelectContent>
            {providers.map((provider) => <SelectItem key={provider} value={provider}>{providerLabel(provider)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <Label>{titleCase(scope)} target</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={targetPlaceholder(scope)} />
    </div>
  );
}

function requiresTarget(scope: MarkupScope) {
  return !["global", "b2c"].includes(scope);
}

function pricingRuleName(scope: MarkupScope, target: string) {
  return requiresTarget(scope) ? `${titleCase(scope)}: ${target.trim()}` : `${titleCase(scope)} flight pricing`;
}

function targetPlaceholder(scope: MarkupScope) {
  if (scope === "airline") return "e.g. EK or Emirates";
  if (scope === "route") return "e.g. LHE-DXB";
  if (scope === "cabin") return "e.g. Economy";
  if (scope === "agency") return "Agency ID";
  if (scope === "seasonal") return "Season or campaign reference";
  return "Rule target";
}

function providerLabel(provider: string) {
  const labels: Record<string, string> = {
    airsial: "AirSial",
    flyadeal: "flyadeal",
    pia: "PIA",
    skypass: "SkyPass",
    travelport: "Travelport",
  };
  return labels[provider.toLowerCase()] || titleCase(provider);
}

function titleCase(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function scrollToPricingForm() {
  document.getElementById("create-flight-pricing-rule")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updatePricingText(value: string, setValue: (value: string) => void, allowNegative: boolean) {
  const pattern = allowNegative ? /^-?\d*(\.\d*)?$/ : /^\d*(\.\d*)?$/;
  if (pattern.test(value)) setValue(value);
}

function parsePricingNumber(value: string) {
  const parsed = Number(value);
  return value.trim() !== "" && Number.isFinite(parsed) ? parsed : null;
}

function pricingNumberOrZero(value: string) {
  return parsePricingNumber(value) ?? 0;
}
