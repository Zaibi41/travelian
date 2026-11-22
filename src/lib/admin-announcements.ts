// Admin announcements (#92): posted by Super Admin, stored in the gateway, shown in every staff member's top bar.
// The gateway decides who may read (back office) and who may change them (Super Admin); this file only fetches.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { gatewayDelete, gatewayGet, gatewayPost } from "@/lib/gateway/client";
import type { components } from "@/lib/gateway/schema";

export type LiveAnnouncement = components["schemas"]["AnnouncementView"];
export type ManagedAnnouncement = components["schemas"]["ManagedAnnouncement"];
export type NewAnnouncement = components["schemas"]["CreateAnnouncementRequest"];

/** Same limit the gateway enforces; the gateway is the one that refuses. */
export const ANNOUNCEMENT_MAX_LENGTH = 240;
/** How often the top bar checks for new announcements: a message posted on one device shows for all staff within a minute. */
export const ANNOUNCEMENT_REFRESH_MS = 30_000;

const LIVE_KEY = ["admin-announcements", "live"] as const;
const ALL_KEY = ["admin-announcements", "all"] as const;

/** The announcements the top bar shows. `enabled` is false for agency and customer roles (the gateway refuses them). */
export function useLiveAnnouncements(enabled: boolean) {
  const query = useQuery({
    queryKey: LIVE_KEY,
    queryFn: ({ signal }) => gatewayGet("/v1/admin/announcements", undefined, { signal }),
    enabled,
    refetchInterval: ANNOUNCEMENT_REFRESH_MS,
    staleTime: ANNOUNCEMENT_REFRESH_MS / 2,
    retry: false,
  });
  return query.data?.items ?? [];
}

export function useAllAnnouncements() {
  return useQuery({
    queryKey: ALL_KEY,
    queryFn: ({ signal }) => gatewayGet("/v1/admin/announcements/all", undefined, {
      signal, unavailableMessage: "Announcements can't be loaded right now. Try again in a minute.",
    }),
    retry: 1,
  });
}

/** A datetime-local value ("2026-11-22T14:30", the browser's time zone) as an ISO time with the zone, or null. */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function useAnnouncementActions() {
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
  const unavailableMessage = "The announcement couldn't be saved right now. Nothing was changed.";
  const create = useMutation({
    mutationFn: (body: NewAnnouncement) => gatewayPost("/v1/admin/announcements", body, { unavailableMessage }),
    onSuccess: refresh,
  });
  const end = useMutation({
    mutationFn: (id: string) => gatewayPost("/v1/admin/announcements/{announcement_id}/end", undefined as never,
      { pathParams: { announcement_id: id }, unavailableMessage }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => gatewayDelete("/v1/admin/announcements/{announcement_id}", { pathParams: { announcement_id: id }, unavailableMessage }),
    onSuccess: refresh,
  });
  return { create, end, remove };
}
