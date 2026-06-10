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
  FileCheck,
  FileText,
  Gift,
  Globe,
  Heart,
  Hotel,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Map,
  MessageCircle,
  Package,
  PenTool,
  Plane,
  Receipt,
  RefreshCw,
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
  | "Search & Book"
  | "Bookings & Ticketing"
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
    category: "Search & Book",
    items: [
      item("Flights", "/admin/flight-search", Plane, allSearchRoles),
      item("Hotels", "/admin/customer/hotels", Hotel, allSearchRoles),
      item("Umrah Packages", "/admin/packages", Package, [...internalAdminRoles, ...agencyRoles]),
      item("Umrah Packages", "/admin/customer/umrah", Package, customerRoles),
      item("Tour Packages", "/admin/tours", Map, [...internalAdminRoles, ...agencyRoles]),
      item("Visa Services", "/admin/visa", FileCheck, [...internalAdminRoles, ...agencyRoles]),
      item("Visa Services", "/admin/customer/visa", FileCheck, customerRoles),
      item("Group Ticketing", "/group-ticketing", Users, allSearchRoles),
    ],
  },
  {
    category: "Bookings & Ticketing",
    items: [
      item("All Bookings", "/admin/bookings", CalendarCheck, internalAdminRoles),
      item("My Assigned Bookings", "/admin/bookings", CalendarCheck, ["staff"]),
      item("My Agency Bookings", "/admin/bookings", CalendarCheck, agencyOwnerRoles),
      item("My Bookings", "/admin/bookings", CalendarCheck, agencyStaffRoles),
      item("Ticketing & Invoices", "/admin/tickets", Ticket, [...internalAdminRoles, ...agencyRoles]),
      item("Refunds & Cancellations", "/admin/bookings", RefreshCw, [...internalAdminRoles, ...agencyRoles]),
      item("Booking Requests", "/admin/booking-requests", ClipboardCheck, [...internalAdminRoles, ...agencyOwnerRoles, "staff"]),
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
      item("Tour Packages", "/admin/tours", Map, internalAdminRoles),
      item("Visa Packages", "/admin/visa", FileCheck, internalAdminRoles),
    ],
  },
  {
    category: "Pricing & Revenue",
    items: [
      item("Flight Pricing & Rules", "/admin/flights", Plane, platformOwnerRoles),
      item("Fare Management", "/admin/flights", Receipt, platformOwnerRoles),
      item("Deals & Promotions", "/admin/coupons", Tag, internalAdminRoles),
    ],
  },
  {
    category: "Financial",
    items: [
      item("Wallets", "/admin/wallet", Wallet, internalAdminRoles),
      item("Payments", "/admin/payments", CreditCard, internalAdminRoles),
      item("Transactions Ledger", "/admin/wallet", Receipt, internalAdminRoles),
      item("Refunds", "/admin/bookings", RefreshCw, internalAdminRoles),
    ],
  },
  {
    category: "Agency Finance",
    items: [
      item("Wallet", "/admin/wallet", Wallet, agencyOwnerRoles),
      item("Payments", "/admin/payments", CreditCard, agencyOwnerRoles),
      item("Transactions", "/admin/wallet", Receipt, agencyOwnerRoles),
      item("Invoices", "/admin/tickets", Receipt, agencyOwnerRoles),
      item("Refunds", "/admin/bookings", RefreshCw, agencyOwnerRoles),
    ],
  },
  {
    category: "Finance",
    items: [
      item("Wallet", "/admin/wallet", Wallet, agencyStaffRoles),
      item("Transactions", "/admin/wallet", Receipt, agencyStaffRoles),
      item("Invoices", "/admin/tickets", Receipt, agencyStaffRoles),
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
    category: "Customers",
    items: [
      item("Customers", "/admin/customers", Users, [...internalAdminRoles, "staff"]),
      item("My Customers", "/admin/customers", Users, agencyOwnerRoles),
      item("Passenger Profiles", "/admin/customers", UserCircle, agencyStaffRoles),
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
      item("Customers", "/admin/customers", Users, internalAdminRoles),
      item("Users & Staff", "/admin/users", UserCog, internalAdminRoles),
      item("Suppliers / API Providers", "/admin/provider-systems", CloudCog, platformOwnerRoles),
    ],
  },
  {
    category: "Reports",
    items: [
      item("Reports", "/admin", BarChart3, [...internalAdminRoles, ...agencyOwnerRoles, "staff"]),
    ],
  },
  {
    category: "Website & CMS",
    items: [
      item("Blog / News", "/admin/blog", PenTool, internalAdminRoles),
    ],
  },
  {
    category: "Support",
    items: [
      item("Help Center", "/admin/customer/support", LifeBuoy, customerRoles),
      item("WhatsApp Support", "/admin/customer/support", MessageCircle, [...agencyRoles, ...customerRoles]),
      item("Notifications", "/admin/customer/support", Bell, [...agencyRoles, ...customerRoles]),
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
      item("View Public Site", "/", Globe, []),
    ],
  },
];

export function getNavigationForRole(role: UserRole): AdminNavSection[] {
  return adminNavigation
    .map((section) => ({
      ...section,
      items: section.items.filter((navItem) => navItem.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);
}

export function canAccessAdminPath(role: UserRole, pathname: string) {
  const normalized = pathname.replace(/\/+$/, "") || "/admin";
  if (normalized === "/admin/booking") return allSearchRoles.includes(role);
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
