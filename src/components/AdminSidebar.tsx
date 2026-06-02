import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Globe } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useRole } from "@/contexts/RoleContext";
import { getNavigationForRole, roleLabel } from "@/lib/admin-navigation";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarFooter,
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
  const sections = useMemo(() => getNavigationForRole(currentRole), [currentRole]);
  const isPathActive = (path: string) =>
    path === "/admin" ? location.pathname === "/admin" : location.pathname === path || location.pathname.startsWith(`${path}/`);
  const activeItemKey = useMemo(() => {
    for (const section of sections) {
      const item = section.items.find((candidate) => isPathActive(candidate.url));
      if (item) return `${section.category}-${item.url}-${item.title}`;
    }
    return undefined;
  }, [location.pathname, sections]);
  const isActive = (category: string, path: string, title: string) =>
    activeItemKey === `${category}-${path}-${title}`;
  const activeCategory = useMemo(
    () => sections.find((section) => section.items.some((item) => isPathActive(item.url)))?.category,
    [activeItemKey, sections],
  );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const isAgency = currentRole === "agency_owner" || currentRole === "agency_staff";
  const isCustomer = currentRole === "customer";

  useEffect(() => {
    const categoryToOpen = activeCategory || sections[0]?.category;
    setOpenGroups(categoryToOpen ? { [categoryToOpen]: true } : {});
  }, [activeCategory, currentRole, sections]);

  const allItems = sections.flatMap((section) => section.items.map((item) => ({ ...item, category: section.category })));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/70">
      <SidebarHeader className={cn("py-3", collapsed ? "px-2" : "px-3")}>
        <div className={cn("flex items-center rounded-2xl border border-sidebar-border/60 bg-sidebar-accent/35 py-2", collapsed ? "justify-center px-0" : "gap-2.5 px-2.5")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-primary shadow-sm">
            <img src="/travelian-official-icon.png" alt="" className="h-7 w-7 object-contain" />
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

      <div className="travelian-sidebar-nav flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 pb-2">
        {collapsed ? (
          <SidebarMenu className="gap-1">
            {allItems.map((item) => (
              <SidebarMenuItem key={`collapsed-${item.url}-${item.title}`}>
              <SidebarMenuButton
                  asChild
                  isActive={isActive(item.category, item.url, item.title)}
                  tooltip={item.title}
                  className="mx-auto h-10 w-10 rounded-xl p-0 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm hover:bg-sidebar-accent/80"
                >
                  <NavLink to={item.url} end={item.url === "/admin"} activeClassName="text-primary-foreground" className="flex h-full w-full items-center justify-center">
                    <item.icon className="h-5 w-5 shrink-0" />
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <SidebarMenuItem className="mt-2 border-t border-sidebar-border/60 pt-2">
              <SidebarMenuButton asChild tooltip="View Public Site" className="mx-auto h-10 w-10 rounded-xl p-0">
                <Link to="/" className="flex items-center justify-center text-sidebar-muted hover:text-sidebar-accent-foreground">
                  <Globe className="h-5 w-5 shrink-0" />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <div className="space-y-1">
            {sections.map((section) => {
              const open = !!openGroups[section.category];
              return (
                <Collapsible
                  key={section.category}
                  open={open}
                  onOpenChange={(nextOpen) => setOpenGroups(nextOpen ? { [section.category]: true } : {})}
                >
                  <CollapsibleTrigger className="group flex h-9 w-full items-center justify-between rounded-lg px-2.5 text-[12px] font-bold uppercase tracking-[0.04em] text-sidebar-muted transition-colors hover:bg-sidebar-accent/55 hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent/80 data-[state=open]:text-sidebar-accent-foreground">
                    <span>{section.category}</span>
                    <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="ml-2 overflow-hidden border-l border-sidebar-border/70 pl-1.5 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                    <SidebarMenu className="gap-0.5 pb-1">
                      {section.items.map((item) => (
                        <SidebarMenuItem key={`${section.category}-${item.url}-${item.title}`}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive(section.category, item.url, item.title)}
                            className="h-9 rounded-xl px-2.5 text-[13.5px] font-semibold data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm hover:bg-sidebar-accent/80"
                          >
                            <NavLink to={item.url} end={item.url === "/admin"} activeClassName="text-primary-foreground font-semibold">
                              <item.icon className="h-5 w-5 shrink-0" />
                              <span>{item.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}

            <div className="mt-2 border-t border-sidebar-border/60 pt-2">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="h-8 rounded-xl px-2.5 text-[12.5px]">
                    <Link to="/" className="flex items-center gap-2 text-sidebar-muted hover:text-sidebar-accent-foreground">
                      <Globe className="h-4 w-4 shrink-0" />
                      <span>View Public Site</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </div>
          </div>
        )}
      </div>

      <SidebarFooter className={cn("mt-auto border-t border-sidebar-border/60", collapsed ? "p-2" : "p-3")}>
        {!collapsed && (
          <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/80 p-2.5 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.08em] text-sidebar-muted">Logged in as</p>
            <p className="mt-1 truncate text-sm font-semibold text-sidebar-accent-foreground">{currentUser.name}</p>
            <p className="mt-0.5 truncate text-[11px] text-sidebar-muted">
              {roleLabel(currentRole)}
              {currentUser.agencyName && ` - ${currentUser.agencyName}`}
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
