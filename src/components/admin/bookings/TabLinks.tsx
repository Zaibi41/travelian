import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface TabLink {
  to: string;
  label: string;
}

/** Underlined page tabs. Each tab is its own URL (pages, not popups). */
export function TabLinks({ tabs, label }: { tabs: TabLink[]; label: string }) {
  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto border-b border-border">
      <ul className="flex min-w-max gap-1 px-1">
        {tabs.map(tab => (
          <li key={tab.to}>
            <NavLink
              to={tab.to}
              end
              className={({ isActive }) =>
                cn(
                  "-mb-px inline-flex h-control items-center whitespace-nowrap border-b-2 px-3 text-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
