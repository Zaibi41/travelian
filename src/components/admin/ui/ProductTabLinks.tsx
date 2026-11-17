import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { productTabClass } from "./product-tabs";

export interface ProductTabLink {
  to: string;
  label: string;
  icon?: LucideIcon;
}

/** Page tabs in the Search product tabs' style (icon, equal widths, blue active tab). Each tab is its own URL;
 * the row scrolls sideways when the tabs don't fit. */
export function ProductTabLinks({ tabs, label }: { tabs: ProductTabLink[]; label: string }) {
  return (
    <nav aria-label={label}>
      <ul className="flex overflow-x-auto rounded-t-xl border-b border-border bg-muted/40">
        {tabs.map(tab => (
          <li key={tab.to} className="flex min-w-max flex-1">
            <NavLink to={tab.to} end className={({ isActive }) => cn(productTabClass(isActive), "w-full whitespace-nowrap")}>
              {tab.icon && <tab.icon data-tab-icon className="h-4 w-4 shrink-0" aria-hidden="true" />}{tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
