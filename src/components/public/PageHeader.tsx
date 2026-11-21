import type { ReactNode } from "react";

interface Props {
  title: string;
  tagline?: string;
  eyebrow?: string;
  icon?: ReactNode;
  breadcrumb?: ReactNode;
  children?: ReactNode;
  align?: "center" | "left";
  titleClassName?: string;
}

export function PageHeader({ title, tagline, eyebrow, icon, breadcrumb, children, align = "center", titleClassName }: Props) {
  const centered = align === "center";
  return (
    <section className="relative isolate travelian-hero-background py-6 md:py-8">
      <div className="travelian-container relative">
        <div className={centered ? "text-center" : "text-left"}>
          {breadcrumb && (
            <div className={`mb-3 flex text-xs text-primary-foreground/85 ${centered ? "justify-center" : ""}`}>{breadcrumb}</div>
          )}
          {icon && (
            <div
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-gold-on-dark ring-1 ring-white/15 ${
                centered ? "mx-auto" : ""
              }`}
            >
              {icon}
            </div>
          )}
          {eyebrow && <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gold-on-dark">{eyebrow}</p>}
          <h1
            className={
              titleClassName
                || `font-display text-xl font-bold leading-7 tracking-tight text-primary-foreground sm:text-2xl sm:leading-8 md:text-[1.75rem] md:leading-9 ${
                  centered ? "mx-auto max-w-[46rem] text-balance" : ""
                }`
            }
          >
            {title}
          </h1>
          {tagline ? (
            <p
              className={`mt-2 max-w-2xl text-sm leading-6 text-primary-foreground/85 ${centered ? "mx-auto" : ""}`}
            >
              {tagline}
            </p>
          ) : null}
        </div>
        {children && <div className="relative mt-5 md:mt-6">{children}</div>}
      </div>
    </section>
  );
}
