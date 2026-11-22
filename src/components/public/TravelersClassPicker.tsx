import { useState } from "react";
import { Armchair, Check, ChevronDown, Minus, Plus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface TravelersValue {
  adults: number;
  children: number;
  infants: number;
  cabin: string;
}

const MAX_TRAVELERS = 9;

export const CABIN_CLASSES = ["Economy", "Premium Economy", "Business", "First"] as const;

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
  variant?: "compact" | "field" | "segmented";
  mode?: "combined" | "travelers" | "cabin";
  /** Where to anchor the dropdown. Defaults to start / left. */
  align?: "left" | "right" | "start" | "center" | "end";
  /** Which side of the trigger to open on. Defaults to bottom. */
  side?: "top" | "bottom";
  /** Inside a modal (Modify Search, #114): open above the field when there is more room there, so every row and the
   *  Done button stay on screen. */
  fit?: boolean;
}

export function TravelersClassPicker({
  value,
  onChange,
  className,
  variant = "field",
  mode = "combined",
  align = "start",
  side = "bottom",
  fit = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const total = value.adults + value.children + value.infants;

  const effectiveAlign: "start" | "center" | "end" =
    align === "left" ? "start" : align === "right" ? "end" : align;

  const update = (patch: Partial<TravelersValue>) => onChange({ ...value, ...patch });

  const rows = [
    { label: "Adults", sub: "12+ years", key: "adults" as const, min: Math.max(1, value.infants), max: Infinity },
    { label: "Children", sub: "2–11 years", key: "children" as const, min: 0, max: Infinity },
    { label: "Infants", sub: "Under 2 years", key: "infants" as const, min: 0, max: value.adults },
  ];

  const triggerClass =
    variant === "segmented"
      ? "flex h-9 sm:h-[30px] items-center gap-1.5 px-3 text-xs font-medium rounded-md border border-border/70 bg-card text-foreground shadow-sm transition-all hover:border-primary/25 hover:text-primary"
      : variant === "compact"
        ? "flex h-10 w-full items-center gap-2 rounded-xl bg-muted/40 px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        : "flex items-center gap-2 w-full h-11 bg-background border border-input rounded-xl px-3 text-sm text-left hover:border-primary/30 transition-colors";

  const cabinSection = (
    <div className="space-y-1" role="group" aria-label="Cabin Class">
      {CABIN_CLASSES.map((cabin) => (
        <button
          key={cabin}
          type="button"
          className={cn(
            "flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
            value.cabin === cabin ? "bg-accent text-primary" : "text-foreground hover:bg-muted/60",
          )}
          onClick={() => update({ cabin })}
          aria-pressed={value.cabin === cabin}
          aria-label={`Select ${cabin} cabin`}
        >
          <span className="flex h-4 w-4 shrink-0 items-center justify-center">
            {value.cabin === cabin && <Check className="h-4 w-4" aria-hidden="true" />}
          </span>
          {cabin}
        </button>
      ))}
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
        aria-label={mode === "cabin" ? "Cabin Class" : "Travelers"}
        align={effectiveAlign}
        side={side}
        fit={fit}
        sideOffset={8}
        collisionPadding={16}
        className={cn(
          "z-[1120] flex max-h-[min(82dvh,var(--radix-popover-content-available-height))] flex-col overflow-hidden rounded-xl border border-border bg-white p-3 shadow-md",
          mode === "cabin"
            ? "w-[min(calc(100vw-2rem),300px)]"
            : "w-[min(calc(100vw-2rem),320px)]",
        )}
      >
        <div className="mb-1 flex shrink-0 items-center justify-between">
          <p className="text-sm font-semibold text-foreground">{mode === "cabin" ? "Cabin Class" : "Travelers"}</p>
          <button type="button" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" aria-label={`Close ${mode === "cabin" ? "cabin class" : "travelers"} selector`}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto">
          {mode !== "cabin" && (
            <div className="divide-y divide-border/60">
              {rows.map((passenger) => (
                <div key={passenger.key} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{passenger.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{passenger.sub}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" disabled={value[passenger.key] <= passenger.min} aria-label={`Decrease ${passenger.label}`} onClick={() => update({ [passenger.key]: Math.max(passenger.min, value[passenger.key] - 1) })} className="flex h-9 w-9 items-center justify-center rounded-md border border-primary/20 text-primary transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:border-border disabled:bg-muted/40 disabled:text-muted-foreground">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold tabular-nums">{value[passenger.key]}</span>
                    <button type="button" disabled={total >= MAX_TRAVELERS || value[passenger.key] >= passenger.max} aria-label={`Increase ${passenger.label}`} onClick={() => { if (total < MAX_TRAVELERS) update({ [passenger.key]: Math.min(passenger.max, value[passenger.key] + 1) }); }} className="flex h-9 w-9 items-center justify-center rounded-md border border-primary/20 text-primary transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:border-border disabled:bg-muted/40 disabled:text-muted-foreground">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {mode !== "travelers" && (
            <div className={cn(mode === "combined" && "mt-2 border-t pt-3")}>
              {mode === "combined" && <p className="mb-2 text-sm font-semibold">Cabin Class</p>}
              {cabinSection}
            </div>
          )}
        </div>

        {mode !== "cabin" && <div className="mt-3 flex shrink-0 items-center justify-between border-t border-border/60 pt-2 text-xs text-muted-foreground">
          <span>Total passengers</span>
          <span role="status" aria-label="Passenger count" aria-live="polite" aria-atomic="true" className="font-semibold tabular-nums text-foreground">{total}/{MAX_TRAVELERS}</span>
        </div>}
        <Button
          type="button"
          className="mt-3 h-10 w-full shrink-0 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
          onClick={() => setOpen(false)}
        >
          Done
        </Button>
      </PopoverContent>
    </Popover>
  );
}
