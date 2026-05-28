import type { ComponentType } from "react";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  CloudCog,
  CreditCard,
  FileCheck,
  FileText,
  Gift,
  Heart,
  Hotel,
  KeyRound,
  LayoutDashboard,
  Map,
  Package,
  PenTool,
  Plane,
  Search,
  Settings,
  Shield,
  Tag,
  Ticket,
  UserCircle,
  Users,
  Wallet,
} from "lucide-react";
import type { UserRole } from "@/data/mock";

export type AdminNavCategory =
  | "Dashboard"
  | "Sales & Bookings"
  | "Search & Reservations"
  | "Financial"
  | "Operations"
  | "Management"
  | "Reports"
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

const allAdminRoles: UserRole[] = ["super_admin", "admin", "staff", "agency_owner", "agency_staff", "qa", "internal_support"];
const systemRoles: UserRole[] = ["super_admin", "qa", "internal_support"];
const businessAdminRoles: UserRole[] = ["super_admin", "admin", "qa", "internal_support"];
const agencyBusinessRoles: UserRole[] = ["agency_owner"];
const agencyBookingRoles: UserRole[] = ["agency_owner", "agency_staff"];
const bookingOpsRoles: UserRole[] = ["super_admin", "admin", "staff", "agency_owner", "agency_staff", "qa", "internal_support"];

export const adminNavigation: AdminNavSection[] = [
  {
    category: "Dashboard",
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard, roles: allAdminRoles },
      { title: "Customer Portal", url: "/admin/customer", icon: UserCircle, roles: ["customer"] },
      { title: "My Bookings", url: "/admin/customer/bookings", icon: CalendarCheck, roles: ["customer"] },
      { title: "Profile", url: "/admin/customer/profile", icon: UserCircle, roles: ["customer"] },
    ],
  },
  {
    category: "Sales & Bookings",
    items: [
      { title: "Bookings", url: "/admin/bookings", icon: CalendarCheck, roles: bookingOpsRoles },
      { title: "Travel Tickets", url: "/admin/tickets", icon: Ticket, roles: bookingOpsRoles },
      { title: "Coupons & Deals", url: "/admin/coupons", icon: Tag, roles: businessAdminRoles },
    ],
  },
  {
    category: "Search & Reservations",
    items: [
      { title: "Flight Search", url: "/admin/flight-search", icon: Search, roles: agencyBookingRoles },
      { title: "Flight Results", url: "/admin/flights-search", icon: Plane, roles: agencyBookingRoles },
      { title: "Search Flights", url: "/admin/customer/flights", icon: Plane, roles: ["customer"] },
      { title: "Search Hotels", url: "/admin/customer/hotels", icon: Hotel, roles: ["customer"] },
      { title: "Flight Pricing & Rules", url: "/admin/flights", icon: Plane, roles: businessAdminRoles },
      { title: "Hotels Inventory", url: "/admin/hotels", icon: Hotel, roles: businessAdminRoles },
      { title: "Umrah Packages", url: "/admin/packages", icon: Package, roles: [...businessAdminRoles, ...agencyBusinessRoles] },
      { title: "Tour Packages", url: "/admin/tours", icon: Map, roles: [...businessAdminRoles, ...agencyBusinessRoles] },
      { title: "Visa Packages", url: "/admin/visa", icon: FileCheck, roles: [...businessAdminRoles, ...agencyBusinessRoles] },
      { title: "Umrah Packages", url: "/admin/customer/umrah", icon: Package, roles: ["customer"] },
      { title: "Visa Services", url: "/admin/customer/visa", icon: FileCheck, roles: ["customer"] },
    ],
  },
  {
    category: "Financial",
    items: [
      { title: "Wallet", url: "/admin/wallet", icon: Wallet, roles: [...businessAdminRoles, ...agencyBusinessRoles] },
      { title: "Wallet", url: "/admin/customer/wallet", icon: Wallet, roles: ["customer"] },
      { title: "Payments", url: "/admin/payments", icon: CreditCard, roles: businessAdminRoles },
      { title: "Payments", url: "/admin/customer/payments", icon: CreditCard, roles: ["customer"] },
    ],
  },
  {
    category: "Operations",
    items: [
      { title: "Documents", url: "/admin/documents", icon: FileText, roles: bookingOpsRoles },
      { title: "Notifications", url: "/admin/notifications", icon: Bell, roles: bookingOpsRoles },
      { title: "Wishlist", url: "/admin/customer/wishlist", icon: Heart, roles: ["customer"] },
      { title: "Rewards", url: "/admin/customer/rewards", icon: Gift, roles: ["customer"] },
      { title: "Support", url: "/admin/customer/support", icon: Bell, roles: ["customer"] },
      { title: "Content Blog", url: "/admin/blog", icon: PenTool, roles: businessAdminRoles },
    ],
  },
  {
    category: "Management",
    items: [
      { title: "Agencies", url: "/admin/agencies", icon: Building2, roles: businessAdminRoles },
      { title: "Users & Staff", url: "/admin/users", icon: Users, roles: [...businessAdminRoles, ...agencyBusinessRoles] },
      { title: "Access Control", url: "/admin/rbac", icon: Shield, roles: systemRoles },
    ],
  },
  {
    category: "Reports",
    items: [
      { title: "Business Reports", url: "/admin", icon: BarChart3, roles: [...businessAdminRoles, ...agencyBusinessRoles] },
    ],
  },
  {
    category: "System",
    items: [
      { title: "Provider Systems", url: "/admin/provider-systems", icon: CloudCog, roles: systemRoles },
      { title: "Secret Manager", url: "/admin/secrets", icon: KeyRound, roles: systemRoles },
      { title: "Settings", url: "/admin/settings", icon: Settings, roles: [...businessAdminRoles, ...agencyBusinessRoles] },
    ],
  },
];

export function getNavigationForRole(role: UserRole): AdminNavSection[] {
  return adminNavigation
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);
}

export function canAccessAdminPath(role: UserRole, pathname: string) {
  const normalized = pathname.replace(/\/+$/, "") || "/admin";
  if (role === "customer") return normalized === "/admin/customer" || normalized.startsWith("/admin/customer/");
  if (normalized === "/admin/booking") return ["super_admin", "admin", "staff", "agency_owner", "agency_staff", "qa", "internal_support"].includes(role);
  return adminNavigation.some((section) =>
    section.items.some((item) => {
      if (!item.roles.includes(role)) return false;
      if (item.url === "/admin") return normalized === "/admin";
      return normalized === item.url || normalized.startsWith(`${item.url}/`);
    }),
  );
}

export function roleLabel(role: UserRole) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
