import { useState } from "react";
import { mockNotifications, Notification } from "@/data/mock";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Building2, Wallet, CalendarCheck, Settings, CheckCheck } from "lucide-react";

const typeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  booking: { icon: CalendarCheck, color: "bg-info/10 text-info" },
  wallet: { icon: Wallet, color: "bg-success/10 text-success" },
  agency: { icon: Building2, color: "bg-warning/10 text-warning" },
  system: { icon: Settings, color: "bg-muted text-muted-foreground" },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(mockNotifications);

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Notifications</h1>
          <p className="text-sm text-muted-foreground">{unreadCount} unread notifications</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllRead} className="gap-2">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map(n => {
          const config = typeConfig[n.type];
          const Icon = config.icon;
          return (
            <Card key={n.id} className={`shadow-card transition-all ${!n.read ? 'border-l-2 border-l-primary' : 'opacity-70'}`}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
