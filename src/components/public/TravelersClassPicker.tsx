import { useEffect, useRef, useState } from "react";
import { Armchair, ChevronDown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TravelersValue {
  adults: number;
  children: number;
  infants: number;
  cabin: string;
}

export const CABIN_CLASSES = ["Economy", "Premium Economy", "Business", "First"];

export function formatTravelers(v: TravelersValue): string {
  const total = v.adults + v.children + v.infants;
  return `${total} Traveler${total > 1 ? "s" : ""}, ${v.cabin}`;
}

export function formatTravelerCount(v: TravelersValue): string {
  const total = v.adults + v.children + v.infants;
  return `${total} Traveler${total > 1 ? "s" : ""}`;
}

interface Props {
  value: TravelersValue;
  onChange: (v: TravelersValue) => void;
  className?: string;
  variant?: "compact" | "field";
  mode?: "combined" | "travelers" | "cabin";
  /** Where to anchor the dropdown. Defaults to left. */
  align?: "left" | "right";
  /** Which side of the trigger to open on. Defaults to bottom. */
  side?: "top" | "bottom";
}

export function TravelersClassPicker({ value, onChange, className, variant = "field", mode = "combined", align = "left", side = "bottom" }: Props) {
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
      ? "flex h-8 items-center gap-1.5 rounded-lg bg-muted/40 px-[0.65rem] py-[0.3rem] text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
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
        {mode === "cabin" ? (
          <Armchair className={variant === "compact" ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4 shrink-0 text-muted-foreground"} />
        ) : (
          <Users className={variant === "compact" ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4 shrink-0 text-muted-foreground"} />
        )}
        <span className="whitespace-nowrap flex-1 truncate">
          {mode === "travelers" ? formatTravelerCount(value) : mode === "cabin" ? value.cabin : formatTravelers(value)}
        </span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <div
          className={cn(
            "absolute z-[200] max-h-[calc(100vh-7rem)] w-full max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border bg-card p-4 shadow-elevated",
            mode === "travelers" && "min-w-[20rem]",
            mode === "cabin" && "min-w-[12rem]",
            side === "top" ? "bottom-full mb-2" : "top-full mt-2",
            align === "right" ? "right-0" : "left-0",
          )}
          role="dialog"
        >
          {mode !== "cabin" && (
          <div className="space-y-3">
            {rows.map(p => (
              <div key={p.key} className="grid grid-cols-[1fr_auto] items-center gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{p.label}</p>
                  <p className="text-[10px] text-muted-foreground">{p.sub}</p>
                </div>
                <div className="grid grid-cols-[1.75rem_1.25rem_1.75rem] items-center gap-2">
                  <button
                    type="button"
                    onClick={() => update({ [p.key]: Math.max(p.min, value[p.key] - 1) } as any)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border text-xs hover:bg-muted disabled:opacity-40"
                    disabled={value[p.key] <= p.min}
                    aria-label={`Decrease ${p.label}`}
                  >−</button>
                  <span className="text-center text-xs font-semibold tabular-nums">{value[p.key]}</span>
                  <button
                    type="button"
                    onClick={() => update({ [p.key]: value[p.key] + 1 } as any)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border text-xs hover:bg-muted"
                    aria-label={`Increase ${p.label}`}
                  >+</button>
                </div>
              </div>
            ))}
          </div>
          )}
          {mode !== "travelers" && (
          <div className={cn(mode === "combined" && "mt-3 border-t pt-3")}>
            <p className="text-xs font-medium text-muted-foreground mb-2">Cabin Class</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {CABIN_CLASSES.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`rounded-md px-[0.3rem] py-[0.3rem] text-[11px] transition-all text-center ${
                    value.cabin === c ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => {
                    update({ cabin: c });
                    if (mode === "cabin") setOpen(false);
                  }}
                  >{c}</button>
              ))}
            </div>
          </div>
          )}
          <Button size="sm" className="mt-3 h-8 w-full rounded-lg gradient-primary text-xs text-primary-foreground" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      )}
    </div>
  );
}
