import type { ComponentType } from "react";
import {
  BadgePercent,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  CloudCog,
  CreditCard,
  FileText,
  Gift,
  Globe,
  Heart,
  Hourglass,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Package,
  PenTool,
  Plane,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Tag,
  Ticket,
  UserCircle,
  Undo2,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import type { UserRole } from "@/data/models";
import { RENAMED_ADMIN_PATHS } from "@/lib/admin-redirects";

export type AdminNavCategory =
  | "Dashboard"
  | "Search"
  | "Flight Bookings"
  | "Requests"
  | "My Trips"
  | "Inventory & Services"
  | "Pricing & Revenue"
  | "Financial"
  | "Agency Finance"
  | "Finance"
  | "Wallet & Payments"
  | "Operations"
  | "Payment Follow-up"
  | "Customers"
  | "Staff Management"
  | "Deals & Offers"
  | "Management"
  | "Reports"
  | "Website & CMS"
  | "Account"
  | "My Account"
  | "Support"
  | "System";

export interface AdminNavItem {
  title: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
  roles: UserRole[];
  /** Kept in the menu so staff know it's coming; the page says it isn't built yet (#73). */
  comingSoon?: boolean;
}

export interface AdminNavSection {
  category: AdminNavCategory;
  items: AdminNavItem[];
}

const allSearchRoles: UserRole[] = ["super_admin", "admin", "staff", "agency_owner", "agency_staff", "customer", "qa", "internal_support"];
const platformOwnerRoles: UserRole[] = ["super_admin", "qa", "internal_support"];
const internalAdminRoles: UserRole[] = ["super_admin", "admin", "qa", "internal_support"];
const internalOpsRoles: UserRole[] = ["super_admin", "admin", "staff", "qa", "internal_support"];
const agencyRoles: UserRole[] = ["agency_owner", "agency_staff"];
const agencyOwnerRoles: UserRole[] = ["agency_owner"];
const agencyStaffRoles: UserRole[] = ["agency_staff"];
const customerRoles: UserRole[] = ["customer"];
/** Finance > Accounts & Ledgers: the gateway's FINANCE_ACCOUNT_ROLES (Super Admin; Finance once that role exists). */
const financeAccountRoles: UserRole[] = ["super_admin"];
/** Finance overview, Supplier Balances, Supplier Refunds, Customer Dues: the gateway allows Super Admin and staff granted
 *  "finance" (and refuses everyone else; the page then says which permission is needed). */
const financeRoles: UserRole[] = ["super_admin", "admin", "staff"];
/** Ticket Sale Entry: any back-office user; non-Finance staff get the "submit for Finance to confirm" form (D55). */
const ticketSaleRoles: UserRole[] = ["super_admin", "admin", "staff"];

/** Pages that show a "Not built yet" notice until the gateway serves them (#73). Wallets (#68) and Payments (#69) are built. */
const COMING_SOON = new Set<string>();

function item(title: string, url: string, icon: AdminNavItem["icon"], roles: UserRole[]): AdminNavItem {
  return COMING_SOON.has(url) ? { title, url, icon, roles, comingSoon: true } : { title, url, icon, roles };
}

export const adminNavigation: AdminNavSection[] = [
  {
    category: "Dashboard",
    items: [
      item("Dashboard", "/admin", LayoutDashboard, ["super_admin", "admin", "staff", "qa", "internal_support"]),
      item("Agency Overview", "/admin", LayoutDashboard, agencyOwnerRoles),
      item("My Overview", "/admin", LayoutDashboard, ["agency_staff", "customer"]),
    ],
  },
  {
    category: "Search",
    items: [
      item("Search", "/admin/bookings/new", Search, allSearchRoles),
    ],
  },
  {
    category: "Flight Bookings",
    items: [
      item("Flight Operations", "/admin/flight-bookings", CalendarCheck, allSearchRoles),
    ],
  },
  {
    category: "Requests",
    items: [
      item("Bookings", "/admin/requests", ClipboardCheck, allSearchRoles),
    ],
  },
  {
    category: "Customers",
    items: [
      item("Customers", "/admin/customers", Users, [...internalAdminRoles, "staff"]),
      item("My Customers", "/admin/customers", Users, agencyOwnerRoles),
      item("Passenger Profiles", "/admin/customers", UserCircle, agencyStaffRoles),
    ],
  },
  {
    category: "My Trips",
    items: [
      item("My Bookings", "/admin/customer/bookings", CalendarCheck, customerRoles),
      item("Invoices", "/admin/customer/bookings", Receipt, customerRoles),
      item("Refunds", "/admin/customer/bookings", RefreshCw, customerRoles),
    ],
  },
  {
    category: "Inventory & Services",
    items: [
      // Not in the internal sidebar (the Inventory & Services menu is removed); the page stays reachable by URL.
      item("Umrah Packages", "/admin/packages", Package, internalAdminRoles),
    ],
  },
  {
    category: "Pricing & Revenue",
    items: [
      item("Pricing Rules", "/admin/pricing?tab=rules", Plane, platformOwnerRoles),
      item("Promotions", "/admin/pricing?tab=promotions", Tag, internalAdminRoles),
    ],
  },
  {
    category: "Financial",
    items: [
      item("Wallets", "/admin/wallet", Wallet, internalAdminRoles),
      item("Payments", "/admin/payments", CreditCard, internalAdminRoles),
      item("Transactions Ledger", "/admin/wallet", Receipt, internalAdminRoles),
      item("Refunds", "/admin/flight-bookings?tab=refund", RefreshCw, internalAdminRoles),
      item("Accounts & Ledgers", "/admin/finance/accounts-ledgers", BookOpen, financeAccountRoles),
      item("Supplier Balances", "/admin/finance/supplier-balances", Landmark, financeRoles),
      item("Ticket Sale Entry", "/admin/finance/ticket-sales", Ticket, ticketSaleRoles),
      item("Supplier Refunds", "/admin/finance/supplier-refunds", Undo2, financeRoles),
      item("Customer Dues", "/admin/finance/customer-dues", Hourglass, financeRoles),
    ],
  },
  {
    category: "Agency Finance",
    items: [
      item("Wallet", "/admin/wallet", Wallet, agencyOwnerRoles),
      item("Payments", "/admin/payments", CreditCard, agencyOwnerRoles),
      item("Transactions", "/admin/wallet", Receipt, agencyOwnerRoles),
      item("Invoices", "/admin/flight-bookings?tab=issued", Receipt, agencyOwnerRoles),
      item("Refunds", "/admin/flight-bookings?tab=refund", RefreshCw, agencyOwnerRoles),
    ],
  },
  {
    category: "Finance",
    items: [
      item("Wallet", "/admin/wallet", Wallet, agencyStaffRoles),
      item("Transactions", "/admin/wallet", Receipt, agencyStaffRoles),
      item("Invoices", "/admin/flight-bookings?tab=issued", Receipt, agencyStaffRoles),
    ],
  },
  {
    category: "Wallet & Payments",
    items: [
      item("Wallet", "/admin/customer/wallet", Wallet, customerRoles),
      item("Payments", "/admin/customer/payments", CreditCard, customerRoles),
      item("Transactions", "/admin/customer/wallet", Receipt, customerRoles),
    ],
  },
  {
    category: "Operations",
    items: [
      item("Notifications", "/admin/notifications", Bell, internalOpsRoles),
    ],
  },
  {
    category: "Payment Follow-up",
    items: [
      item("Payment Links", "/admin/payments", CreditCard, ["staff"]),
    ],
  },
  {
    category: "Staff Management",
    items: [
      item("Agency Staff", "/admin/users?tab=users", Users, agencyOwnerRoles),
      item("Staff Permissions", "/admin/users?tab=users", Shield, agencyOwnerRoles),
    ],
  },
  {
    category: "Deals & Offers",
    items: [
      item("Deals & Promotions", "/admin/pricing?tab=promotions", Tag, agencyOwnerRoles),
    ],
  },
  {
    category: "Management",
    items: [
      item("Agencies", "/admin/agencies", Building2, internalAdminRoles),
      item("Users", "/admin/users?tab=users", UserCog, internalAdminRoles),
      item("Suppliers", "/admin/integrations?tab=suppliers", CloudCog, platformOwnerRoles),
    ],
  },
  {
    category: "Reports",
    items: [
      item("Reports", "/admin/reports", BarChart3, [...internalAdminRoles, ...agencyOwnerRoles, "staff"]),
    ],
  },
  {
    category: "Website & CMS",
    items: [
      item("Blog", "/admin/website?tab=blog", PenTool, internalAdminRoles),
      item("Pages", "/admin/website?tab=pages", FileText, ["super_admin"]),
      item("Branding", "/admin/website?tab=branding", Megaphone, ["super_admin"]),
    ],
  },
  {
    category: "Support",
    items: [
      item("Help Center", "/admin/customer/support", LifeBuoy, customerRoles),
    ],
  },
  {
    category: "Account",
    items: [
      item("Profile", "/admin/customer/profile", UserCircle, ["admin", "staff"]),
      item("Agency Profile", "/admin/system/settings", Building2, agencyOwnerRoles),
      item("My Profile", "/admin/users?tab=users", UserCircle, agencyStaffRoles),
      item("Change Password", "/admin/system/settings", KeyRound, ["admin", "staff", ...agencyRoles]),
    ],
  },
  {
    category: "My Account",
    items: [
      item("Profile", "/admin/customer/profile", UserCircle, customerRoles),
      item("Passengers", "/admin/customer/profile", Users, customerRoles),
      item("Documents", "/admin/customer/profile", FileText, customerRoles),
      item("Wishlist", "/admin/customer/wishlist", Heart, customerRoles),
      item("Rewards", "/admin/customer/rewards", Gift, customerRoles),
      item("Change Password", "/admin/system/settings", KeyRound, customerRoles),
    ],
  },
  {
    category: "System",
    items: [
      item("Roles", "/admin/users?tab=roles", Shield, platformOwnerRoles),
      item("Settings", "/admin/system/settings", Settings, internalAdminRoles),
      item("Announcements", "/admin/system/announcements", Megaphone, ["super_admin"]),
      item("Logs", "/admin/system/logs", FileText, platformOwnerRoles),
      item("Reconciliation", "/admin/finance/reconciliation", Receipt, platformOwnerRoles),
      item("Payments", "/admin/integrations?tab=payments", CreditCard, platformOwnerRoles),
      item("View Public Site", "/", Globe, []),
    ],
  },
];

export function getNavigationForRole(role: UserRole): AdminNavSection[] {
  return adminNavigation
    .filter((section) => section.category !== "Flight Bookings")
    .map((section) => ({
      ...section,
      items: section.items.filter((navItem) => navItem.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);
}

// ---------------------------------------------------------------------------
// Tabbed menu pages (the open tab is `?tab=` in the URL). Each tab has its own
// roles; a role sees only its tabs, and the page opens for it when at least one
// tab is allowed. Bookings' tabs are both back office (its route handles roles).
// ---------------------------------------------------------------------------

export interface AdminHubTab {
  id: string;
  label: string;
  roles: UserRole[];
}

export const ADMIN_HUB_TABS: Record<string, AdminHubTab[]> = {
  "/admin/bookings": [
    { id: "bookings", label: "Bookings", roles: ["super_admin", "admin", "staff", "qa", "internal_support"] },
    { id: "operations", label: "Operations", roles: ["super_admin", "admin", "staff", "qa", "internal_support"] },
  ],
  "/admin/pricing": [
    { id: "rules", label: "Rules", roles: platformOwnerRoles },
    { id: "promotions", label: "Promotions", roles: [...internalAdminRoles, ...agencyOwnerRoles] },
  ],
  "/admin/integrations": [
    { id: "suppliers", label: "Suppliers", roles: platformOwnerRoles },
    { id: "payments", label: "Payments", roles: platformOwnerRoles },
  ],
  "/admin/users": [
    { id: "users", label: "Users", roles: [...internalAdminRoles, ...agencyRoles] },
    { id: "roles", label: "Roles", roles: platformOwnerRoles },
  ],
  "/admin/website": [
    { id: "blog", label: "Blog", roles: internalAdminRoles },
    { id: "pages", label: "Pages", roles: ["super_admin"] },
    { id: "branding", label: "Branding", roles: ["super_admin"] },
  ],
  "/admin/system/logs": [
    { id: "audit", label: "Audit", roles: platformOwnerRoles },
    { id: "errors", label: "Errors", roles: platformOwnerRoles },
    { id: "jobs", label: "Jobs", roles: platformOwnerRoles },
  ],
};

/** The tabs of a tabbed menu page that this role may open, in order. */
export function hubTabsForRole(basePath: string, role: UserRole): AdminHubTab[] {
  return (ADMIN_HUB_TABS[basePath] ?? []).filter(tab => tab.roles.includes(role));
}

/** Everyone who can open at least one tab of the page. */
function hubRoles(basePath: string): UserRole[] {
  return [...new Set((ADMIN_HUB_TABS[basePath] ?? []).flatMap(tab => tab.roles))];
}

// ---------------------------------------------------------------------------
// Internal-role sidebar: exactly the 11 menus, in order (menu cleanup,
// 2026-11-27; replaced the 14 spec menus of 2026-11-06). Display only: page access still comes from `adminNavigation`
// via canAccessAdminPath, so every existing link keeps its current access.
// Agency owner, agency staff and customer sidebars are unchanged.
// Not in this sidebar: Notifications and View Public Site (both in the user menu).
// Secret Manager and Document Center were retired (2026-11-06).
// ---------------------------------------------------------------------------

export const INTERNAL_ROLES: UserRole[] = ["super_admin", "admin", "staff", "qa", "internal_support"];

export function isInternalRole(role: UserRole) {
  return INTERNAL_ROLES.includes(role);
}

export interface SidebarMenuEntry {
  number: string;
  title: string;
  icon: AdminNavItem["icon"];
  /** One item: the menu opens it directly. Several: the menu expands. */
  items: AdminNavItem[];
  /** Clicking the menu itself opens this page (and expands the submenu); it has no submenu entry of its own (D50). */
  overview?: AdminNavItem;
}

const internalSidebarMenus: SidebarMenuEntry[] = [
  { number: "01", title: "Dashboard", icon: LayoutDashboard, items: [item("Dashboard", "/admin", LayoutDashboard, INTERNAL_ROLES)] },
  // Bookings has the Bookings and Operations tabs and a New Booking button (/admin/bookings/new, the old Search).
  { number: "02", title: "Bookings", icon: ClipboardCheck, items: [item("Bookings", "/admin/bookings", ClipboardCheck, INTERNAL_ROLES)] },
  { number: "03", title: "Customers & Travelers", icon: Users, items: [item("Customers", "/admin/customers", Users, [...internalAdminRoles, "staff"])] },
  {
    // D50: "Finance" opens the overview; the submenu has no Dashboard entry.
    number: "04", title: "Finance", icon: Wallet, overview: item("Finance", "/admin/finance", Wallet, financeRoles), items: [
      item("Supplier Balances", "/admin/finance/supplier-balances", Landmark, financeRoles),
      item("Ticket Sale Entry", "/admin/finance/ticket-sales", Ticket, ticketSaleRoles),
      item("Accounts & Ledgers", "/admin/finance/accounts-ledgers", BookOpen, financeAccountRoles),
      item("Wallets", "/admin/wallet", Wallet, internalAdminRoles),
      item("Payments", "/admin/payments", CreditCard, [...internalAdminRoles, "staff"]),
      item("Reconciliation", "/admin/finance/reconciliation", Receipt, platformOwnerRoles),
      item("Supplier Refunds", "/admin/finance/supplier-refunds", Undo2, financeRoles),
      item("Customer Dues", "/admin/finance/customer-dues", Hourglass, financeRoles),
    ],
  },
  { number: "05", title: "B2B Partners", icon: Building2, items: [item("Agencies", "/admin/agencies", Building2, internalAdminRoles)] },
  { number: "06", title: "Pricing", icon: Tag, items: [item("Pricing", "/admin/pricing", Tag, hubRoles("/admin/pricing"))] },
  { number: "07", title: "Integrations", icon: CloudCog, items: [item("Integrations", "/admin/integrations", CloudCog, hubRoles("/admin/integrations"))] },
  { number: "08", title: "Users", icon: UserCog, items: [item("Users", "/admin/users", UserCog, internalAdminRoles)] },
  { number: "09", title: "Reports", icon: BarChart3, items: [item("Reports", "/admin/reports", BarChart3, [...internalAdminRoles, "staff"])] },
  { number: "10", title: "Website", icon: Megaphone, items: [item("Website", "/admin/website", Megaphone, hubRoles("/admin/website"))] },
  {
    number: "11", title: "System", icon: Settings, items: [
      item("Settings", "/admin/system/settings", Settings, internalAdminRoles),
      item("Announcements", "/admin/system/announcements", Megaphone, ["super_admin"]),
      item("Logs", "/admin/system/logs", FileText, hubRoles("/admin/system/logs")),
    ],
  },
];

/** The 11 menus for an internal role, keeping only items that role may open. */
export function getInternalSidebarForRole(role: UserRole): SidebarMenuEntry[] {
  return internalSidebarMenus
    .map((menu) => ({
      ...menu,
      items: menu.items.filter((navItem) => navItem.roles.includes(role)),
      overview: menu.overview && menu.overview.roles.includes(role) ? menu.overview : undefined,
    }))
    .filter((menu) => menu.items.length > 0);
}

export { RENAMED_ADMIN_PATHS };

export function canAccessAdminPath(role: UserRole, pathname: string) {
  const trimmed = pathname.replace(/\/+$/, "") || "/admin";
  const normalized = (RENAMED_ADMIN_PATHS[trimmed] ?? trimmed).split("?")[0];
  // Tabbed menu pages: open when the role may open at least one tab.
  if (ADMIN_HUB_TABS[normalized] && normalized !== "/admin/bookings") return hubTabsForRole(normalized, role).length > 0;
  // Gateway hold and booking pages: back office only (the gateway refuses holds for other roles).
  if (normalized.startsWith("/admin/search/flights/")) return isInternalRole(role);
  // New Booking (the old Search page) and its group hold pages: everyone who could open Search.
  if (normalized === "/admin/bookings/new" || normalized.startsWith("/admin/search/")) return allSearchRoles.includes(role);
  if (normalized === "/admin/booking") return allSearchRoles.includes(role);
  if (normalized === "/admin/flights-search") return allSearchRoles.includes(role);
  if (normalized === "/admin/flight-search") return allSearchRoles.includes(role);
  if (["/admin/bookings", "/admin/bookings/holds", "/admin/tickets"].includes(normalized)) return allSearchRoles.includes(role);
  // Bookings register sub-menus and Booking detail pages (spec 7): back office only.
  if (normalized.startsWith("/admin/bookings/")) return isInternalRole(role);
  if (normalized === "/admin/booking-requests") return allSearchRoles.includes(role);
  // Dashboard → Attention Queue placeholder (spec 2.01); same roles as the Dashboard item.
  if (normalized === "/admin/attention-queue") return ["super_admin", "admin", "staff", "qa", "internal_support"].includes(role);
  // Dashboard → Alerts placeholder (spec 2.01); same roles as the Dashboard item.
  if (normalized === "/admin/alerts") return ["super_admin", "admin", "staff", "qa", "internal_support"].includes(role);
  // Finance overview (D50): this exact page only; each Finance screen keeps its own roles below.
  if (normalized === "/admin/finance") return financeRoles.includes(role);
  if (role === "customer" && normalized === "/admin") return true;
  return adminNavigation.some((section) =>
    section.items.some((navItem) => {
      if (!navItem.roles.includes(role)) return false;
      if (!navItem.url.startsWith("/admin")) return false;
      const url = navItem.url.split("?")[0];
      if (url === "/admin") return normalized === "/admin";
      return normalized === url || normalized.startsWith(`${url}/`);
    }),
  );
}

/** Search results, holds and checkout belong to New Booking (sidebar highlight: Bookings; Search for agency roles). */
const SEARCH_FLOW_PATHS = ["/admin/flights-search", "/admin/flight-search", "/admin/booking", "/admin/search"];

/** The sidebar path a page belongs to. */
export function sidebarPathFor(pathname: string) {
  const path = pathname.replace(/\/+$/, "") || "/admin";
  return SEARCH_FLOW_PATHS.includes(path) || path.startsWith("/admin/search/") ? "/admin/bookings/new" : path;
}

export function roleLabel(role: UserRole) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// Browser tab titles for admin pages ("<title> · Travelian Admin"): the label the
// sidebar shows for the page, so the tab and the menu always agree.
const ADMIN_PAGES_OUTSIDE_SIDEBAR: Record<string, string> = {
  "/admin/attention-queue": "Attention Queue",
  "/admin/alerts": "Alerts",
  "/admin/notifications": "Notifications",
  "/admin/booking": "Booking",
  "/admin/bookings/new": "New Booking",
  "/admin/flights-search": "New Booking",
  "/admin/search/flights/hold": "Hold flight",
  "/admin/search/flights/hold/result": "Hold result",
};

export function adminPageTitle(role: UserRole, pathname: string): string {
  const path = pathname.replace(/\/+$/, "") || "/admin";
  if (ADMIN_PAGES_OUTSIDE_SIDEBAR[path]) return ADMIN_PAGES_OUTSIDE_SIDEBAR[path];
  const matches = (url: string) => {
    const target = url.split("?")[0];
    return target === "/admin" ? path === "/admin" : path === target || path.startsWith(`${target}/`);
  };
  if (isInternalRole(role)) {
    for (const menu of getInternalSidebarForRole(role)) {
      if (menu.overview && path === menu.overview.url) return menu.overview.title;
      const found = menu.items.find((navItem) => matches(navItem.url));
      if (found) return menu.items.length === 1 ? menu.title : found.title;
    }
  } else {
    for (const section of getNavigationForRole(role)) {
      const found = section.items.find((navItem) => matches(navItem.url));
      if (found) return found.title;
    }
  }
  return "Admin";
}
