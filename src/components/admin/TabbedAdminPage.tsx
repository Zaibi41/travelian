import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Inside a tabbed page the page title is the h1; each tab's own title becomes an h2 (one h1 per page). */
const EmbeddedContext = createContext(false);

/** A page's title: h1 on its own; inside a tabbed page an h2 at section size, under the page's own h1. */
export function PageHeading({ className = "", children }: { className?: string; children: ReactNode }) {
  const embedded = useContext(EmbeddedContext);
  return embedded
    ? <h2 className={className.replace(/\btext-page-title\b/, "text-section")}>{children}</h2>
    : <h1 className={className}>{children}</h1>;
}

export interface AdminTab {
  /** The `?tab=` value. */
  id: string;
  label: string;
  /** Rendered only while the tab is open. */
  render: () => ReactNode;
}

/** Path of one tab: the first tab is the page's own URL (no `?tab=`). */
export function adminTabPath(basePath: string, tabs: Pick<AdminTab, "id">[], id: string) {
  return id === tabs[0]?.id ? basePath : `${basePath}?tab=${encodeURIComponent(id)}`;
}

/** The open tab from `?tab=`; an unknown or missing value opens the first tab. */
export function useAdminTab(tabs: Pick<AdminTab, "id">[]) {
  const [params] = useSearchParams();
  const requested = params.get("tab");
  return tabs.find(tab => tab.id === requested)?.id ?? tabs[0]?.id;
}

/**
 * A menu page made of tabs (Pricing, Integrations, Users, Website, Logs). The open tab lives in the URL (`?tab=`),
 * so refresh, Back and shared links open the same tab.
 */
export function TabbedAdminPage({ title, basePath, tabs, actions, label }: {
  title: string;
  basePath: string;
  tabs: AdminTab[];
  /** Buttons on the right of the title (e.g. Bookings → New Booking). */
  actions?: ReactNode;
  /** Accessible name of the tab strip; defaults to the title. */
  label?: string;
}) {
  const activeId = useAdminTab(tabs);
  const active = tabs.find(tab => tab.id === activeId) ?? tabs[0];
  return (
    <div className="flex min-w-0 flex-col gap-section-gap animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-page-title font-bold text-foreground">{title}</h1>
        {actions}
      </div>
      {tabs.length > 1 && <QueryTabStrip label={label ?? title} basePath={basePath} tabs={tabs} activeId={active.id} />}
      <EmbeddedContext.Provider value={true}>
        <div className="min-w-0" role={tabs.length > 1 ? "tabpanel" : undefined} aria-label={tabs.length > 1 ? active.label : undefined}>
          {active.render()}
        </div>
      </EmbeddedContext.Provider>
    </div>
  );
}

/** Underlined tabs in the shared page-tab style (src/components/ui/tab-links.tsx), selected by `?tab=`. */
function QueryTabStrip({ label, basePath, tabs, activeId }: { label: string; basePath: string; tabs: AdminTab[]; activeId: string }) {
  const nav = useRef<HTMLElement>(null);
  const { search } = useLocation();
  useEffect(() => {
    // On a narrow screen the strip scrolls: keep the open tab in view.
    const strip = nav.current;
    const current = strip?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!strip || !current) return;
    const left = current.offsetLeft - strip.offsetLeft;
    if (left < strip.scrollLeft || left + current.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollLeft = Math.max(0, left - (strip.clientWidth - current.offsetWidth) / 2);
    }
  }, [search]);
  return (
    <nav ref={nav} aria-label={label} className="-mx-1 overflow-x-auto border-b border-border">
      <ul className="flex min-w-max gap-1 px-1">
        {tabs.map(tab => {
          const isActive = tab.id === activeId;
          return (
            <li key={tab.id}>
              <Link
                to={adminTabPath(basePath, tabs, tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-control min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-body font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "border-teal text-brand-navy" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
