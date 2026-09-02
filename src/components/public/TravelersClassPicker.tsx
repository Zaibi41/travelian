import { type CSSProperties, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Armchair, Baby, Check, ChevronDown, Minus, Plus, User, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Economy: { label: "Economy", icon: Armchair, unselectedClass: "bg-slate-50 text-slate-600 hover:bg-slate-100" },
  "Premium Economy": { label: "Premium Economy", icon: Armchair, unselectedClass: "bg-accent/40 text-accent-foreground hover:bg-accent/60" },
  Business: { label: "Business", icon: Armchair, unselectedClass: "bg-blue-50 text-blue-900 hover:bg-blue-100" },
  First: { label: "First", icon: Armchair, unselectedClass: "bg-gold-light/60 text-gold-foreground hover:bg-gold-light/80" },
};

interface Props {
  value: TravelersValue;
  onChange: (v: TravelersValue) => void;
  className?: string;
  variant?: "compact" | "field" | "segmented";
  mode?: "combined" | "travelers" | "cabin";
  /** Where to anchor the dropdown. Defaults to left. */
  align?: "left" | "right";
  /** Which side of the trigger to open on. Defaults to bottom. */
  side?: "top" | "bottom";
}

export function TravelersClassPicker({ value, onChange, className, variant = "field", mode = "combined", align = "left", side = "bottom" }: Props) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 360, maxHeight: 360 });
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dropdownWidth = mode === "cabin" ? 340 : mode === "travelers" ? 380 : 420;

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const trigger = ref.current?.getBoundingClientRect();
      if (!trigger) return;

      const gap = 8;
      const viewportPadding = 12;
      const width = Math.min(dropdownWidth, window.innerWidth - viewportPadding * 2);
      const panelHeight = mode === "cabin" ? 320 : mode === "travelers" ? 330 : 620;
      const roomBelow = Math.max(120, window.innerHeight - trigger.bottom - gap - viewportPadding);
      const shouldOpenTop = side === "top" || (roomBelow < panelHeight && trigger.top - gap - viewportPadding > roomBelow);
      const top = shouldOpenTop
        ? Math.max(viewportPadding, trigger.top - Math.min(panelHeight, window.innerHeight - viewportPadding * 2) - gap)
        : Math.min(trigger.bottom + gap, window.innerHeight - viewportPadding - 120);
      const maxHeight = shouldOpenTop
        ? Math.min(panelHeight, Math.max(120, trigger.top - gap - viewportPadding))
        : Math.min(panelHeight, roomBelow);
      const preferredLeft = align === "right" ? trigger.right - width : trigger.left;
      const left = Math.min(Math.max(viewportPadding, preferredLeft), window.innerWidth - width - viewportPadding);

      setPosition({ top, left, width, maxHeight });
    };
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    updatePosition();
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, dropdownWidth, mode, open, side]);

  const update = (patch: Partial<TravelersValue>) => onChange({ ...value, ...patch });

  const rows = [
    { label: "Adults", sub: "12+ years", key: "adults" as const, min: 1, icon: User, iconWrap: "bg-accent text-primary" },
    { label: "Children", sub: "2–11 years", key: "children" as const, min: 0, icon: Baby, iconWrap: "bg-teal-soft text-teal" },
    { label: "Infants", sub: "Under 2", key: "infants" as const, min: 0, icon: Baby, iconWrap: "bg-gold-light text-gold" },
  ];

  const triggerClass =
    variant === "segmented"
      ? "flex h-[30px] items-center gap-1.5 px-3 text-xs font-medium rounded-md transition-all bg-primary text-primary-foreground shadow-sm"
      : variant === "compact"
        ? "flex h-10 w-full items-center gap-2 rounded-xl bg-muted/40 px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        : "flex items-center gap-2 w-full h-11 bg-background border border-input rounded-xl px-3 text-sm text-left hover:border-primary/30 transition-colors";

  const cabinSection = (
    <div className={cn("grid grid-cols-2 gap-2.5")}>
      {CABIN_CLASSES.map(c => {
        const meta = cabinMeta[c];
        const selected = value.cabin === c;
        const Icon = meta.icon;
        return (
          <button
            key={c}
            type="button"
            className={cn(
              "group relative flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-center transition-all",
              selected
                ? "bg-gradient-to-br from-primary to-[#1e3a8a] text-primary-foreground shadow-md"
                : cn("border border-transparent", meta.unselectedClass)
            )}
            onClick={() => update({ cabin: c })}
            aria-pressed={selected}
            aria-label={`Select ${c} cabin`}
          >
            {selected && (
              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </span>
            )}
            <Icon className={cn("h-6 w-6", selected ? "text-white" : "text-current")} />
            <span className={cn("text-sm font-bold leading-tight", selected ? "text-white" : "text-current")}>{meta.label}</span>
          </button>
        );
      })}
    </div>
  );

  const dropdownContent = open && typeof document !== "undefined" ? createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[1110] bg-slate-950/35 sm:hidden"
        aria-label="Close travelers and cabin picker"
        onClick={() => setOpen(false)}
      />
      <div
        ref={panelRef}
        className={cn(
          "fixed inset-x-3 bottom-3 z-[1120] max-h-[82vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 pb-5 shadow-[0_24px_80px_rgba(15,23,42,0.22)] sm:inset-auto sm:left-[var(--picker-left)] sm:top-[var(--picker-top)] sm:max-h-[var(--picker-max-height)] sm:w-[var(--picker-width)] sm:rounded-2xl sm:p-4",
        )}
        style={{
          "--picker-top": `${position.top}px`,
          "--picker-left": `${position.left}px`,
          "--picker-width": `${position.width}px`,
          "--picker-max-height": `${position.maxHeight}px`,
        } as CSSProperties}
        role="dialog"
        aria-modal="true"
      >
        {mode === "cabin" && (
          <div className="flex items-center justify-between pb-3">
            <p className="text-lg font-black tracking-tight text-primary">Cabin Class</p>
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

        {mode !== "cabin" && mode !== "travelers" && (
          <div className="text-center">
            <p className="text-lg font-black tracking-tight text-primary">Travelers</p>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">Select passengers for your trip</p>
          </div>
        )}

        {mode === "travelers" && (
          <div className="text-center">
            <p className="text-lg font-black tracking-tight text-primary">Travelers</p>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">Select passengers for your trip</p>
          </div>
        )}

        {mode !== "cabin" && mode !== "travelers" && (
          <div className="mt-4 space-y-2.5">
            {rows.map(p => (
              <div
                key={p.key}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 p-2.5"
              >
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", p.iconWrap)}>
                  <p.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">{p.label}</p>
                  <p className="text-xs font-medium text-muted-foreground">{p.sub}</p>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-accent/70 p-1">
                  <button
                    type="button"
                    onClick={() => update({ [p.key]: Math.max(p.min, value[p.key] - 1) } as any)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:text-muted-foreground/40 disabled:hover:bg-transparent"
                    disabled={value[p.key] <= p.min}
                    aria-label={`Decrease ${p.label}`}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-black tabular-nums text-foreground">{value[p.key]}</span>
                  <button
                    type="button"
                    onClick={() => update({ [p.key]: value[p.key] + 1 } as any)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-primary transition-colors hover:bg-background"
                    aria-label={`Increase ${p.label}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {mode === "travelers" && (
          <div className="mt-4 space-y-2.5">
            {rows.map(p => (
              <div
                key={p.key}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 p-2.5"
              >
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", p.iconWrap)}>
                  <p.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">{p.label}</p>
                  <p className="text-xs font-medium text-muted-foreground">{p.sub}</p>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-accent/70 p-1">
                  <button
                    type="button"
                    onClick={() => update({ [p.key]: Math.max(p.min, value[p.key] - 1) } as any)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:text-muted-foreground/40 disabled:hover:bg-transparent"
                    disabled={value[p.key] <= p.min}
                    aria-label={`Decrease ${p.label}`}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-black tabular-nums text-foreground">{value[p.key]}</span>
                  <button
                    type="button"
                    onClick={() => update({ [p.key]: value[p.key] + 1 } as any)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-primary transition-colors hover:bg-background"
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
            {mode === "combined" && <p className="mb-3 text-base font-black text-foreground">Cabin Class</p>}
            {cabinSection}
          </div>
        )}
        <Button className="mt-4 h-11 w-full rounded-xl gradient-primary text-sm font-bold text-primary-foreground" onClick={() => setOpen(false)}>
          Done
        </Button>
      </div>
    </>,
    document.body,
  ) : null;

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
      {dropdownContent}
    </div>
  );
}
