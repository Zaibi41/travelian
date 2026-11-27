import { describe, expect, it } from "vitest";
import type { UserRole } from "@/data/models";
import { INTERNAL_ROLES, RENAMED_ADMIN_PATHS, adminPageTitle, sidebarPathFor, canAccessAdminPath, getInternalSidebarForRole, getNavigationForRole, hubTabsForRole, isInternalRole } from "./admin-navigation";

const SPEC_MENUS = [
  "Dashboard", "Bookings", "Customers & Travelers", "Finance", "B2B Partners", "Pricing", "Integrations", "Users", "Reports",
  "Website", "System",
];
const ALL_ROLES: UserRole[] = ["super_admin", "admin", "staff", "agency_owner", "agency_staff", "customer", "qa", "internal_support"];
const path = (url: string) => url.split("?")[0];

describe("internal sidebar: the 11 menus (menu cleanup 2026-11-27)", () => {
  it("shows Super Admin exactly the 11 menus, numbered, in order", () => {
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

  it("Finance: the D50 order, Accounts & Ledgers for Super Admin only", () => {
    const finance = (role: UserRole) => getInternalSidebarForRole(role).find((menu) => menu.title === "Finance")?.items.map((item) => item.title) ?? [];
    expect(finance("super_admin")).toEqual(["Supplier Balances", "Ticket Sale Entry", "Accounts & Ledgers", "Wallets", "Payments", "Reconciliation",
      "Supplier Refunds", "Customer Dues"]);
    for (const role of ALL_ROLES) {
      expect(canAccessAdminPath(role, "/admin/finance/accounts-ledgers"), role).toBe(role === "super_admin");
      if (role !== "super_admin") expect(finance(role)).not.toContain("Accounts & Ledgers");
    }
    expect(adminPageTitle("super_admin", "/admin/finance/accounts-ledgers")).toBe("Accounts & Ledgers");
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

  it("gives every old URL (old → new) exactly the access of its new page; no page lives under /roadmap/", () => {
    for (const role of ALL_ROLES) {
      for (const [oldUrl, newUrl] of Object.entries(RENAMED_ADMIN_PATHS)) {
        expect(canAccessAdminPath(role, oldUrl), `${role} ${oldUrl}`).toBe(canAccessAdminPath(role, path(newUrl)));
      }
    }
    expect(Object.values(RENAMED_ADMIN_PATHS).some((url) => url.includes("/roadmap/"))).toBe(false);
    expect(RENAMED_ADMIN_PATHS).toMatchObject({
      "/admin/group-ticketing": "/admin/integrations?tab=suppliers",
      "/admin/hotels": "/admin/integrations?tab=suppliers",
      "/admin/search": "/admin/bookings/new",
      "/admin/pricing/flights": "/admin/pricing?tab=rules",
      "/admin/coupons": "/admin/pricing?tab=promotions",
      "/admin/provider-systems": "/admin/integrations?tab=suppliers",
      "/admin/roadmap/payment-providers": "/admin/integrations?tab=payments",
      "/admin/rbac": "/admin/users?tab=roles",
      "/admin/blog": "/admin/website?tab=blog",
      "/admin/site-logo": "/admin/website?tab=branding",
      "/admin/settings": "/admin/system/settings",
      "/admin/announcements": "/admin/system/announcements",
      "/admin/audit-log": "/admin/system/logs?tab=audit",
      "/admin/roadmap/system-logs-jobs": "/admin/system/logs?tab=errors",
    });
  });

  it("System has Settings, Announcements and Logs; the other menus open one page", () => {
    const menus = Object.fromEntries(getInternalSidebarForRole("super_admin").map((menu) => [menu.title, menu.items.map((item) => item.url)]));
    expect(menus["System"]).toEqual(["/admin/system/settings", "/admin/system/announcements", "/admin/system/logs"]);
    for (const [title, url] of [["Bookings", "/admin/bookings"], ["Pricing", "/admin/pricing"], ["Integrations", "/admin/integrations"],
      ["Users", "/admin/users"], ["Website", "/admin/website"], ["B2B Partners", "/admin/agencies"]]) {
      expect(menus[title], title).toEqual([url]);
    }
  });

  it("tabbed pages show each role only its tabs, and open when one tab is allowed", () => {
    expect(hubTabsForRole("/admin/pricing", "super_admin").map((tab) => tab.id)).toEqual(["rules", "promotions"]);
    expect(hubTabsForRole("/admin/pricing", "admin").map((tab) => tab.id)).toEqual(["promotions"]);
    expect(hubTabsForRole("/admin/users", "admin").map((tab) => tab.id)).toEqual(["users"]);
    expect(hubTabsForRole("/admin/website", "admin").map((tab) => tab.id)).toEqual(["blog"]);
    expect(hubTabsForRole("/admin/system/logs", "super_admin").map((tab) => tab.id)).toEqual(["audit", "errors", "jobs"]);
    expect(canAccessAdminPath("admin", "/admin/pricing")).toBe(true);
    expect(canAccessAdminPath("staff", "/admin/pricing")).toBe(false);
    expect(canAccessAdminPath("admin", "/admin/integrations")).toBe(false);
    expect(canAccessAdminPath("super_admin", "/admin/integrations")).toBe(true);
    expect(canAccessAdminPath("customer", "/admin/system/logs")).toBe(false);
    // Agency owners keep Deals & Promotions and their agency users.
    expect(hubTabsForRole("/admin/pricing", "agency_owner").map((tab) => tab.id)).toEqual(["promotions"]);
    expect(canAccessAdminPath("agency_owner", "/admin/users")).toBe(true);
  });

  it("New Booking (the old Search) opens for everyone who had Search", () => {
    for (const role of ALL_ROLES) expect(canAccessAdminPath(role, "/admin/bookings/new"), role).toBe(true);
    expect(adminPageTitle("super_admin", "/admin/bookings/new")).toBe("New Booking");
  });
});

describe("search flow highlights New Booking", () => {
  it("maps results, holds and checkout pages to New Booking", () => {
    expect(sidebarPathFor("/admin/flights-search")).toBe("/admin/bookings/new");
    expect(sidebarPathFor("/admin/booking/")).toBe("/admin/bookings/new");
    expect(sidebarPathFor("/admin/search/group-ticketing/hold")).toBe("/admin/bookings/new");
    expect(sidebarPathFor("/admin/bookings")).toBe("/admin/bookings");
  });
});

describe("Bookings register (spec 7)", () => {
  it("opens /admin/bookings from the Bookings menu", () => {
    expect(getInternalSidebarForRole("super_admin").find((menu) => menu.title === "Bookings")?.items.map((item) => item.url)).toEqual(["/admin/bookings"]);
    expect(adminPageTitle("staff", "/admin/bookings/flights")).toBe("Bookings");
    expect(adminPageTitle("staff", "/admin/bookings/TRV-1/fare")).toBe("Bookings");
  });
  it("lets internal roles open sub-menus and booking pages, and nobody else", () => {
    for (const role of ALL_ROLES) {
      for (const url of ["/admin/bookings/flights", "/admin/bookings/quotations", "/admin/bookings/TRV-1", "/admin/bookings/TRV-1/audit"]) {
        expect(canAccessAdminPath(role, url), `${role} ${url}`).toBe(isInternalRole(role));
      }
    }
  });
  it("keeps the old URLs open for agency roles (they redirect to their existing screens)", () => {
    for (const url of ["/admin/bookings", "/admin/bookings/holds", "/admin/requests"]) {
      expect(canAccessAdminPath("agency_owner", url), url).toBe(true);
    }
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

describe("admin page titles", () => {
  it("uses the label the sidebar shows", () => {
    expect(adminPageTitle("super_admin", "/admin")).toBe("Dashboard");
    expect(adminPageTitle("super_admin", "/admin/customers")).toBe("Customers & Travelers");
    expect(adminPageTitle("super_admin", "/admin/agencies")).toBe("B2B Partners");
    expect(adminPageTitle("super_admin", "/admin/pricing")).toBe("Pricing");
    expect(adminPageTitle("super_admin", "/admin/system/settings")).toBe("Settings");
    expect(adminPageTitle("super_admin", "/admin/wallet")).toBe("Wallets");
    expect(adminPageTitle("super_admin", "/admin/system/logs")).toBe("Logs");
    expect(adminPageTitle("super_admin", "/admin/alerts")).toBe("Alerts");
    expect(adminPageTitle("agency_owner", "/admin")).toBe("Agency Overview");
    expect(adminPageTitle("super_admin", "/admin/unknown-page")).toBe("Admin");
  });
});

describe("flight hold pages", () => {
  it("are for back-office roles only (the gateway refuses holds for others) and keep Search highlighted", () => {
    for (const role of ["super_admin", "staff"] as const) expect(canAccessAdminPath(role, "/admin/search/flights/hold")).toBe(true);
    for (const role of ["agency_owner", "agency_staff", "customer"] as const) {
      expect(canAccessAdminPath(role, "/admin/search/flights/hold")).toBe(false);
      expect(canAccessAdminPath(role, "/admin/search/flights/hold/result")).toBe(false);
    }
    expect(adminPageTitle("super_admin", "/admin/search/flights/hold")).toBe("Hold flight");
  });
});

describe("Finance: Wallets (#68) and Payments (#69) are built, no Coming soon tag", () => {
  it("marks nothing", () => {
    const finance = getInternalSidebarForRole("super_admin").find(menu => menu.title === "Finance")!;
    expect(finance.items.map(item => [item.title, !!item.comingSoon])).toEqual([
      ["Supplier Balances", false], ["Ticket Sale Entry", false], ["Accounts & Ledgers", false], ["Wallets", false], ["Payments", false],
      ["Reconciliation", false], ["Supplier Refunds", false], ["Customer Dues", false],
    ]);
  });

  it("clicking Finance opens the overview, which has no submenu entry (D50)", () => {
    const finance = getInternalSidebarForRole("super_admin").find(menu => menu.title === "Finance")!;
    expect(finance.overview?.url).toBe("/admin/finance");
    expect(finance.items.map(item => item.url)).not.toContain("/admin/finance");
    expect(finance.items.map(item => item.title)).not.toContain("Dashboard");
    expect(adminPageTitle("super_admin", "/admin/finance")).toBe("Finance");
    expect(canAccessAdminPath("super_admin", "/admin/finance")).toBe(true);
    expect(canAccessAdminPath("agency_owner", "/admin/finance")).toBe(false);
    // The overview's access doesn't open the screens under it.
    expect(canAccessAdminPath("staff", "/admin/finance/reconciliation")).toBe(false);
    expect(canAccessAdminPath("staff", "/admin/finance/ticket-sales")).toBe(true);
  });
});
