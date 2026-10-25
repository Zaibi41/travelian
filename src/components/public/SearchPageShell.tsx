import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const SEARCH_PAGE_CONTAINER = "mx-auto w-full px-4 sm:px-6 lg:px-8";

export function SearchPageHero({ title, description, children, support, compact = false }: { title?: ReactNode; description?: string; children?: ReactNode; support?: ReactNode; compact?: boolean }) {
  return (
    <section className={cn("relative isolate bg-sidebar", compact ? "gradient-hero py-2" : "py-8 md:py-10")}>
      {!compact && <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />}
      <div className={cn(compact ? "px-4 md:px-6" : SEARCH_PAGE_CONTAINER, "relative")}>
        {title && <div className={cn("text-center", children && "mb-5 md:mb-7")}><h1 className="font-display text-[1.75rem] font-bold leading-tight tracking-tight text-primary-foreground">{title}</h1>{description && <p className="mt-2 text-sm text-primary-foreground/75">{description}</p>}</div>}
        {children}
        {support && <div className="mt-6">{support}</div>}
      </div>
    </section>
  );
}

export function SearchCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("relative z-10 w-full rounded-xl border border-border/70 bg-card shadow-card", className)}>{children}</div>;
}

export function PageSection({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("py-8 md:py-10", className)}><div className={SEARCH_PAGE_CONTAINER}>{children}</div></section>;
}
