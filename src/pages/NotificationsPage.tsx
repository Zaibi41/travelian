import { useBookingAlerts } from "@/lib/admin-notifications";
import { Link } from "react-router-dom";
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
import { Bell, Building2, Wallet, CalendarCheck, CheckCheck, AlertTriangle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { NotificationDeliveryLog } from "@/data/models";
import { listNotificationLogs } from "@/lib/notification-api";
import { CopyPnr } from "@/components/CopyPnr";
import { bookingDetailPath } from "@/lib/admin-bookings/tabs";
import { AirlineLogo } from "@/components/admin/ui/AirlineLogo";

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
  const alerts = useBookingAlerts();
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
          <p className="text-body text-muted-foreground">{unreadCount + alerts.unseen} unread notifications</p>
        </div>
        {unreadCount + alerts.unseen > 0 && (
          <Button variant="outline" onClick={() => { markAllRead(); alerts.markSeen(); }} className="gap-2">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      {/* Booking alerts from the gateway: every hold and booking request, with what staff need to act on. */}
      <section aria-labelledby="booking-alerts" className="rounded-xl border bg-card p-4 shadow-card">
        <h2 id="booking-alerts" className="font-display text-section font-semibold">Booking alerts</h2>
        {/* D41: honest state while email isn't set up on the server; the alerts below still work. */}
        {alerts.emailEnabled === false && (
          <p role="status" className="mt-2 rounded-lg border border-status-action/40 bg-status-action-soft px-3 py-2 text-body text-foreground">
            <span className="font-semibold">Email alerts aren't set up yet.</span> Booking alerts appear here, but nothing is emailed to staff until
            email sending is configured on the server.
          </p>
        )}
        {alerts.error ? <p className="mt-2 text-body text-destructive">Booking alerts couldn't be loaded.</p>
          : alerts.items.length === 0 ? <p className="mt-2 text-body text-muted-foreground">{alerts.isLoading ? "Loading…" : "No booking alerts yet."}</p>
          : (
            <ul className="mt-2 divide-y">
              {alerts.items.map(alert => {
                const d = alert.details as Record<string, string | null>;
                // Red alert: a customer paid by card and has no ticket. Red stripe plus the word "Urgent" (never colour alone).
                return (
                  <li key={alert.id} className={`flex flex-col gap-1 py-2.5 ${alert.urgent ? "-mx-2 rounded-md border-l-4 border-l-status-critical bg-status-critical-soft px-2" : ""}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        {/* #75: the booking's airline logo. */}
                        {(alert.airline_code || alert.airline_name) && (
                          <AirlineLogo airline={alert.airline_name ?? alert.airline_code ?? ""} flightNumber={alert.flight_number ?? undefined}
                            code={alert.airline_code} className="h-7 w-7 shrink-0 rounded-md" />
                        )}
                        {alert.urgent && <span className="shrink-0 rounded bg-destructive px-1.5 text-label font-semibold uppercase text-destructive-foreground">Urgent</span>}
                        {/* The alert's reference is the booking ID the detail page is keyed by. */}
                        {alert.reference ? (
                          <Link to={bookingDetailPath(alert.reference)} className={`min-w-0 truncate font-semibold hover:underline ${alert.urgent ? "text-status-critical-text" : "text-teal"}`}>{alert.title}</Link>
                        ) : (
                          <span className="min-w-0 truncate font-semibold text-foreground">{alert.title}</span>
                        )}
                      </span>
                      <time className="text-helper text-muted-foreground" dateTime={alert.created_at}>{new Date(alert.created_at).toLocaleString()}</time>
                    </div>
                    {alert.kind === "contact_message" ? (
                      // gateway issue 114: a message from the website's Contact page; reply to the customer directly.
                      <div className="flex min-w-0 flex-col gap-1 text-body">
                        <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                          {d.email && <a href={`mailto:${d.email}`} className="break-all text-teal hover:underline">{d.email}</a>}
                          {d.phone && <a href={`tel:${d.phone.replace(/[^+\d]/g, "")}`} className="text-teal hover:underline">{d.phone}</a>}
                        </p>
                        <p className="whitespace-pre-wrap break-words text-foreground">{d.message}</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-body text-muted-foreground">
                          {[d.passenger, d.route, d.fare].filter(Boolean).map(part => `${part} · `).join("")}
                          {d.pnr ? <>PNR {d.pnr} <CopyPnr pnr={d.pnr} /></> : "No supplier hold"}
                          {d.hold_expires_at ? ` · expires ${new Date(d.hold_expires_at).toLocaleString()}` : null}
                        </p>
                        {!alert.reference && <p className="text-helper text-muted-foreground">This alert isn't linked to a booking, so it can't be opened.</p>}
                      </>
                    )}
                    {alert.urgent ? (
                      <dl className="grid grid-cols-1 gap-x-4 gap-y-0.5 text-helper sm:grid-cols-2">
                        {([["Amount received", d.amount], ["PayFast transaction", d.payfast_transaction_id], ["Supplier", d.supplier],
                           ["Hold status", d.hold_status], ["Travel date", d.travel_date], ["Reason", d.reason]] as const)
                          .filter(([, value]) => value).map(([label, value]) => (
                            <div key={label} className="flex min-w-0 gap-1"><dt className="shrink-0 text-muted-foreground">{label}:</dt><dd className="min-w-0 break-words text-foreground">{value}</dd></div>
                          ))}
                      </dl>
                    ) : null}
                    {d.note && <p className={`text-helper ${alert.urgent ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{alert.urgent ? "Booked and payment received. Confirm with supplier, issue the ticket, and share it with the customer." : d.note}</p>}
                  </li>
                );
              })}
            </ul>
          )}
      </section>

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
