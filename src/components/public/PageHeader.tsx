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
    <section className="relative isolate overflow-hidden gradient-hero py-10 md:py-14">
      {/* Same premium dotted + glow treatment as the homepage hero */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, hsl(0 0% 100%) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="absolute -top-24 left-1/2 h-96 w-[38rem] -translate-x-1/2 rounded-full bg-primary/35 blur-3xl" />
        <div className="absolute -bottom-16 right-8 h-72 w-72 rounded-full bg-teal/20 blur-3xl" />
        <div className="absolute -bottom-24 left-0 h-64 w-64 rounded-full bg-gold/15 blur-3xl" />
      </div>

      <div className="travelian-container relative z-10">
        <div className={centered ? "text-center" : "text-left"}>
          {breadcrumb && (
            <div className={`mb-4 flex text-xs text-primary-foreground ${centered ? "justify-center" : ""}`}>{breadcrumb}</div>
          )}
          {icon && (
            <div
              className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-gold ring-1 ring-white/15 backdrop-blur ${
                centered ? "mx-auto" : ""
              }`}
            >
              {icon}
            </div>
          )}
          {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-gold">{eyebrow}</p>}
          <h1
            className={
              titleClassName
                || `text-2xl font-black font-display tracking-tight text-primary-foreground sm:text-3xl md:text-4xl ${
                  centered ? "mx-auto max-w-[46rem] text-balance" : ""
                }`
            }
          >
            {title}
          </h1>
          {tagline ? (
            <p
              className={`mt-3 max-w-2xl text-sm leading-7 text-primary-foreground md:text-base ${centered ? "mx-auto" : ""}`}
            >
              {tagline}
            </p>
          ) : null}
        </div>
        {children && <div className="relative mt-6 md:mt-8">{children}</div>}
      </div>
    </section>
  );
}
