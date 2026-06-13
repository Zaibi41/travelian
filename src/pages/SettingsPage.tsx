import { useEffect, useState } from "react";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { NotificationSettings } from "@/data/models";
import { getNotificationSettings, saveNotificationSettings } from "@/lib/notification-api";

const emptySettings: NotificationSettings = {
  adminNotificationEmail: "",
  adminNotificationPhone: "",
  emailNotificationsEnabled: false,
  smsNotificationsEnabled: false,
  whatsappNotificationsEnabled: false,
  journeyReminderEnabled: false,
  journeyReminderHoursBefore: 24,
  journeyReminderTemplate: "",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getNotificationSettings()
      .then(setSettings)
      .catch(error => {
        console.error(error);
        toast.error("Notification settings could not be loaded");
      })
      .finally(() => setLoading(false));
  }, []);

  const setField = <K extends keyof NotificationSettings>(field: K, value: NotificationSettings[K]) => {
    setSettings(current => ({ ...current, [field]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      setSettings(await saveNotificationSettings(settings));
      toast.success("Notification settings saved");
    } catch (error) {
      console.error(error);
      toast.error("Notification settings could not be saved");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display">General Settings</h1>
        <p className="text-sm text-muted-foreground">Configure booking request alerts and passenger journey reminders.</p>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base font-display">Travelian notification recipients</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Admin notification email</Label><Input type="email" value={settings.adminNotificationEmail} onChange={event => setField("adminNotificationEmail", event.target.value)} placeholder="Configured Travelian operations email" /></div>
          <div className="space-y-2"><Label>Admin notification phone</Label><Input value={settings.adminNotificationPhone} onChange={event => setField("adminNotificationPhone", event.target.value)} placeholder="+92..." /></div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base font-display">Delivery channels</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Toggle label="Email notifications" description="Send booking request and journey reminder email when a recipient address is available." checked={settings.emailNotificationsEnabled} onCheckedChange={value => setField("emailNotificationsEnabled", value)} />
          <Toggle label="SMS notifications" description="Send configured Twilio SMS notifications when a phone number is available." checked={settings.smsNotificationsEnabled} onCheckedChange={value => setField("smsNotificationsEnabled", value)} />
          <Toggle label="WhatsApp notifications" description="Send configured Twilio WhatsApp notifications when a phone number is available." checked={settings.whatsappNotificationsEnabled} onCheckedChange={value => setField("whatsappNotificationsEnabled", value)} />
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base font-display">Safe journey reminders</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Toggle label="Enable reminders" description="Send each passenger one safe journey message for a flight scheduled tomorrow." checked={settings.journeyReminderEnabled} onCheckedChange={value => setField("journeyReminderEnabled", value)} />
          <div className="space-y-2"><Label>Reminder lead time (hours)</Label><Input inputMode="numeric" value={settings.journeyReminderHoursBefore} onChange={event => setField("journeyReminderHoursBefore", Number(event.target.value) || 24)} /></div>
          <div className="space-y-2"><Label>Message template</Label><Textarea rows={5} value={settings.journeyReminderTemplate} onChange={event => setField("journeyReminderTemplate", event.target.value)} /><p className="text-xs text-muted-foreground">Supported placeholders: [Passenger Name], [Flight No.], [Origin], [Destination], [Date/Time]</p></div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5 shadow-card">
        <CardContent className="flex gap-3 p-4 text-sm text-muted-foreground">
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
          <p>Provider credentials are not stored in this page. Email is delivered through AWS SES using the Lambda sender configuration. Twilio values belong in AWS Secrets Manager under the Lambda notification provider secret.</p>
        </CardContent>
      </Card>

      <Button onClick={() => void save()} disabled={saving} className="gradient-primary text-primary-foreground">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Settings</Button>
    </div>
  );
}

function Toggle({ label, description, checked, onCheckedChange }: { label: string; description: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return <div className="flex items-center justify-between gap-4 border-b pb-4 last:border-0 last:pb-0"><div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{description}</p></div><Switch checked={checked} onCheckedChange={onCheckedChange} /></div>;
}
