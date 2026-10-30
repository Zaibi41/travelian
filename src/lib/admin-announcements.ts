export interface AdminAnnouncement {
  id: string;
  message: string;
  createdAt: string;
}

const STORAGE_KEY = "travelian.admin.announcements.v1";
export const ANNOUNCEMENTS_CHANGED = "travelian:announcements-changed";

const sampleAnnouncements: AdminAnnouncement[] = [
  { id: "sample-airblue", message: "Demo: Airblue ticket prices are PKR 200 lower on selected routes.", createdAt: "2026-01-03T00:00:00.000Z" },
  { id: "sample-groups", message: "Demo: New group ticketing seats are available for Lahore to Jeddah.", createdAt: "2026-01-02T00:00:00.000Z" },
  { id: "sample-umrah", message: "Demo: Explore the latest Umrah packages in Travelian.", createdAt: "2026-01-01T00:00:00.000Z" },
];

export function listAdminAnnouncements(): AdminAnnouncement[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return sampleAnnouncements;
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is AdminAnnouncement =>
      typeof item === "object" && item !== null &&
      typeof item.id === "string" && typeof item.message === "string" &&
      typeof item.createdAt === "string",
    ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export function saveAdminAnnouncements(items: AdminAnnouncement[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(ANNOUNCEMENTS_CHANGED));
}
