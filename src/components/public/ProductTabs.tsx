import { PRODUCT_TABS } from "./product-navigation";
import { useNavigate } from "react-router-dom";



export function ProductTabs({ active }: { active: string }) {
  const navigate = useNavigate();
  return <nav data-product-search-navigation aria-label="Product navigation"><div role="group" aria-label="Travelian products" className="grid grid-cols-2 sm:grid-cols-4 overflow-x-auto rounded-t-xl border-b border-border bg-muted/40">
    {PRODUCT_TABS.map(tab => (
      <button key={tab.id} type="button" aria-label={tab.label} aria-pressed={active === tab.id} aria-current={active === tab.id ? "page" : undefined} onClick={() => tab.id !== active && navigate(tab.href)} className={`flex min-h-12 min-w-0  flex-1 shrink-0 items-center justify-center gap-1.5 sm:gap-2 border-b-2 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${active === tab.id ? "border-primary bg-primary/5 text-primary" : "border-transparent text-muted-foreground hover:bg-card/60 hover:text-primary"}`}>
        <tab.icon className="h-4 w-4 shrink-0" aria-hidden="true" />{tab.label}
      </button>
    ))}
  </div></nav>;
}
