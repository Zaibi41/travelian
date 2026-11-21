import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Globe } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useRole } from "@/contexts/RoleContext";
import { useSiteSwitches } from "@/lib/site-switches";
import { getInternalSidebarForRole, getNavigationForRole, isInternalRole, sidebarPathFor, type AdminNavItem } from "@/lib/admin-navigation";

interface SidebarSection {
  category: string;
  items: AdminNavItem[];
  /** Menu icon (internal roles only). No number chips: removed at the user's request. */
  icon?: AdminNavItem["icon"];
}
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const UMRAH_ADMIN_PATH = "/admin/packages";

export function AdminSidebar() {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const location = useLocation();
  const { currentRole } = useRole();
  // Internal roles: the 14 spec menus. Agency and customer roles: unchanged sidebar.
  const internal = isInternalRole(currentRole);
  const { umrah } = useSiteSwitches();
  const sections = useMemo<SidebarSection[]>(
    () => (internal
      ? getInternalSidebarForRole(currentRole).map((menu) => ({ category: menu.title, items: menu.items, icon: menu.icon }))
      : getNavigationForRole(currentRole))
      // D39: "Umrah Packages" is hidden with the rest of Umrah until the gateway's switch is on.
      .map((section) => ({ ...section, items: section.items.filter((navItem) => umrah || navItem.url !== UMRAH_ADMIN_PATH) }))
      .filter((section) => section.items.length > 0),
    [currentRole, internal, umrah],
  );
  const currentPath = sidebarPathFor(location.pathname);
  const isPathActive = (path: string) =>
    path === "/admin" ? currentPath === "/admin" : currentPath === path || currentPath.startsWith(`${path}/`);
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
  const directCategories = new Set(["Dashboard", "Search", "Flight Bookings", "Requests", "Customers"]);

  useEffect(() => {
    const categoryToOpen = activeCategory || sections[0]?.category;
    setOpenGroups(categoryToOpen ? { [categoryToOpen]: true } : {});
  }, [activeCategory, currentRole, sections]);

  // Collapsed sidebar. Internal roles: one icon per menu (opens its first screen,
  // highlighted while on any of its screens). Others: one icon per item, as before.
  const allItems = internal
    ? sections.map((section) => ({
      ...section.items[0],
      title: section.category,
      icon: section.icon ?? section.items[0].icon,
      category: section.category,
      menuActive: section.items.some((item) => isPathActive(item.url)),
    }))
    : sections.flatMap((section) => section.items.map((item) => ({ ...item, category: section.category, menuActive: undefined as boolean | undefined })));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/70">
      <SidebarHeader className="h-16 shrink-0 items-center justify-center border-b border-border bg-card px-4 py-2">
        <Link to="/admin" aria-label="Travelian dashboard" className="flex w-fit max-w-full items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card">
          <img
            src={collapsed ? "/travelian-official-icon.png" : "/travelian-logo-wordmark.png"}
            alt="Travelian"
            width={collapsed ? 128 : 576}
            height={collapsed ? 128 : 164}
            className={collapsed ? "h-10 w-10 object-contain" : "h-11 w-auto max-w-full object-contain"}
          />
        </Link>
      </SidebarHeader>

      <div className="travelian-sidebar-nav flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 pt-3 pb-2">
        {collapsed ? (
          <SidebarMenu className="gap-1">
            {allItems.map((item) => (
              <SidebarMenuItem key={`collapsed-${item.url}-${item.title}`}>
              <SidebarMenuButton
                  asChild
                  isActive={item.menuActive ?? isActive(item.category, item.url, item.title)}
                  tooltip={item.comingSoon ? `${item.title} (coming soon)` : item.title}
                  className="mx-auto h-10 w-10 rounded-xl p-0 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-sm hover:bg-sidebar-accent/80"
                >
                  <NavLink to={item.url} end={item.url === "/admin"} activeClassName="text-sidebar-primary-foreground" className="flex h-full w-full items-center justify-center">
                    <item.icon className="h-5 w-5 shrink-0" />
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {!internal && (
              <SidebarMenuItem className="mt-2 border-t border-sidebar-border/60 pt-2">
                <SidebarMenuButton asChild tooltip="View Public Site" className="mx-auto h-10 w-10 rounded-xl p-0">
                  <Link to="/" className="flex items-center justify-center text-sidebar-muted hover:text-sidebar-accent-foreground">
                    <Globe className="h-5 w-5 shrink-0" />
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        ) : (
          <div className="space-y-1">
            {sections.map((section) => {
              const direct = internal ? section.items.length === 1 : section.items.length === 1 && directCategories.has(section.category);
              if (direct) {
                const item = section.items[0];
                return (
                  <SidebarMenu key={section.category} className="gap-0.5">
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(section.category, item.url, item.title)}
                        className="h-10 rounded-xl px-2.5 text-nav font-bold data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-sm hover:bg-sidebar-accent/80"
                      >
                        <NavLink to={item.url} end={item.url === "/admin"} activeClassName="text-primary-foreground font-bold">
                          {!internal && <item.icon className="h-5 w-5 shrink-0" />}
                          <span className="min-w-0 break-words">{internal ? section.category : item.title}</span>
                          {!internal && item.comingSoon && <ComingSoon />}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                );
              }
              const open = !!openGroups[section.category];
              return (
                <Collapsible
                  key={section.category}
                  open={open}
                  onOpenChange={(nextOpen) => setOpenGroups(nextOpen ? { [section.category]: true } : {})}
                >
                  <CollapsibleTrigger
                    className={internal
                      ? "group flex h-10 w-full items-center justify-between gap-2 rounded-xl px-2.5 text-nav font-bold text-sidebar-foreground transition-colors hover:bg-sidebar-accent/80 data-[state=open]:bg-sidebar-accent/60"
                      : "group flex h-9 w-full items-center justify-between rounded-lg px-2.5 text-label font-bold uppercase tracking-[0.04em] text-sidebar-muted transition-colors hover:bg-sidebar-accent/55 hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent/80 data-[state=open]:text-sidebar-accent-foreground"}
                  >
                    {internal
                      ? <span className="min-w-0 break-words text-left">{section.category}</span>
                      : <span>{section.category}</span>}
                    <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="ml-2 overflow-hidden border-l border-sidebar-border/70 pl-1.5 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                    <SidebarMenu className="gap-0.5 pb-1">
                      {section.items.map((item) => (
                        <SidebarMenuItem key={`${section.category}-${item.url}-${item.title}`}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive(section.category, item.url, item.title)}
                            className="h-9 rounded-xl px-2.5 text-nav font-semibold data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-sm hover:bg-sidebar-accent/80"
                          >
                            <NavLink to={item.url} end={item.url === "/admin"} activeClassName="text-primary-foreground font-semibold">
                              {!internal && <item.icon className="h-5 w-5 shrink-0" />}
                              <span>{item.title}</span>
                              {item.comingSoon && <ComingSoon />}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}

            {!internal && (
              <div className="mt-2 border-t border-sidebar-border/60 pt-2">
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="h-8 rounded-xl px-2.5 text-label">
                      <Link to="/" className="flex items-center gap-2 text-sidebar-muted hover:text-sidebar-accent-foreground">
                        <Globe className="h-4 w-4 shrink-0" />
                        <span>View Public Site</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </div>
            )}
          </div>
        )}
      </div>
    </Sidebar>
  );
}

/** "Coming soon" next to a menu item whose page isn't built yet (#73). Read as part of the link's name. */
function ComingSoon() {
  return (
    <span className="ml-auto shrink-0 rounded-full border border-current/30 px-1.5 py-px text-label font-semibold leading-tight opacity-90">
      <span className="sr-only"> </span>Coming soon
    </span>
  );
}
