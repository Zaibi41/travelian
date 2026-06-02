import type { ComponentType } from "react";
import {
  BadgePercent,
  Banknote,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  CloudCog,
  CreditCard,
  FileBarChart,
  FileCheck,
  FileText,
  Gift,
  Globe,
  Heart,
  HelpCircle,
  Hotel,
  Image,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Map,
  MessageCircle,
  Package,
  PenTool,
  Plane,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldCheck,
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
  | "Sales & Bookings"
  | "Inventory & Services"
  | "Pricing & Revenue"
  | "Financial"
  | "Agency Finance"
  | "Wallet & Payments"
  | "Operations"
  | "Customers"
  | "Staff Management"
  | "Management"
  | "Reports"
  | "Website & CMS"
  | "Account"
  | "Support"
  | "System"
  | "System / Gateway Settings";

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

const publicSearchRoles: UserRole[] = ["super_admin", "admin", "staff", "agency_owner", "agency_staff", "customer", "qa", "internal_support"];
const platformOwnerRoles: UserRole[] = ["super_admin", "qa", "internal_support"];
const internalAdminRoles: UserRole[] = ["super_admin", "admin", "qa", "internal_support"];
const internalOpsRoles: UserRole[] = ["super_admin", "admin", "staff", "qa", "internal_support"];
const agencyRoles: UserRole[] = ["agency_owner", "agency_staff"];
const agencyOwnerRoles: UserRole[] = ["agency_owner"];
const agencyStaffRoles: UserRole[] = ["agency_staff"];
const customerRoles: UserRole[] = ["customer"];
const allPortalRoles: UserRole[] = [...publicSearchRoles];

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
      item("Flights", "/admin/flight-search", Plane, publicSearchRoles),
      item("Hotels", "/admin/customer/hotels", Hotel, publicSearchRoles),
      item("Umrah Packages", "/admin/packages", Package, [...internalAdminRoles, ...agencyRoles]),
      item("Umrah Packages", "/admin/customer/umrah", Package, customerRoles),
      item("Tour Packages", "/admin/tours", Map, [...internalAdminRoles, ...agencyRoles]),
      item("Visa Services", "/admin/visa", FileCheck, [...internalAdminRoles, ...agencyRoles]),
      item("Visa Services", "/admin/customer/visa", FileCheck, customerRoles),
      item("Group Ticketing", "/group-ticketing", Users, publicSearchRoles),
    ],
  },
  {
    category: "Bookings & Ticketing",
    items: [
      item("All Bookings", "/admin/bookings", CalendarCheck, internalAdminRoles),
      item("My Assigned Bookings", "/admin/bookings", CalendarCheck, ["staff"]),
      item("My Agency Bookings", "/admin/bookings", CalendarCheck, agencyOwnerRoles),
      item("My Bookings", "/admin/bookings", CalendarCheck, agencyStaffRoles),
      item("My Bookings", "/admin/customer/bookings", CalendarCheck, customerRoles),
      item("Create Booking", "/admin/flight-search", Search, [...internalOpsRoles, ...agencyStaffRoles]),
      item("Ticketing & Invoices", "/admin/tickets", Ticket, [...internalAdminRoles, ...agencyRoles]),
      item("Invoices", "/admin/tickets", Receipt, customerRoles),
      item("Refunds & Cancellations", "/admin/bookings", RefreshCw, [...internalAdminRoles, ...agencyRoles, ...customerRoles]),
      item("Booking Requests", "/admin/bookings", ClipboardCheck, [...internalAdminRoles, ...agencyOwnerRoles]),
      item("Pending Requests", "/admin/bookings", ListChecks, ["staff"]),
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
      item("Flight Pricing & Rules", "/admin/flights", Plane, internalAdminRoles),
      item("Hotel Markup Rules", "/admin/hotels", Hotel, platformOwnerRoles),
      item("Package Markup Rules", "/admin/packages", BadgePercent, platformOwnerRoles),
      item("Agency Pricing Rules", "/admin/agencies", Building2, platformOwnerRoles),
      item("Deals & Promotions", "/admin/coupons", Tag, internalAdminRoles),
      item("Commission Rules", "/admin/settings", BadgePercent, platformOwnerRoles),
    ],
  },
  {
    category: "Financial",
    items: [
      item("Wallets", "/admin/wallet", Wallet, internalAdminRoles),
      item("Add / Adjust Balance", "/admin/wallet", Banknote, platformOwnerRoles),
      item("Payment Requests", "/admin/payments", CreditCard, internalAdminRoles),
      item("Online Payments", "/admin/payments", CreditCard, internalAdminRoles),
      item("Bank Transfers", "/admin/wallet", Landmark, internalAdminRoles),
      item("1Link Payments", "/admin/payments", CreditCard, internalAdminRoles),
      item("Card Payments", "/admin/payments", CreditCard, internalAdminRoles),
      item("Deposit Approvals", "/admin/wallet", ShieldCheck, platformOwnerRoles),
      item("Transactions Ledger", "/admin/wallet", Receipt, internalAdminRoles),
      item("Refunds", "/admin/bookings", RefreshCw, internalAdminRoles),
      item("Reconciliation", "/admin/payments", FileBarChart, platformOwnerRoles),
      item("Credit Limits", "/admin/wallet", Shield, platformOwnerRoles),
      item("Payment Gateways", "/admin/payments", CloudCog, platformOwnerRoles),
    ],
  },
  {
    category: "Agency Finance",
    items: [
      item("Wallet", "/admin/wallet", Wallet, agencyRoles),
      item("Add Balance", "/admin/wallet", Banknote, agencyRoles),
      item("Pay via 1Link", "/admin/wallet", CreditCard, agencyRoles),
      item("Pay by Card", "/admin/wallet", CreditCard, agencyRoles),
      item("Bank Transfer", "/admin/wallet", Landmark, agencyRoles),
      item("Deposit Request", "/admin/wallet", ClipboardCheck, agencyRoles),
      item("Payment History", "/admin/payments", Receipt, agencyOwnerRoles),
      item("Transactions", "/admin/wallet", Receipt, agencyRoles),
      item("Invoices", "/admin/tickets", Receipt, agencyRoles),
      item("Refunds", "/admin/bookings", RefreshCw, agencyRoles),
      item("Credit Limit", "/admin/wallet", Shield, agencyOwnerRoles),
    ],
  },
  {
    category: "Wallet & Payments",
    items: [
      item("Wallet", "/admin/customer/wallet", Wallet, customerRoles),
      item("Add Balance", "/admin/customer/wallet", Banknote, customerRoles),
      item("Pay by Card", "/admin/customer/payments", CreditCard, customerRoles),
      item("Pay via 1Link", "/admin/customer/payments", CreditCard, customerRoles),
      item("Bank Transfer", "/admin/customer/payments", Landmark, customerRoles),
      item("Payments", "/admin/customer/payments", CreditCard, customerRoles),
      item("Transactions", "/admin/customer/wallet", Receipt, customerRoles),
      item("Invoices", "/admin/customer/bookings", Receipt, customerRoles),
      item("Refunds", "/admin/customer/bookings", RefreshCw, customerRoles),
    ],
  },
  {
    category: "Operations",
    items: [
      item("Failed Searches / API Issues", "/admin/flights", CloudCog, internalOpsRoles),
      item("Support Tickets", "/admin/notifications", LifeBuoy, internalOpsRoles),
      item("Notifications", "/admin/notifications", Bell, internalOpsRoles),
      item("Document Center", "/admin/documents", FileText, internalOpsRoles),
      item("Manual Booking Requests", "/admin/bookings", ClipboardCheck, internalOpsRoles),
      item("Approvals Center", "/admin/wallet", ShieldCheck, platformOwnerRoles),
      item("Follow-ups", "/admin/notifications", Bell, ["staff"]),
    ],
  },
  {
    category: "Customers",
    items: [
      item("Customers", "/admin/customers", Users, internalAdminRoles),
      item("My Customers", "/admin/customers", Users, agencyOwnerRoles),
      item("Passenger Profiles", "/admin/customers", UserCircle, agencyRoles),
      item("Customer Requests", "/admin/bookings", MessageCircle, internalOpsRoles),
      item("Customer Documents", "/admin/documents", FileText, [...internalOpsRoles, ...agencyRoles]),
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
    category: "Management",
    items: [
      item("Agencies", "/admin/agencies", Building2, internalAdminRoles),
      item("Customers", "/admin/customers", Users, internalAdminRoles),
      item("Users & Staff", "/admin/users", UserCog, internalAdminRoles),
      item("Suppliers / API Providers", "/admin/provider-systems", CloudCog, platformOwnerRoles),
      item("Airline Logo Library", "/admin/provider-systems", Image, platformOwnerRoles),
    ],
  },
  {
    category: "Reports",
    items: [
      item("Business Reports", "/admin", BarChart3, platformOwnerRoles),
      item("Sales Reports", "/admin", FileBarChart, ["super_admin", "admin", "qa", "internal_support"]),
      item("Financial Reports", "/admin/wallet", FileBarChart, platformOwnerRoles),
      item("Agency Reports", "/admin", FileBarChart, [...platformOwnerRoles, ...agencyOwnerRoles]),
      item("API Performance Reports", "/admin/provider-systems", BarChart3, platformOwnerRoles),
      item("My Work Report", "/admin", FileBarChart, ["staff"]),
      item("Booking Report", "/admin/bookings", FileBarChart, ["staff", "agency_staff"]),
      item("Wallet Report", "/admin/wallet", FileBarChart, agencyOwnerRoles),
      item("Staff Performance", "/admin/users", BarChart3, agencyOwnerRoles),
    ],
  },
  {
    category: "Website & CMS",
    items: [
      item("Website Banners", "/admin/settings", Image, platformOwnerRoles),
      item("Blog / News", "/admin/blog", PenTool, internalAdminRoles),
      item("Static Pages", "/admin/settings", BookOpen, platformOwnerRoles),
      item("Testimonials", "/admin/settings", MessageCircle, platformOwnerRoles),
    ],
  },
  {
    category: "Support",
    items: [
      item("Help Center", "/admin/customer/support", HelpCircle, customerRoles),
      item("WhatsApp Support", "/admin/customer/support", MessageCircle, [...agencyRoles, ...customerRoles]),
      item("Support Tickets", "/admin/customer/support", LifeBuoy, [...agencyRoles, ...customerRoles]),
      item("Notifications", "/admin/customer/support", Bell, [...agencyRoles, ...customerRoles]),
    ],
  },
  {
    category: "Account",
    items: [
      item("Profile", "/admin/customer/profile", UserCircle, ["admin", "staff", "customer"]),
      item("Agency Profile", "/admin/settings", Building2, agencyOwnerRoles),
      item("My Profile", "/admin/users", UserCircle, agencyRoles),
      item("Passengers", "/admin/customer/profile", Users, customerRoles),
      item("Documents", "/admin/customer/profile", FileText, customerRoles),
      item("Wishlist", "/admin/customer/wishlist", Heart, customerRoles),
      item("Rewards", "/admin/customer/rewards", Gift, customerRoles),
      item("Change Password", "/admin/settings", KeyRound, allPortalRoles),
    ],
  },
  {
    category: "System / Gateway Settings",
    items: [
      item("Gateway Settings", "/admin/payments", Settings, platformOwnerRoles),
      item("UBL Settings", "/admin/secrets", Landmark, platformOwnerRoles),
      item("1Link Settings", "/admin/secrets", CreditCard, platformOwnerRoles),
      item("Payment Webhook Logs", "/admin/provider-systems", CloudCog, platformOwnerRoles),
      item("Payment Failure Logs", "/admin/provider-systems", CloudCog, platformOwnerRoles),
    ],
  },
  {
    category: "System",
    items: [
      item("Roles & Permissions", "/admin/rbac", Shield, platformOwnerRoles),
      item("API Settings", "/admin/provider-systems", CloudCog, platformOwnerRoles),
      item("Secret Manager", "/admin/secrets", KeyRound, platformOwnerRoles),
      item("Audit Logs", "/admin/provider-systems", FileText, platformOwnerRoles),
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
  if (normalized === "/admin/booking") return publicSearchRoles.includes(role);
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
