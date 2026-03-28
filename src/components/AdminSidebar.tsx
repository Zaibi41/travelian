import {
  LayoutDashboard, Building2, Package, CalendarCheck, Wallet,
  Users, FileText, Bell, Settings, Plane, Hotel, Map, FileCheck,
  Tag, PenTool, Shield, Ticket,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

const superAdminNav: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Agencies", url: "/agencies", icon: Building2 },
  { title: "Umrah Packages", url: "/packages", icon: Package },
  { title: "Tour Packages", url: "/tours", icon: Map },
  { title: "Visa Packages", url: "/visa", icon: FileCheck },
  { title: "Bookings", url: "/bookings", icon: CalendarCheck },
  { title: "Travel Tickets", url: "/tickets", icon: Ticket },
  { title: "Hotels", url: "/hotels", icon: Hotel },
  { title: "Flights", url: "/flights", icon: Plane },
  { title: "Wallet", url: "/wallet", icon: Wallet },
];

const superAdminSystemNav: NavItem[] = [
  { title: "Users", url: "/users", icon: Users },
  { title: "Access Control", url: "/rbac", icon: Shield },
  { title: "Coupons & Deals", url: "/coupons", icon: Tag },
  { title: "Blog", url: "/blog", icon: PenTool },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Settings", url: "/settings", icon: Settings },
];

const adminNav: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Agencies", url: "/agencies", icon: Building2 },
  { title: "Umrah Packages", url: "/packages", icon: Package },
  { title: "Tour Packages", url: "/tours", icon: Map },
  { title: "Visa Packages", url: "/visa", icon: FileCheck },
  { title: "Bookings", url: "/bookings", icon: CalendarCheck },
  { title: "Travel Tickets", url: "/tickets", icon: Ticket },
  { title: "Hotels", url: "/hotels", icon: Hotel },
  { title: "Flights", url: "/flights", icon: Plane },
  { title: "Wallet", url: "/wallet", icon: Wallet },
];

const adminSystemNav: NavItem[] = [
  { title: "Users", url: "/users", icon: Users },
  { title: "Coupons & Deals", url: "/coupons", icon: Tag },
  { title: "Blog", url: "/blog", icon: PenTool },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Settings", url: "/settings", icon: Settings },
];

const staffNav: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Bookings", url: "/bookings", icon: CalendarCheck },
  { title: "Travel Tickets", url: "/tickets", icon: Ticket },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Notifications", url: "/notifications", icon: Bell },
];

const agencyOwnerNav: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Umrah Packages", url: "/packages", icon: Package },
  { title: "Tour Packages", url: "/tours", icon: Map },
  { title: "Visa Packages", url: "/visa", icon: FileCheck },
  { title: "Bookings", url: "/bookings", icon: CalendarCheck },
  { title: "Travel Tickets", url: "/tickets", icon: Ticket },
  { title: "My Wallet", url: "/wallet", icon: Wallet },
];

const agencyOwnerSystemNav: NavItem[] = [
  { title: "My Staff", url: "/users", icon: Users },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Settings", url: "/settings", icon: Settings },
];

const agencyStaffNav: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Umrah Packages", url: "/packages", icon: Package },
  { title: "Tour Packages", url: "/tours", icon: Map },
  { title: "Visa Packages", url: "/visa", icon: FileCheck },
  { title: "Bookings", url: "/bookings", icon: CalendarCheck },
  { title: "Travel Tickets", url: "/tickets", icon: Ticket },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Notifications", url: "/notifications", icon: Bell },
];

function getNavForRole(role: string): { main: NavItem[]; system: NavItem[] } {
  switch (role) {
    case 'super_admin': return { main: superAdminNav, system: superAdminSystemNav };
    case 'admin': return { main: adminNav, system: adminSystemNav };
    case 'staff': return { main: staffNav, system: [] };
    case 'agency_owner': return { main: agencyOwnerNav, system: agencyOwnerSystemNav };
    case 'agency_staff': return { main: agencyStaffNav, system: [] };
    default: return { main: superAdminNav, system: superAdminSystemNav };
  }
}

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { currentRole, currentUser } = useRole();
  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const { main, system } = getNavForRole(currentRole);

  const renderItems = (items: NavItem[]) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild isActive={isActive(item.url)}>
            <NavLink to={item.url} end={item.url === "/"} activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold">
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  const isAgency = currentRole === 'agency_owner' || currentRole === 'agency_staff';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg gradient-primary">
            <Plane className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-sm font-bold font-display text-sidebar-accent-foreground">Travelian</h1>
              <p className="text-[10px] text-sidebar-muted">
                {isAgency ? 'Agency Panel' : 'Admin Panel'}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{isAgency ? 'Agency' : 'Main'}</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(main)}</SidebarGroupContent>
        </SidebarGroup>
        {system.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{isAgency ? 'Management' : 'System'}</SidebarGroupLabel>
            <SidebarGroupContent>{renderItems(system)}</SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <div className="rounded-lg bg-sidebar-accent p-3">
            <p className="text-xs text-sidebar-muted">Logged in as</p>
            <p className="text-sm font-medium text-sidebar-accent-foreground">{currentUser.name}</p>
            <p className="text-[10px] text-sidebar-muted">
              {currentRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              {currentUser.agencyName && ` · ${currentUser.agencyName}`}
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
