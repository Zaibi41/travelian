import { useState } from "react";
import { Armchair, Baby, Check, ChevronDown, Minus, Plus, User, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface TravelersValue {
  adults: number;
  children: number;
  infants: number;
  cabin: string;
}

export const CABIN_CLASSES = ["Economy", "Premium Economy", "Business", "First"] as const;

export function formatTravelers(v: TravelersValue): string {
  const total = v.adults + v.children + v.infants;
  return `${total} Traveler${total > 1 ? "s" : ""}, ${v.cabin}`;
}

export function formatTravelerCount(v: TravelersValue): string {
  const total = v.adults + v.children + v.infants;
  return `${total} Traveler${total > 1 ? "s" : ""}`;
}

interface CabinMeta {
  label: string;
  icon: typeof Armchair;
  unselectedClass: string;
}

const cabinMeta: Record<string, CabinMeta> = {
  Economy: { label: "Economy", icon: Armchair, unselectedClass: "bg-muted/50 text-foreground hover:bg-muted" },
  "Premium Economy": { label: "Premium Economy", icon: Armchair, unselectedClass: "bg-accent/50 text-primary hover:bg-accent/70" },
  Business: { label: "Business", icon: Armchair, unselectedClass: "bg-teal-soft text-teal hover:bg-teal-soft/80" },
  First: { label: "First", icon: Armchair, unselectedClass: "bg-gold-light/60 text-gold hover:bg-gold-light/80" },
};

interface Props {
  value: TravelersValue;
  onChange: (v: TravelersValue) => void;
  className?: string;
  variant?: "compact" | "field" | "segmented";
  mode?: "combined" | "travelers" | "cabin";
  /** Where to anchor the dropdown. Defaults to start / left. */
  align?: "left" | "right" | "start" | "center" | "end";
  /** Which side of the trigger to open on. Defaults to bottom. */
  side?: "top" | "bottom";
}

export function TravelersClassPicker({
  value,
  onChange,
  className,
  variant = "field",
  mode = "combined",
  align = "start",
  side = "bottom",
}: Props) {
  const [open, setOpen] = useState(false);

  const effectiveAlign: "start" | "center" | "end" =
    align === "left" ? "start" : align === "right" ? "end" : align;

  const update = (patch: Partial<TravelersValue>) => onChange({ ...value, ...patch });

  const rows = [
    { label: "Adults", sub: "12+ years", key: "adults" as const, min: 1, icon: User, iconWrap: "bg-accent text-primary" },
    { label: "Children", sub: "2–11 years", key: "children" as const, min: 0, icon: Baby, iconWrap: "bg-teal-soft text-teal" },
    { label: "Infants", sub: "Under 2", key: "infants" as const, min: 0, icon: Baby, iconWrap: "bg-gold-light text-gold" },
  ];

  const triggerClass =
    variant === "segmented"
      ? "flex h-[30px] items-center gap-1.5 px-3 text-xs font-medium rounded-md border border-border/70 bg-card text-foreground shadow-sm transition-all hover:border-primary/25 hover:text-primary"
      : variant === "compact"
        ? "flex h-10 w-full items-center gap-2 rounded-xl bg-muted/40 px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        : "flex items-center gap-2 w-full h-11 bg-background border border-input rounded-xl px-3 text-sm text-left hover:border-primary/30 transition-colors";

  const cabinSection = (
    <div className={cn("grid grid-cols-2 gap-2.5")}>
      {CABIN_CLASSES.map((c) => {
        const meta = cabinMeta[c];
        const selected = value.cabin === c;
        const Icon = meta.icon;
        return (
          <button
            key={c}
            type="button"
            className={cn(
              "group relative flex min-h-[80px] flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-center transition-all",
              cn("border", meta.unselectedClass),
              selected ? "border-gold/60 ring-1 ring-gold/40" : "border-transparent",
            )}
            onClick={() => update({ cabin: c })}
            aria-pressed={selected}
            aria-label={`Select ${c} cabin`}
          >
            {selected && (
              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-primary">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            )}
            <Icon className="h-5 w-5 text-current" />
            <span className="text-xs font-bold leading-tight text-current">{meta.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(triggerClass, className)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          {mode === "cabin" ? (
            <Armchair
              className={cn(
                "shrink-0",
                variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4",
                variant === "segmented" ? "text-primary" : "text-muted-foreground",
              )}
            />
          ) : (
            <Users
              className={cn(
                "shrink-0",
                variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4",
                variant === "segmented" ? "text-primary" : "text-muted-foreground",
              )}
            />
          )}
          <span className="whitespace-nowrap flex-1 truncate">
            {mode === "travelers" ? formatTravelerCount(value) : mode === "cabin" ? value.cabin : formatTravelers(value)}
          </span>
          <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={effectiveAlign}
        side={side}
        sideOffset={8}
        collisionPadding={16}
        className={cn(
          "z-[1120] max-h-[82vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_80px_rgba(15,23,42,0.22)]",
          mode === "cabin"
            ? "w-[min(calc(100vw-2rem),320px)]"
            : mode === "travelers"
              ? "w-[min(calc(100vw-2rem),340px)]"
              : "w-[min(calc(100vw-2rem),380px)]",
        )}
      >
        {mode === "cabin" && (
          <div className="flex items-center justify-between pb-3">
            <p className="text-base font-black tracking-tight text-primary">Cabin Class</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground"
              aria-label="Close cabin class selector"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {mode !== "cabin" && (
          <div className="text-center">
            <p className="text-base font-black tracking-tight text-primary">Travelers</p>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">Select passengers for your trip</p>
          </div>
        )}

        {mode !== "cabin" && (
          <div className="mt-3.5 space-y-2">
            {rows.map((p) => (
              <div
                key={p.key}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 p-2.5"
              >
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", p.iconWrap)}>
                  <p.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">{p.label}</p>
                  <p className="text-xs font-medium text-muted-foreground">{p.sub}</p>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-accent/70 p-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      update({ [p.key]: Math.max(p.min, value[p.key] - 1) } as any);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:text-muted-foreground/40 disabled:hover:bg-transparent"
                    disabled={value[p.key] <= p.min}
                    aria-label={`Decrease ${p.label}`}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-5 text-center text-sm font-black tabular-nums text-foreground">{value[p.key]}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      update({ [p.key]: value[p.key] + 1 } as any);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-primary transition-colors hover:bg-background"
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
          <div className={cn(mode === "combined" && "mt-4 border-t pt-4")}>
            {mode === "combined" && <p className="mb-2.5 text-sm font-black text-foreground">Cabin Class</p>}
            {cabinSection}
          </div>
        )}

        <Button
          type="button"
          className="mt-3.5 h-10 w-full rounded-xl gradient-primary text-xs font-bold text-primary-foreground"
          onClick={() => setOpen(false)}
        >
          Done
        </Button>
      </PopoverContent>
    </Popover>
  );
}
