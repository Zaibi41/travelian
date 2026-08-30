import { useEffect, useRef, useState } from "react";
import { Armchair, ChevronDown, Minus, Plus, Users } from "lucide-react";
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
    const handlePointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const update = (patch: Partial<TravelersValue>) => onChange({ ...value, ...patch });

  const rows = [
    { label: "Adults", sub: "12+ years", key: "adults" as const, min: 1 },
    { label: "Children", sub: "2-11 years", key: "children" as const, min: 0 },
    { label: "Infants", sub: "Under 2", key: "infants" as const, min: 0 },
  ];

  const triggerClass =
    variant === "compact"
      ? "flex h-9 items-center gap-2 rounded-lg bg-muted/40 px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
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
        <>
        <button
          type="button"
          className="fixed inset-0 z-[190] bg-slate-950/35 sm:hidden"
          aria-label="Close travelers and cabin picker"
          onClick={() => setOpen(false)}
        />
        <div
          className={cn(
            "fixed inset-x-3 bottom-3 z-[200] max-h-[85vh] overflow-y-auto rounded-2xl border bg-card p-4 pb-5 shadow-elevated sm:absolute sm:inset-x-auto sm:bottom-auto sm:max-h-[calc(100vh-7rem)] sm:w-full sm:max-w-[calc(100vw-2rem)] sm:rounded-xl sm:pb-4",
            mode === "travelers" && "sm:min-w-[22rem]",
            mode === "cabin" && "sm:min-w-[14rem]",
            side === "top" ? "sm:bottom-full sm:mb-2" : "sm:top-full sm:mt-2",
            align === "right" ? "sm:right-0" : "sm:left-0",
          )}
          role="dialog"
        >
          {mode !== "cabin" && (
          <div className="space-y-3.5">
            <p className="text-sm font-semibold text-foreground">Travelers</p>
            {rows.map(p => (
              <div key={p.key} className="grid grid-cols-[1fr_auto] items-center gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{p.label}</p>
                  <p className="text-[10px] text-muted-foreground">{p.sub}</p>
                </div>
                <div className="grid grid-cols-[2rem_1.5rem_2rem] items-center gap-2">
                  <button
                    type="button"
                    onClick={() => update({ [p.key]: Math.max(p.min, value[p.key] - 1) } as any)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border hover:bg-muted disabled:opacity-40"
                    disabled={value[p.key] <= p.min}
                    aria-label={`Decrease ${p.label}`}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-center text-sm font-semibold tabular-nums">{value[p.key]}</span>
                  <button
                    type="button"
                    onClick={() => update({ [p.key]: value[p.key] + 1 } as any)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border hover:bg-muted"
                    aria-label={`Increase ${p.label}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
          {mode !== "travelers" && (
          <div className={cn(mode === "combined" && "mt-3 border-t pt-3")}>
            <p className="mb-2 text-sm font-semibold text-foreground">Cabin Class</p>
            <div className="grid grid-cols-2 gap-2">
              {CABIN_CLASSES.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`flex h-12 items-center justify-center rounded-lg px-2 py-2 text-center text-xs font-semibold leading-tight transition-all ${
                    value.cabin === c ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted"
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
          <Button size="sm" className="mt-4 w-full gradient-primary text-primary-foreground" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
        </>
      )}
    </div>
  );
}
