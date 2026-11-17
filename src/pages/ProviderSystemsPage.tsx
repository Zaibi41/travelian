import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Switch } from "@/components/admin/ui/choice";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/contexts/RoleContext";
import { AlertTriangle, Cloud, KeyRound, Lock, Plane, RefreshCw, Settings2, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import {
  type ProviderSystem,
  loadProviderSystems,
  saveProviderSystems,
} from "@/lib/provider-systems";

const statusStyles: Record<ProviderSystem["status"], string> = {
  healthy: "bg-success/10 text-success border-success/20",
  degraded: "bg-warning/10 text-warning border-warning/20",
  not_configured: "bg-muted text-muted-foreground border-border",
};

const categoryLabels: Record<ProviderSystem["category"], string> = {
  flight: "Flights",
  hotel: "Hotels",
  transfer: "Transfers",
  payment: "Payments",
};

export default function ProviderSystemsPage() {
  const { currentRole } = useRole();
  const [providers, setProviders] = useState<ProviderSystem[]>(loadProviderSystems);
  const activeCount = providers.filter((provider) => provider.enabled).length;
  const healthyCount = providers.filter((provider) => provider.status === "healthy").length;
  const groupTicketingCount = providers.filter((provider) => provider.category === "flight" && provider.isGroupTicketing).length;

  const groupedProviders = useMemo(() => {
    return providers.reduce<Record<string, ProviderSystem[]>>((groups, provider) => {
      const label = categoryLabels[provider.category];
      groups[label] = [...(groups[label] || []), provider].sort((a, b) => a.priority - b.priority);
      return groups;
    }, {});
  }, [providers]);

  if (currentRole !== "super_admin") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-2">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-kpi-sm font-bold font-display">Access Denied</h2>
          <p className="text-body text-muted-foreground">Only Super Admins can manage provider systems.</p>
        </div>
      </div>
    );
  }

  const toggleProvider = (id: string, enabled: boolean) => {
    setProviders((items) => {
      const updated = items.map((item) => item.id === id ? { ...item, enabled } : item);
      saveProviderSystems(updated);
      return updated;
    });
    toast.success(enabled ? "Provider enabled" : "Provider disabled");
  };

  const updateEnvironment = (id: string, environment: ProviderSystem["environment"]) => {
    setProviders((items) => {
      const updated = items.map((item) => item.id === id ? { ...item, environment } : item);
      saveProviderSystems(updated);
      return updated;
    });
    toast.success("Provider environment updated");
  };

  const toggleGroupTicketing = (id: string, isGroupTicketing: boolean) => {
    setProviders((items) => {
      const updated = items.map((item) => item.id === id ? { ...item, isGroupTicketing } : item);
      saveProviderSystems(updated);
      return updated;
    });
    toast.success(isGroupTicketing ? "Marked as group ticketing provider" : "Removed group ticketing status");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-page-title font-bold font-display">Provider Systems</h1>
          <p className="text-body text-muted-foreground">Manage flight, hotel, transfer, and payment integrations from one control center.</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => toast.success("Provider health check queued")}>
          <RefreshCw className="h-4 w-4" /> Run Health Check
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <Cloud className="h-5 w-5 text-primary mb-3" />
            <p className="text-kpi font-bold">{providers.length}</p>
            <p className="text-body text-muted-foreground">Configured systems</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <ShieldCheck className="h-5 w-5 text-success mb-3" />
            <p className="text-kpi font-bold">{activeCount}</p>
            <p className="text-body text-muted-foreground">Enabled in search flow</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <Plane className="h-5 w-5 text-info mb-3" />
            <p className="text-kpi font-bold">{healthyCount}</p>
            <p className="text-body text-muted-foreground">Healthy providers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <Users className="h-5 w-5 text-primary mb-3" />
            <p className="text-kpi font-bold">{groupTicketingCount}</p>
            <p className="text-body text-muted-foreground">Group ticketing providers</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-warning/30">
        <CardContent className="p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-body font-semibold">Secrets stay in AWS Secrets Manager</p>
            <p className="text-helper text-muted-foreground">This screen controls provider status, routing priority, and group ticketing designation. Credential values must remain in the listed secret IDs, never in browser code.</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="Flights" className="space-y-4">
        <TabsList className="h-auto flex-wrap">
          {Object.keys(groupedProviders).map((group) => (
            <TabsTrigger key={group} value={group}>{group}</TabsTrigger>
          ))}
        </TabsList>
        {Object.entries(groupedProviders).map(([group, items]) => (
          <TabsContent key={group} value={group} className="space-y-3">
            {items.map((provider) => (
              <Card key={provider.id} className="shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-body font-display flex items-center gap-2">
                          <Settings2 className="h-4 w-4 text-primary" />
                          {provider.name}
                        </CardTitle>
                        {provider.isGroupTicketing && (
                          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 gap-1 text-helper font-medium">
                            <Users className="h-3 w-3 text-blue-600" /> Group Ticketing
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-helper text-muted-foreground">{provider.endpoint}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={statusStyles[provider.status]}>{provider.status.replace("_", " ")}</Badge>
                      <Switch checked={provider.enabled} onCheckedChange={(checked) => toggleProvider(provider.id, checked)} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-helper text-muted-foreground">Secret ID</p>
                      <p className="mt-1 flex items-center gap-1 text-body font-mono"><KeyRound className="h-3.5 w-3.5" /> {provider.secretId}</p>
                    </div>
                    <div>
                      <p className="text-helper text-muted-foreground">Environment</p>
                      <Select value={provider.environment} onValueChange={(value) => updateEnvironment(provider.id, value as ProviderSystem["environment"])}>
                        <SelectTrigger className="mt-1 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="production">Production</SelectItem>
                          <SelectItem value="staging">Staging</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-helper text-muted-foreground">Priority</p>
                      <p className="mt-2 text-body font-semibold">#{provider.priority}</p>
                    </div>
                    <div>
                      <p className="text-helper text-muted-foreground">Last check</p>
                      <p className="mt-2 text-body font-semibold">{provider.lastChecked}</p>
                    </div>
                  </div>

                  {provider.category === "flight" && (
                    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2.5">
                        <Users className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <p className="text-helper font-semibold text-foreground">Group Ticketing Provider</p>
                          <p className="text-helper text-muted-foreground">
                            Mark this provider as a group ticketing provider. Live search tickets will show the dedicated Group Icon badge.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-helper font-medium text-muted-foreground">
                          {provider.isGroupTicketing ? "Active" : "Disabled"}
                        </span>
                        <Switch
                          checked={Boolean(provider.isGroupTicketing)}
                          onCheckedChange={(checked) => toggleGroupTicketing(provider.id, checked)}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
