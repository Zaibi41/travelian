import { useEffect, useRef, useState } from "react";
import { Users, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TravelersValue {
  adults: number;
  children: number;
  infants: number;
  cabin: string;
}

export const CABIN_CLASSES = ["Economy", "Premium Economy", "Business Class", "First Class"];

export function formatTravelers(v: TravelersValue): string {
  const total = v.adults + v.children + v.infants;
  return `${total} Traveler${total > 1 ? "s" : ""}, ${v.cabin}`;
}

interface Props {
  value: TravelersValue;
  onChange: (v: TravelersValue) => void;
  className?: string;
  variant?: "compact" | "field";
  /** Where to anchor the dropdown. Defaults to left. */
  align?: "left" | "right";
}

export function TravelersClassPicker({ value, onChange, className, variant = "field", align = "left" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const update = (patch: Partial<TravelersValue>) => onChange({ ...value, ...patch });

  const rows = [
    { label: "Adults", sub: "12+ years", key: "adults" as const, min: 1 },
    { label: "Children", sub: "2-11 years", key: "children" as const, min: 0 },
    { label: "Infants", sub: "Under 2", key: "infants" as const, min: 0 },
  ];

  const triggerClass =
    variant === "compact"
      ? "flex items-center gap-2 text-xs font-medium text-foreground bg-muted/40 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
      : "flex items-center gap-2 w-full h-11 bg-background border border-input rounded-xl px-3 text-sm text-left hover:border-primary/30 transition-colors";

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={triggerClass}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Users className={variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4 text-muted-foreground"} />
        <span className="whitespace-nowrap flex-1 truncate">{formatTravelers(value)}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <div
          className={cn(
            "absolute top-full mt-2 w-full min-w-[20rem] max-w-[calc(100vw-2rem)] bg-card border rounded-xl shadow-elevated p-4 z-[200]",
            align === "right" ? "right-0" : "left-0",
          )}
          role="dialog"
        >
          <div className="space-y-3">
            {rows.map(p => (
              <div key={p.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.label}</p>
                  <p className="text-[10px] text-muted-foreground">{p.sub}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => update({ [p.key]: Math.max(p.min, value[p.key] - 1) } as any)}
                    className="h-8 w-8 rounded-full border flex items-center justify-center text-sm hover:bg-muted disabled:opacity-40"
                    disabled={value[p.key] <= p.min}
                    aria-label={`Decrease ${p.label}`}
                  >−</button>
                  <span className="text-sm font-semibold w-5 text-center">{value[p.key]}</span>
                  <button
                    type="button"
                    onClick={() => update({ [p.key]: value[p.key] + 1 } as any)}
                    className="h-8 w-8 rounded-full border flex items-center justify-center text-sm hover:bg-muted"
                    aria-label={`Increase ${p.label}`}
                  >+</button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Cabin Class</p>
            <div className="grid grid-cols-2 gap-1.5">
              {CABIN_CLASSES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => update({ cabin: c })}
                  className={`text-xs px-2 py-2 rounded-md transition-all text-center ${
                    value.cabin === c ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >{c}</button>
              ))}
            </div>
          </div>
          <Button size="sm" className="w-full mt-3 gradient-primary text-primary-foreground" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      )}
    </div>
  );
}
