import { PRODUCT_TABS } from "./product-navigation";
import { useNavigate } from "react-router-dom";



export function ProductTabs({ active, visibleIds, onSelect }: { active: string; visibleIds?: string[]; onSelect?: (id: string) => void }) {
  const navigate = useNavigate();
  return <div role="group" aria-label="Travelian products" className="grid grid-cols-2 sm:flex overflow-x-auto rounded-t-xl border-b border-border bg-muted/40">
    {PRODUCT_TABS.filter(tab => !visibleIds || visibleIds.includes(tab.id)).map(tab => (
      <button key={tab.id} type="button" aria-label={tab.label} aria-pressed={active === tab.id} onClick={() => onSelect ? onSelect(tab.id) : tab.id !== active && navigate(tab.href)} className={`flex min-h-12 min-w-0 sm:min-w-max flex-1 shrink-0 items-center justify-center gap-1.5 sm:gap-2 border-b-2 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${active === tab.id ? "border-primary bg-card text-primary" : "border-transparent text-muted-foreground hover:bg-card/60 hover:text-primary"}`}>
        <tab.icon className="h-4 w-4 shrink-0" aria-hidden="true" />{tab.label}
      </button>
    ))}
  </div>;
}
