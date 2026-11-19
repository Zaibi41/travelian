// Booking alerts from the gateway (holds, booking requests, restricted-airline requests, bank-transfer holds), newest
// first. "Seen" is per browser (localStorage); the alerts themselves live in the gateway's database.
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { gatewayGet } from "@/lib/gateway/client";
import type { components } from "@/lib/gateway/schema";

export type BookingAlert = components["schemas"]["NotificationView"];

const SEEN_KEY = "travelian.admin.alerts.seen";

function readSeen(): string {
  try {
    return localStorage.getItem(SEEN_KEY) || "";
  } catch {
    return "";
  }
}

export function useBookingAlerts() {
  const query = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: ({ signal }) => gatewayGet("/v1/admin/notifications", { limit: 50 }, { signal }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const [seen, setSeen] = useState(readSeen);
  useEffect(() => {
    const sync = () => setSeen(readSeen());
    window.addEventListener("travelian:alerts:seen", sync);
    return () => window.removeEventListener("travelian:alerts:seen", sync);
  }, []);
  const items = query.data?.items ?? [];
  const unseen = items.filter((item) => item.created_at > seen).length;
  const markSeen = () => {
    const newest = items[0]?.created_at;
    if (!newest) return;
    try {
      localStorage.setItem(SEEN_KEY, newest);
    } catch {
      // per-browser convenience only
    }
    window.dispatchEvent(new Event("travelian:alerts:seen"));
  };
  // Whether the gateway also emails these alerts (false until email is set up on the server: aws-setup.sh, SES).
  const emailEnabled = query.data ? query.data.email_enabled : undefined;
  return { items, unseen, markSeen, isLoading: query.isLoading, error: query.error, emailEnabled };
}
