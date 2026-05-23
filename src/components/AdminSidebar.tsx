import { Globe, Plane } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useRole } from "@/contexts/RoleContext";
import { getNavigationForRole, roleLabel } from "@/lib/admin-navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { currentRole, currentUser } = useRole();
  const sections = getNavigationForRole(currentRole);
  const isAgency = currentRole === "agency_owner" || currentRole === "agency_staff";
  const isCustomer = currentRole === "customer";

  const isActive = (path: string) =>
    path === "/admin" ? location.pathname === "/admin" : location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/70">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-primary shadow-sm">
            <Plane className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold font-display text-sidebar-accent-foreground leading-tight">Travelian</h1>
              <p className="text-[10px] text-sidebar-muted">
                {isCustomer ? "Customer Portal" : isAgency ? "Agency Portal" : "Enterprise Console"}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 pb-2">
        {sections.map((section) => (
          <SidebarGroup key={section.category} className="py-1">
            <SidebarGroupLabel className="h-7 px-2 text-[10px] font-bold uppercase tracking-[0.08em] text-sidebar-muted/90">
              {section.category}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {section.items.map((item) => (
                  <SidebarMenuItem key={`${section.category}-${item.url}-${item.title}`}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={collapsed ? item.title : undefined}
                      className="h-9 rounded-xl px-2.5 text-[13px] font-medium data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-primary data-[active=true]:shadow-sm hover:bg-sidebar-accent/80"
                    >
                      <NavLink to={item.url} end={item.url === "/admin"} activeClassName="text-sidebar-primary font-semibold">
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup className="mt-1 border-t border-sidebar-border/60 pt-3">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={collapsed ? "View Public Site" : undefined} className="h-9 rounded-xl px-2.5 text-[13px]">
                  <Link to="/" className="flex items-center gap-2 text-sidebar-muted hover:text-sidebar-accent-foreground">
                    <Globe className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>View Public Site</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && (
          <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/80 p-3 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.08em] text-sidebar-muted">Logged in as</p>
            <p className="mt-1 truncate text-sm font-semibold text-sidebar-accent-foreground">{currentUser.name}</p>
            <p className="mt-0.5 truncate text-[11px] text-sidebar-muted">
              {roleLabel(currentRole)}
              {currentUser.agencyName && ` · ${currentUser.agencyName}`}
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
