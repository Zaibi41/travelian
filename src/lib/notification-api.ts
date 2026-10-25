import type { NotificationDeliveryLog, NotificationSettings } from "@/data/models";

import { API_BASE_URL } from "./api-config";

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const response = await fetch(`${API_BASE_URL}/content/notification-settings`);
  if (!response.ok) throw new Error("Unable to load notification settings");
  const payload = await response.json();
  return payload.item;
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<NotificationSettings> {
  const response = await fetch(`${API_BASE_URL}/content/notification-settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!response.ok) throw new Error("Unable to save notification settings");
  const payload = await response.json();
  return payload.item;
}

export async function listNotificationLogs(): Promise<NotificationDeliveryLog[]> {
  const response = await fetch(`${API_BASE_URL}/content/notification-logs`);
  if (!response.ok) throw new Error("Unable to load notification logs");
  const payload = await response.json();
  return Array.isArray(payload.items) ? payload.items : [];
}
