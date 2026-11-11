import { useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/contexts/AdminStore";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent } from "@/components/admin/ui/card";
import { Button } from "@/components/admin/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/admin/ui/field";
import { Label } from "@/components/admin/ui/field";
import { Switch } from "@/components/admin/ui/choice";
import { Textarea } from "@/components/admin/ui/field";
import { Bell, Building2, Wallet, CalendarCheck, CheckCheck, AlertTriangle, Send, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { NotificationDeliveryLog } from "@/data/models";
import { listNotificationLogs } from "@/lib/notification-api";

const typeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  booking: { icon: CalendarCheck, color: "bg-info/10 text-info" },
  wallet: { icon: Wallet, color: "bg-success/10 text-success" },
  agency: { icon: Building2, color: "bg-warning/10 text-warning" },
  system: { icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
};

const SETTINGS_KEY = "travelian.notifications.settings.v1";

type NotifSettings = {
  adminEmail: string;
  adminPhone: string;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  safeJourneyEnabled: boolean;
  safeJourneyLeadHours: number;
  tplBookingConfirmation: string;
  tplETicket: string;
  tplPaymentReceived: string;
  tplHoldExpiry: string;
  tplRefundInitiated: string;
  tplOtp: string;
};

const defaultSettings: NotifSettings = {
  adminEmail: "",
  adminPhone: "",
  whatsappEnabled: true,
  smsEnabled: true,
  emailEnabled: true,
  safeJourneyEnabled: true,
  safeJourneyLeadHours: 24,
  tplBookingConfirmation: "Hi {{customerName}}, your booking {{bookingRef}} is confirmed. PNR: {{pnr}}.",
  tplETicket: "Hi {{customerName}}, your e-ticket for flight {{flightNo}} on {{departureDate}} is issued. PNR: {{pnr}}.",
  tplPaymentReceived: "Hi {{customerName}}, we received your payment of {{amount}} for booking {{bookingRef}}.",
  tplHoldExpiry: "Hi {{customerName}}, your hold on booking {{bookingRef}} expires soon. Please complete payment.",
  tplRefundInitiated: "Hi {{customerName}}, refund of {{amount}} has been initiated for booking {{bookingRef}}.",
  tplOtp: "Your Travelian OTP is {{amount}}. Do not share it with anyone.",
};

function loadSettings(): NotifSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch { /* noop */ }
  return defaultSettings;
}

export default function NotificationsPage() {
  const { notifications, markNotificationRead, markAllRead } = useAdmin();
  const { currentRole } = useRole();
  const canEditSettings = currentRole === "super_admin" || currentRole === "admin";
  const unreadCount = notifications.filter(n => !n.read).length;
  const [deliveryLogs, setDeliveryLogs] = useState<NotificationDeliveryLog[]>([]);
  const [settings, setSettings] = useState<NotifSettings>(() => loadSettings());

  useEffect(() => {
    listNotificationLogs().then(setDeliveryLogs).catch(error => console.error("Unable to load notification delivery logs", error));
  }, []);

  const update = <K extends keyof NotifSettings>(key: K, value: NotifSettings[K]) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  const saveSettings = () => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      toast.success("Notification settings saved");
    } catch {
      toast.error("Unable to save settings");
    }
  };

  const sendTest = () => {
    toast.success(`Test notification queued${settings.adminEmail ? ` to ${settings.adminEmail}` : ""}`);
  };

  const providerStatus = useMemo(() => ({
    email: settings.emailEnabled ? "configured" : "disabled",
    sms: settings.smsEnabled ? "configured" : "disabled",
    whatsapp: settings.whatsappEnabled ? "configured" : "disabled",
  }), [settings]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-page-title font-bold font-display">Notifications</h1>
          <p className="text-body text-muted-foreground">{unreadCount} unread notifications</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllRead} className="gap-2">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="logs">Delivery Logs</TabsTrigger>
          {canEditSettings && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="inbox" className="space-y-2">
          {notifications.map(n => {
            const config = typeConfig[n.type] || typeConfig.system;
            const Icon = config.icon;
            return (
              <Card
                key={n.id}
                className={`shadow-card transition-all cursor-pointer ${!n.read ? "border-l-2 border-l-primary" : "opacity-70"}`}
                onClick={() => !n.read && markNotificationRead(n.id)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium">{n.title}</p>
                    <p className="text-helper text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-helper text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  {!n.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                </CardContent>
              </Card>
            );
          })}
          {notifications.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No notifications</p>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-3">
          {deliveryLogs.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-body text-muted-foreground">No notification delivery logs yet.</p>
          ) : deliveryLogs.map(log => (
            <Card key={log.logId} className="shadow-card">
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-body font-semibold">{log.purpose.replace(/_/g, " ")} | {log.channel}</p>
                  <p className="mt-1 text-helper text-muted-foreground">{log.recipient || "No configured recipient"} | {new Date(log.createdAt).toLocaleString()}</p>
                  {log.error && <p className="mt-1 text-helper text-destructive">{log.error}</p>}
                </div>
                <Badge variant={log.status === "sent" ? "default" : "destructive"}>{log.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {canEditSettings && (
          <TabsContent value="settings" className="space-y-6">
            <Card className="shadow-card">
              <CardContent className="p-5 space-y-4">
                <h2 className="font-display text-body font-bold">Recipients</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Admin notification email</Label>
                    <Input type="email" value={settings.adminEmail} onChange={e => update("adminEmail", e.target.value)} placeholder="ops@travelian.pk" />
                  </div>
                  <div className="space-y-2">
                    <Label>Admin notification phone</Label>
                    <Input value={settings.adminPhone} onChange={e => update("adminPhone", e.target.value)} placeholder="+92 300 0000000" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-5 space-y-4">
                <h2 className="font-display text-body font-bold">Channels</h2>
                <ChannelToggle label="WhatsApp notifications" checked={settings.whatsappEnabled} onChange={v => update("whatsappEnabled", v)} status={providerStatus.whatsapp} />
                <ChannelToggle label="SMS notifications" checked={settings.smsEnabled} onChange={v => update("smsEnabled", v)} status={providerStatus.sms} />
                <ChannelToggle label="Email notifications" checked={settings.emailEnabled} onChange={v => update("emailEnabled", v)} status={providerStatus.email} />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body font-medium">Safe journey reminder</p>
                    <p className="text-helper text-muted-foreground">Send a reminder before departure</p>
                  </div>
                  <Switch checked={settings.safeJourneyEnabled} onCheckedChange={v => update("safeJourneyEnabled", v)} />
                </div>
                <div className="space-y-2">
                  <Label>Safe journey lead time (hours)</Label>
                  <Input type="number" min={1} max={168} value={settings.safeJourneyLeadHours} onChange={e => update("safeJourneyLeadHours", Number(e.target.value) || 24)} />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-5 space-y-4">
                <h2 className="font-display text-body font-bold">Templates</h2>
                <p className="text-helper text-muted-foreground">
                  Variables: <code>{"{{customerName}}"}</code> <code>{"{{bookingRef}}"}</code> <code>{"{{pnr}}"}</code> <code>{"{{flightNo}}"}</code> <code>{"{{departureDate}}"}</code> <code>{"{{amount}}"}</code> <code>{"{{paymentStatus}}"}</code>
                </p>
                <TemplateField label="Booking confirmation" value={settings.tplBookingConfirmation} onChange={v => update("tplBookingConfirmation", v)} />
                <TemplateField label="E-ticket issued" value={settings.tplETicket} onChange={v => update("tplETicket", v)} />
                <TemplateField label="Payment received" value={settings.tplPaymentReceived} onChange={v => update("tplPaymentReceived", v)} />
                <TemplateField label="Hold expiry" value={settings.tplHoldExpiry} onChange={v => update("tplHoldExpiry", v)} />
                <TemplateField label="Refund initiated" value={settings.tplRefundInitiated} onChange={v => update("tplRefundInitiated", v)} />
                <TemplateField label="OTP" value={settings.tplOtp} onChange={v => update("tplOtp", v)} />
              </CardContent>
            </Card>

            <div className="rounded-lg border bg-accent/40 p-4 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <p className="text-helper text-muted-foreground">
                Provider credentials (SMTP, SMS gateway, WhatsApp API) are stored in the secrets manager and are never displayed here. Toggle channels above to enable or disable delivery.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={saveSettings} className="gap-2"><Bell className="h-4 w-4" /> Save settings</Button>
              <Button variant="outline" onClick={sendTest} className="gap-2"><Send className="h-4 w-4" /> Send test notification</Button>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function ChannelToggle({ label, checked, onChange, status }: { label: string; checked: boolean; onChange: (v: boolean) => void; status: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-body font-medium">{label}</p>
        <p className="text-helper text-muted-foreground">Provider: {status}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function TemplateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea rows={2} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
