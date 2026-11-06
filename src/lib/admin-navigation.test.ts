import { describe, expect, it } from "vitest";
import type { UserRole } from "@/data/models";
import { INTERNAL_ROLES, canAccessAdminPath, getInternalSidebarForRole, getNavigationForRole, isInternalRole } from "./admin-navigation";

const SPEC_MENUS = [
  "Dashboard", "Search", "Bookings", "Customers & Travelers", "Finance", "Flight Operations", "Inventory & Services",
  "Pricing & Revenue", "B2B Partners", "Suppliers & Integrations", "Users & Access", "Reports", "Website & CMS", "System",
];
const ALL_ROLES: UserRole[] = ["super_admin", "admin", "staff", "agency_owner", "agency_staff", "customer", "qa", "internal_support"];
const path = (url: string) => url.split("?")[0];

describe("internal sidebar: 14 spec menus", () => {
  it("shows Super Admin exactly the 14 menus, numbered, in spec order", () => {
    const menus = getInternalSidebarForRole("super_admin");
    expect(menus.map((menu) => menu.title)).toEqual(SPEC_MENUS);
    expect(menus.map((menu) => menu.number)).toEqual(SPEC_MENUS.map((_, index) => String(index + 1).padStart(2, "0")));
  });

  it("never links an internal role to a page it can't open", () => {
    for (const role of INTERNAL_ROLES) {
      for (const menu of getInternalSidebarForRole(role)) {
        for (const item of menu.items) {
          expect(canAccessAdminPath(role, path(item.url)), `${role} → ${menu.title} → ${item.title}`).toBe(true);
        }
      }
    }
  });

  it("keeps menus in spec order for every internal role and hides menus with nothing allowed", () => {
    for (const role of INTERNAL_ROLES) {
      const titles = getInternalSidebarForRole(role).map((menu) => menu.title);
      expect(titles).toEqual(SPEC_MENUS.filter((title) => titles.includes(title)));
      expect(titles[0]).toBe("Dashboard");
    }
  });

  it("leaves Notifications and View Public Site out of the sidebar, but reachable", () => {
    const urls = getInternalSidebarForRole("super_admin").flatMap((menu) => menu.items.map((item) => item.url));
    expect(urls).not.toContain("/admin/notifications");
    expect(urls).not.toContain("/");
    expect(canAccessAdminPath("super_admin", "/admin/notifications")).toBe(true);
  });

  it("has retired Secret Manager and Document Center completely", () => {
    for (const role of ALL_ROLES) {
      expect(canAccessAdminPath(role, "/admin/secrets")).toBe(false);
      expect(canAccessAdminPath(role, "/admin/documents")).toBe(false);
    }
    const titles = getInternalSidebarForRole("super_admin").flatMap((menu) => menu.items.map((item) => item.title));
    expect(titles).not.toContain("Secret Manager");
    expect(titles).not.toContain("Document Center");
  });

  it("lets internal roles open the Dashboard placeholders (Attention Queue, Alerts), and nobody else", () => {
    for (const role of ALL_ROLES) {
      expect(canAccessAdminPath(role, "/admin/alerts")).toBe(isInternalRole(role));
      expect(canAccessAdminPath(role, "/admin/attention-queue")).toBe(isInternalRole(role));
    }
  });

  it("gives renamed placeholder URLs (old → new) exactly the same access", () => {
    const renamed = [
      ["/admin/roadmap/audit-logs", "/admin/roadmap/audit-log"],
      ["/admin/roadmap/webhook-logs", "/admin/roadmap/system-logs-jobs"],
      ["/admin/roadmap/payment-gateways", "/admin/roadmap/payment-providers"],
    ];
    for (const role of ALL_ROLES) {
      for (const [oldUrl, newUrl] of renamed) {
        expect(canAccessAdminPath(role, oldUrl)).toBe(canAccessAdminPath(role, newUrl));
      }
    }
    expect(canAccessAdminPath("super_admin", "/admin/roadmap/system-logs-jobs")).toBe(true);
  });

  it("puts Flight Operations and Blog / News where approved", () => {
    const menus = Object.fromEntries(getInternalSidebarForRole("super_admin").map((menu) => [menu.title, menu.items.map((item) => item.title)]));
    expect(menus["Flight Operations"]).toEqual(["Flight Operations"]);
    expect(menus["Website & CMS"]).toContain("Blog / News");
    expect(menus["System"]).toEqual(["General Settings", "System Logs & Jobs"]);
    expect(menus["Suppliers & Integrations"]).toEqual(["Suppliers / API Providers", "Payment Providers"]);
    expect(menus["Users & Access"]).toEqual(["Users & Staff", "Roles & Permissions", "Audit Log"]);
  });
});

describe("agency and customer sidebars are unchanged", () => {
  it("does not treat them as internal roles", () => {
    expect(ALL_ROLES.filter(isInternalRole)).toEqual(["super_admin", "admin", "staff", "qa", "internal_support"]);
  });

  it("keeps their existing sections", () => {
    expect(getNavigationForRole("agency_owner").map((section) => section.category)).toEqual([
      "Dashboard", "Search", "Requests", "Customers", "Agency Finance", "Staff Management", "Deals & Offers", "Reports", "Account",
    ]);
    expect(getNavigationForRole("customer").map((section) => section.category)).toEqual([
      "Dashboard", "Search", "Requests", "My Trips", "Wallet & Payments", "Support", "My Account",
    ]);
  });
});
