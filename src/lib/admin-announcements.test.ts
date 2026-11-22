import { describe, expect, it } from "vitest";
import { ANNOUNCEMENT_REFRESH_MS, localInputToIso } from "./admin-announcements";
import { canAccessAdminPath, getInternalSidebarForRole } from "./admin-navigation";

describe("admin announcements (#92)", () => {
  it("turns the datetime-local value into an ISO time with the zone, empty into null", () => {
    expect(localInputToIso("")).toBeNull();
    expect(localInputToIso("not a date")).toBeNull();
    expect(localInputToIso("2026-11-22T14:30")).toBe(new Date("2026-11-22T14:30").toISOString());
  });

  it("checks often enough that a new message shows within a minute", () => {
    expect(ANNOUNCEMENT_REFRESH_MS).toBeLessThanOrEqual(60_000);
  });

  it("the Announcements menu item and page are for Super Admin only", () => {
    const titles = (role: Parameters<typeof getInternalSidebarForRole>[0]) =>
      getInternalSidebarForRole(role).flatMap(menu => menu.items.map(item => item.title));
    expect(titles("super_admin")).toContain("Announcements");
    expect(titles("staff")).not.toContain("Announcements");
    expect(canAccessAdminPath("super_admin", "/admin/announcements")).toBe(true);
    expect(canAccessAdminPath("staff", "/admin/announcements")).toBe(false);
    expect(canAccessAdminPath("agency_owner", "/admin/announcements")).toBe(false);
  });
});
