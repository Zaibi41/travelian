import {
  LayoutDashboard, Building2, Package, CalendarCheck, Wallet,
  Users, FileText, Bell, Settings, Plane,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Agencies", url: "/agencies", icon: Building2 },
  { title: "Packages", url: "/packages", icon: Package },
  { title: "Bookings", url: "/bookings", icon: CalendarCheck },
  { title: "Wallet", url: "/wallet", icon: Wallet },
];

const systemNav = [
  { title: "Users", url: "/users", icon: Users },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const renderItems = (items: typeof mainNav) => (
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
              <p className="text-[10px] text-sidebar-muted">Admin Panel</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(mainNav)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(systemNav)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <div className="rounded-lg bg-sidebar-accent p-3">
            <p className="text-xs text-sidebar-muted">Logged in as</p>
            <p className="text-sm font-medium text-sidebar-accent-foreground">Ahmed Khan</p>
            <p className="text-[10px] text-sidebar-muted">Super Admin</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
