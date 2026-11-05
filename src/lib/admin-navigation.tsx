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
  Hotel,
  Hourglass,
  KeyRound,
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
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import type { UserRole } from "@/data/models";

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

function item(title: string, url: string, icon: AdminNavItem["icon"], roles: UserRole[]): AdminNavItem {
  return { title, url, icon, roles };
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
      item("Search", "/admin/search", Search, allSearchRoles),
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
      item("Hotels Inventory", "/admin/hotels", Hotel, internalAdminRoles),
      item("Umrah Packages", "/admin/packages", Package, internalAdminRoles),
    ],
  },
  {
    category: "Pricing & Revenue",
    items: [
      item("Flight Pricing & Rules", "/admin/flights", Plane, platformOwnerRoles),
      item("Deals & Promotions", "/admin/coupons", Tag, internalAdminRoles),
    ],
  },
  {
    category: "Financial",
    items: [
      item("Wallets", "/admin/wallet", Wallet, internalAdminRoles),
      item("Payments", "/admin/payments", CreditCard, internalAdminRoles),
      item("Transactions Ledger", "/admin/wallet", Receipt, internalAdminRoles),
      item("Refunds", "/admin/flight-bookings?tab=refund", RefreshCw, internalAdminRoles),
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
      item("Document Center", "/admin/documents", FileText, internalOpsRoles),
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
      item("Agency Staff", "/admin/users", Users, agencyOwnerRoles),
      item("Staff Permissions", "/admin/users", Shield, agencyOwnerRoles),
    ],
  },
  {
    category: "Deals & Offers",
    items: [
      item("Deals & Promotions", "/admin/coupons", Tag, agencyOwnerRoles),
    ],
  },
  {
    category: "Management",
    items: [
      item("Agencies", "/admin/agencies", Building2, internalAdminRoles),
      item("Users & Staff", "/admin/users", UserCog, internalAdminRoles),
      item("Suppliers / API Providers", "/admin/provider-systems", CloudCog, platformOwnerRoles),
      item("Group Ticketing Collections", "/admin/group-ticketing", Ticket, internalAdminRoles),
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
      item("Announcements", "/admin/announcements", Megaphone, ["super_admin"]),
      item("Blog / News", "/admin/blog", PenTool, internalAdminRoles),
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
      item("Agency Profile", "/admin/settings", Building2, agencyOwnerRoles),
      item("My Profile", "/admin/users", UserCircle, agencyStaffRoles),
      item("Change Password", "/admin/settings", KeyRound, ["admin", "staff", ...agencyRoles]),
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
      item("Change Password", "/admin/settings", KeyRound, customerRoles),
    ],
  },
  {
    category: "System",
    items: [
      item("Roles & Permissions", "/admin/rbac", Shield, platformOwnerRoles),
      item("Secret Manager", "/admin/secrets", KeyRound, platformOwnerRoles),
      item("General Settings", "/admin/settings", Settings, internalAdminRoles),
      item("Audit Logs", "/admin/roadmap/audit-logs", FileText, platformOwnerRoles),
      item("Webhook Logs", "/admin/roadmap/webhook-logs", CloudCog, platformOwnerRoles),
      item("Reconciliation", "/admin/roadmap/reconciliation", Receipt, platformOwnerRoles),
      item("Payment Gateways", "/admin/roadmap/payment-gateways", CreditCard, platformOwnerRoles),
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
// Internal-role sidebar: exactly the 14 spec menus, in spec order (approved
// 2026-11-06). Display only: page access still comes from `adminNavigation`
// via canAccessAdminPath, so every existing link keeps its current access.
// Agency owner, agency staff and customer sidebars are unchanged.
// Not in this sidebar (still reachable by URL): Secret Manager, Notifications
// (in the user menu), View Public Site (in the user menu).
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
}

const internalSidebarMenus: SidebarMenuEntry[] = [
  { number: "01", title: "Dashboard", icon: LayoutDashboard, items: [item("Dashboard", "/admin", LayoutDashboard, INTERNAL_ROLES)] },
  { number: "02", title: "Search", icon: Search, items: [item("Search", "/admin/search", Search, allSearchRoles)] },
  { number: "03", title: "Bookings", icon: ClipboardCheck, items: [item("Bookings", "/admin/requests", ClipboardCheck, allSearchRoles)] },
  { number: "04", title: "Customers & Travelers", icon: Users, items: [item("Customers", "/admin/customers", Users, [...internalAdminRoles, "staff"])] },
  {
    number: "05", title: "Finance", icon: Wallet, items: [
      item("Wallets", "/admin/wallet", Wallet, internalAdminRoles),
      item("Payments", "/admin/payments", CreditCard, [...internalAdminRoles, "staff"]),
      item("Reconciliation", "/admin/roadmap/reconciliation", Receipt, platformOwnerRoles),
    ],
  },
  { number: "06", title: "Flight Operations", icon: CalendarCheck, items: [item("Flight Operations", "/admin/flight-bookings", CalendarCheck, allSearchRoles)] },
  {
    number: "07", title: "Inventory & Services", icon: Hotel, items: [
      item("Group Ticketing Collections", "/admin/group-ticketing", Ticket, internalAdminRoles),
      item("Hotels Inventory", "/admin/hotels", Hotel, internalAdminRoles),
      item("Umrah Packages", "/admin/packages", Package, internalAdminRoles),
    ],
  },
  {
    number: "08", title: "Pricing & Revenue", icon: Tag, items: [
      item("Flight Pricing & Rules", "/admin/flights", Plane, platformOwnerRoles),
      item("Deals & Promotions", "/admin/coupons", Tag, internalAdminRoles),
    ],
  },
  { number: "09", title: "B2B Partners", icon: Building2, items: [item("Agencies", "/admin/agencies", Building2, internalAdminRoles)] },
  {
    number: "10", title: "Suppliers & Integrations", icon: CloudCog, items: [
      item("Suppliers / API Providers", "/admin/provider-systems", CloudCog, platformOwnerRoles),
      item("Payment Gateways", "/admin/roadmap/payment-gateways", CreditCard, platformOwnerRoles),
    ],
  },
  {
    number: "11", title: "Users & Access", icon: UserCog, items: [
      item("Users & Staff", "/admin/users", UserCog, internalAdminRoles),
      item("Roles & Permissions", "/admin/rbac", Shield, platformOwnerRoles),
      item("Audit Logs", "/admin/roadmap/audit-logs", FileText, platformOwnerRoles),
    ],
  },
  { number: "12", title: "Reports", icon: BarChart3, items: [item("Reports", "/admin/reports", BarChart3, [...internalAdminRoles, "staff"])] },
  {
    number: "13", title: "Website & CMS", icon: Megaphone, items: [
      item("Announcements", "/admin/announcements", Megaphone, ["super_admin"]),
      item("Blog / News", "/admin/blog", PenTool, internalAdminRoles),
    ],
  },
  {
    number: "14", title: "System", icon: Settings, items: [
      item("General Settings", "/admin/settings", Settings, internalAdminRoles),
      item("Document Center", "/admin/documents", FileText, internalOpsRoles),
      item("Webhook Logs", "/admin/roadmap/webhook-logs", CloudCog, platformOwnerRoles),
    ],
  },
];

/** The 14 menus for an internal role, keeping only items that role may open. */
export function getInternalSidebarForRole(role: UserRole): SidebarMenuEntry[] {
  return internalSidebarMenus
    .map((menu) => ({ ...menu, items: menu.items.filter((navItem) => navItem.roles.includes(role)) }))
    .filter((menu) => menu.items.length > 0);
}

export function canAccessAdminPath(role: UserRole, pathname: string) {
  const normalized = pathname.replace(/\/+$/, "") || "/admin";
  if (normalized === "/admin/booking") return allSearchRoles.includes(role);
  if (normalized === "/admin/flights-search") return allSearchRoles.includes(role);
  if (normalized === "/admin/flight-search") return allSearchRoles.includes(role);
  if (["/admin/bookings", "/admin/bookings/holds", "/admin/tickets"].includes(normalized)) return allSearchRoles.includes(role);
  if (normalized === "/admin/booking-requests") return allSearchRoles.includes(role);
  // Dashboard → Attention Queue placeholder (spec 2.01); same roles as the Dashboard item.
  if (normalized === "/admin/attention-queue") return ["super_admin", "admin", "staff", "qa", "internal_support"].includes(role);
  if (role === "customer" && normalized === "/admin") return true;
  return adminNavigation.some((section) =>
    section.items.some((navItem) => {
      if (!navItem.roles.includes(role)) return false;
      if (!navItem.url.startsWith("/admin")) return false;
      if (navItem.url === "/admin") return normalized === "/admin";
      return normalized === navItem.url || normalized.startsWith(`${navItem.url}/`);
    }),
  );
}

export function roleLabel(role: UserRole) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
