import { beforeEach, describe, expect, it } from "vitest";
import { listAdminAnnouncements, saveAdminAnnouncements } from "./admin-announcements";

describe("admin announcements (#73)", () => {
  beforeEach(() => localStorage.clear());

  it("has no demo messages when none were saved", () => {
    expect(listAdminAnnouncements()).toEqual([]);
  });

  it("lists saved announcements, newest first", () => {
    saveAdminAnnouncements([
      { id: "a", message: "Older", createdAt: "2026-11-01T00:00:00.000Z" },
      { id: "b", message: "Newer", createdAt: "2026-11-02T00:00:00.000Z" },
    ]);
    expect(listAdminAnnouncements().map(item => item.message)).toEqual(["Newer", "Older"]);
  });
});
