import { cn } from "@/lib/utils";

export function SearchShortcuts({ label, options, value, onSelect }: {
  label: string;
  options: string[];
  value: string;
  onSelect: (value: string) => void;
}) {
  if (!options.length) return null;
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
