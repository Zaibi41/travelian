import { useState } from "react";
import { Megaphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listAdminAnnouncements, saveAdminAnnouncements } from "@/lib/admin-announcements";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState(listAdminAnnouncements);
  const [message, setMessage] = useState("");

  const publish = () => {
    const text = message.trim();
    if (!text) return;
    try {
      const next = [{ id: crypto.randomUUID(), message: text, createdAt: new Date().toISOString() }, ...announcements];
      saveAdminAnnouncements(next);
      setAnnouncements(next);
      setMessage("");
      toast.success("Announcement saved on this device");
    } catch {
      toast.error("Announcement could not be saved on this device");
    }
  };

  const remove = (id: string) => {
    try {
      const next = announcements.filter(item => item.id !== id);
      saveAdminAnnouncements(next);
      setAnnouncements(next);
      toast.success("Announcement removed");
    } catch {
      toast.error("Announcement could not be removed");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold font-display"><Megaphone aria-hidden="true" className="h-6 w-6 text-primary" /> Announcements</h1>
        <p className="mt-1 text-sm text-muted-foreground">Announcements scroll across the admin header in order. They are currently saved on this device only.</p>
      </div>
      <Card><CardContent className="space-y-3 p-5">
        <Label htmlFor="announcement-message">Announcement text</Label>
        <Textarea id="announcement-message" value={message} maxLength={240} rows={3} onChange={event => setMessage(event.target.value)} placeholder="Airblue tickets are PKR 200 less today" />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{message.length}/240 characters</span>
          <Button onClick={publish} disabled={!message.trim()}>Publish on this device</Button>
        </div>
      </CardContent></Card>
      <section aria-labelledby="announcements-list" className="space-y-3">
        <h2 id="announcements-list" className="font-semibold">Saved announcements</h2>
        {announcements.length === 0 && <p className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">No announcements yet.</p>}
        {announcements.map((item, index) => <Card key={item.id}><CardContent className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="break-words text-sm font-medium">{item.message}</p>
            <p className="mt-1 text-xs text-muted-foreground">{index === 0 ? "First in header · " : "In header · "}{new Date(item.createdAt).toLocaleString()}</p>
          </div>
          <Button variant="ghost" size="icon" aria-label={`Remove announcement: ${item.message}`} onClick={() => remove(item.id)} className="shrink-0 text-destructive"><Trash2 aria-hidden="true" className="h-4 w-4" /></Button>
        </CardContent></Card>)}
      </section>
    </div>
  );
}
