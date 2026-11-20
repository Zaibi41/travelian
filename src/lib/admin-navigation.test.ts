import { describe, expect, it } from "vitest";
import type { UserRole } from "@/data/models";
import { INTERNAL_ROLES, adminPageTitle, sidebarPathFor, canAccessAdminPath, getInternalSidebarForRole, getNavigationForRole, isInternalRole } from "./admin-navigation";

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

  it("Finance ends with Accounts & Ledgers, for Super Admin only", () => {
    const finance = (role: UserRole) => getInternalSidebarForRole(role).find((menu) => menu.title === "Finance")?.items.map((item) => item.title) ?? [];
    expect(finance("super_admin")).toEqual(["Wallets", "Payments", "Reconciliation", "Accounts & Ledgers"]);
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

  it("hides Announcements until a real, gateway-stored feature exists", () => {
    for (const role of ALL_ROLES) {
      expect(canAccessAdminPath(role, "/admin/announcements")).toBe(false);
      const titles = getNavigationForRole(role).flatMap((section) => section.items.map((item) => item.title));
      expect(titles).not.toContain("Announcements");
    }
    const titles = getInternalSidebarForRole("super_admin").flatMap((menu) => menu.items.map((item) => item.title));
    expect(titles).not.toContain("Announcements");
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

describe("search flow highlights Search", () => {
  it("maps results and checkout pages to the Search menu", () => {
    expect(sidebarPathFor("/admin/flights-search")).toBe("/admin/search");
    expect(sidebarPathFor("/admin/booking/")).toBe("/admin/search");
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
    expect(adminPageTitle("super_admin", "/admin/hotels")).toBe("Hotels Inventory");
    expect(adminPageTitle("super_admin", "/admin/wallet")).toBe("Wallets");
    expect(adminPageTitle("super_admin", "/admin/roadmap/audit-log")).toBe("Audit Log");
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

describe("Finance: Wallets and Payments stay in the menu, marked Coming soon (#73)", () => {
  it("marks only Wallets and Payments", () => {
    const finance = getInternalSidebarForRole("super_admin").find(menu => menu.title === "Finance")!;
    expect(finance.items.map(item => [item.title, !!item.comingSoon])).toEqual([
      ["Wallets", true], ["Payments", true], ["Reconciliation", false], ["Accounts & Ledgers", false],
    ]);
  });
});
