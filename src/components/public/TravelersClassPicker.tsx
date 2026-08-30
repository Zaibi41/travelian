import { type CSSProperties, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [position, setPosition] = useState({ top: 0, left: 0, width: 360, maxHeight: 360 });
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dropdownWidth = mode === "cabin" ? 300 : mode === "travelers" ? 380 : 420;

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const trigger = ref.current?.getBoundingClientRect();
      if (!trigger) return;

      const gap = 8;
      const viewportPadding = 12;
      const width = Math.min(dropdownWidth, window.innerWidth - viewportPadding * 2);
      const panelHeight = mode === "cabin" ? 300 : mode === "travelers" ? 330 : 520;
      const roomBelow = Math.max(120, window.innerHeight - trigger.bottom - gap - viewportPadding);
      const shouldOpenTop = side === "top";
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
    { label: "Adults", sub: "12+ years", key: "adults" as const, min: 1 },
    { label: "Children", sub: "2-11 years", key: "children" as const, min: 0 },
    { label: "Infants", sub: "Under 2", key: "infants" as const, min: 0 },
  ];

  const triggerClass =
    variant === "compact"
      ? "flex h-10 w-full items-center gap-2 rounded-xl bg-muted/40 px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
      : "flex items-center gap-2 w-full h-11 bg-background border border-input rounded-xl px-3 text-sm text-left hover:border-primary/30 transition-colors";

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
      >
        {mode !== "cabin" && (
          <div className="space-y-4">
            <p className="text-base font-black text-foreground">Travelers</p>
            <div className="space-y-3">
              {rows.map(p => (
                <div key={p.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-950">{p.label}</p>
                    <p className="mt-0.5 text-xs font-medium text-muted-foreground">{p.sub}</p>
                  </div>
                  <div className="grid grid-cols-[2.25rem_1.75rem_2.25rem] items-center gap-2">
                    <button
                      type="button"
                      onClick={() => update({ [p.key]: Math.max(p.min, value[p.key] - 1) } as any)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 disabled:shadow-none"
                      disabled={value[p.key] <= p.min}
                      aria-label={`Decrease ${p.label}`}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-center text-base font-black tabular-nums text-slate-950">{value[p.key]}</span>
                    <button
                      type="button"
                      onClick={() => update({ [p.key]: value[p.key] + 1 } as any)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 shadow-sm transition-colors hover:bg-slate-50"
                      aria-label={`Increase ${p.label}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {mode !== "travelers" && (
          <div className={cn(mode === "combined" && "mt-4 border-t pt-4")}>
            <p className="mb-3 text-base font-black text-foreground">Cabin Class</p>
            <div className="grid grid-cols-2 gap-2">
              {CABIN_CLASSES.map(c => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    "flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-center text-sm font-bold leading-snug transition-all",
                    value.cabin === c ? "bg-primary text-primary-foreground shadow-sm" : "bg-slate-50 text-muted-foreground hover:bg-slate-100 hover:text-foreground",
                  )}
                  onClick={() => update({ cabin: c })}
                >
                  {c}
                </button>
              ))}
            </div>
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
