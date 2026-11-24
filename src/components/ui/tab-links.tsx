import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface TabLink {
  to: string;
  label: string;
}

/** Underlined page tabs. Each tab is its own URL (pages, not popups). */
export function TabLinks({ tabs, label }: { tabs: TabLink[]; label: string }) {
  // On a narrow screen the strip scrolls: keep the open tab in view (only the strip moves, never the page).
  const nav = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    const strip = nav.current;
    const active = strip?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!strip || !active) return;
    const left = active.offsetLeft - strip.offsetLeft;
    if (left < strip.scrollLeft || left + active.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollLeft = Math.max(0, left - (strip.clientWidth - active.offsetWidth) / 2);
    }
  }, [pathname]);
  return (
    <nav ref={nav} aria-label={label} className="-mx-1 overflow-x-auto border-b border-border">
      <ul className="flex min-w-max gap-1 px-1">
        {tabs.map(tab => (
          <li key={tab.to}>
            <NavLink
              to={tab.to}
              end
              className={({ isActive }) =>
                cn(
                  "-mb-px inline-flex h-control items-center whitespace-nowrap border-b-2 px-3 text-body font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "border-teal text-brand-navy" : "border-transparent text-muted-foreground hover:text-foreground",
                )
              }
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
