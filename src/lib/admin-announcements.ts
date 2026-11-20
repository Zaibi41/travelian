export interface AdminAnnouncement {
  id: string;
  message: string;
  createdAt: string;
}

const STORAGE_KEY = "travelian.admin.announcements.v1";
export const ANNOUNCEMENTS_CHANGED = "travelian:announcements-changed";

export function listAdminAnnouncements(): AdminAnnouncement[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return []; // no demo messages (#73)
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
