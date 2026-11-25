import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

/** Quick picks above a search form. variant "pill" (public Hotels, as the Flights and Group Ticketing tabs): rounded
 *  chips with a location icon, a heading in small capitals, swiping sideways on phones. "plain": the earlier look. */
export function SearchShortcuts({ label, options, value, onSelect, variant = "plain" }: {
  label: string;
  options: string[];
  value: string;
  onSelect: (value: string) => void;
  variant?: "plain" | "pill";
}) {
  if (!options.length) return null;
  if (variant === "pill") {
    return <div role="group" aria-label={label} className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
      <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-muted-foreground sm:mr-1">{label}</span>
      <div className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-0.5 scrollbar-hide sm:flex-1 sm:flex-wrap sm:pb-0">
        {options.map(option => {
          const on = value.toLowerCase() === option.toLowerCase();
          return <button key={option} type="button" aria-pressed={on} onClick={() => onSelect(option)} className={cn(
            "inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:min-h-9",
            on ? "border-2 border-primary bg-primary/5 font-bold text-primary" : "border-border bg-card font-semibold text-foreground hover:border-primary/40 active:bg-primary/5",
          )}><MapPin aria-hidden="true" className={cn("h-3.5 w-3.5", on ? "text-primary" : "text-muted-foreground")} />{option}</button>;
        })}
      </div>
    </div>;
  }
  return <div role="group" aria-label={label} className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
    <span className="shrink-0 text-xs font-medium text-muted-foreground">{label}:</span>
    <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-0.5 sm:flex-1 sm:pb-0">
      {options.map(option => <button key={option} type="button" aria-pressed={value.toLowerCase() === option.toLowerCase()}
        onClick={() => onSelect(option)} className={cn(
          "min-h-8 shrink-0 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:min-h-7",
          value.toLowerCase() === option.toLowerCase() ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/30 text-muted-foreground hover:border-primary/30 hover:bg-muted hover:text-primary",
        )}>{option}</button>)}
    </div>
  </div>;
}
