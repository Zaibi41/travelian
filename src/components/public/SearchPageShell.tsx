import { makeRoomBelowField } from "@/hooks/use-below-field";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const SEARCH_PAGE_CONTAINER = "travelian-container";

export function SearchPageHero({ title, description, children, support, compact = false }: { title?: ReactNode; description?: string; children?: ReactNode; support?: ReactNode; compact?: boolean }) {
  return (
    <section className={cn("relative isolate", compact ? "bg-sidebar gradient-hero py-2" : "travelian-hero-background py-6")}>
      <div className={cn(compact ? "px-4 md:px-6" : SEARCH_PAGE_CONTAINER, "relative")}>
        {title && <div className={cn("text-center", children && "mb-4 md:mb-5")}><h1 className="font-display text-xl sm:text-2xl md:text-[1.75rem] font-bold leading-7 sm:leading-8 md:leading-9 tracking-tight text-primary-foreground">{title}</h1>{description && <p className="mt-2 text-sm text-primary-foreground/75">{description}</p>}</div>}
        {children}
        {support && <div className="mt-4">{support}</div>}
      </div>
    </section>
  );
}

export function SearchCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div onFocusCapture={event => {
    const field = event.target as HTMLElement;
    if (event.currentTarget.contains(field) && field.matches("input, select, textarea")) makeRoomBelowField(field);
  }} className={cn("travelian-search-card relative z-10 w-full rounded-xl border border-border/70 bg-card shadow-card", className)}>{children}</div>;
}

export function PageSection({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("py-8 md:py-10", className)}><div className={SEARCH_PAGE_CONTAINER}>{children}</div></section>;
}

/** Shared responsive baseline; active content grows and collapses in normal flow. */
export function SearchContent({ children, stable = true }: { children: ReactNode; stable?: boolean }) {
  return <div className={stable ? "unified-search-content" : "p-5 space-y-4"}>
    {children}
  </div>;
}
