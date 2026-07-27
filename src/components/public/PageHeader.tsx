import type { ReactNode } from "react";

interface Props {
  title: string;
  tagline: string;
  eyebrow?: string;
  icon?: ReactNode;
  breadcrumb?: ReactNode;
}

export function PageHeader({ title, tagline, eyebrow, icon, breadcrumb }: Props) {
  return (
    <section className="relative isolate overflow-hidden gradient-hero py-10 md:py-12">
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/35 blur-3xl" aria-hidden="true" />
      <div className="absolute -right-24 top-6 h-72 w-72 rounded-full bg-gold/20 blur-3xl" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/20 to-transparent" aria-hidden="true" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {breadcrumb && <div className="mb-4 flex justify-center text-xs text-primary-foreground/70">{breadcrumb}</div>}
        {icon && (
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-gold ring-1 ring-white/15 backdrop-blur">
            {icon}
          </div>
        )}
        {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-gold">{eyebrow}</p>}
        <h1 className="text-3xl md:text-4xl font-black font-display text-primary-foreground tracking-tight">{title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-primary-foreground/78 text-sm md:text-base leading-7">{tagline}</p>
      </div>
    </section>
  );
}
