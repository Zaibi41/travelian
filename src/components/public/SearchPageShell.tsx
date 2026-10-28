import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const SEARCH_PAGE_CONTAINER = "travelian-container";

export function SearchPageHero({ title, description, children, support, compact = false }: { title?: ReactNode; description?: string; children?: ReactNode; support?: ReactNode; compact?: boolean }) {
  return (
    <section className={cn("relative isolate bg-sidebar", compact ? "gradient-hero py-2" : "py-6")}>
      {!compact && <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />}
      <div className={cn(compact ? "px-4 md:px-6" : SEARCH_PAGE_CONTAINER, "relative")}>
        {title && <div className={cn("text-center", children && "mb-4 md:mb-5")}><h1 className="font-display text-xl sm:text-2xl md:text-[1.75rem] font-bold leading-7 sm:leading-8 md:leading-9 tracking-tight text-primary-foreground">{title}</h1>{description && <p className="mt-2 text-sm text-primary-foreground/75">{description}</p>}</div>}
        {children}
        {support && <div className="mt-4">{support}</div>}
      </div>
    </section>
  );
}

export function SearchCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("travelian-search-card relative z-10 w-full rounded-xl border border-border/70 bg-card shadow-card", className)}>{children}</div>;
}

export function PageSection({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("py-8 md:py-10", className)}><div className={SEARCH_PAGE_CONTAINER}>{children}</div></section>;
}

/** Shared responsive space; retain extra space added by multi-city legs until resize. */
export function SearchContent({ children, stable = true }: { children: ReactNode; stable?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [minimum, setMinimum] = useState<number>();
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !stable) return;
    const observer = new ResizeObserver(([entry]) => {
      const height = entry.borderBoxSize?.[0]?.blockSize ?? element.getBoundingClientRect().height;
      setMinimum(previous => Math.max(previous ?? 0, height));
    });
    let width = window.innerWidth;
    const reset = () => {
      if (window.innerWidth === width) return;
      width = window.innerWidth;
      setMinimum(undefined);
    };
    observer.observe(element);
    window.addEventListener("resize", reset);
    return () => { observer.disconnect(); window.removeEventListener("resize", reset); };
  }, [stable]);
  return <div ref={ref} className={stable ? "unified-search-content" : "p-5 space-y-4"} style={stable ? { minHeight: minimum } : undefined}>
    {children}
  </div>;
}
