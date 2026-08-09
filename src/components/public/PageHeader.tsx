import type { ReactNode } from "react";

interface Props {
  title: string;
  tagline: string;
  eyebrow?: string;
  icon?: ReactNode;
  breadcrumb?: ReactNode;
  children?: ReactNode;
  align?: "center" | "left";
}

export function PageHeader({ title, tagline, eyebrow, icon, breadcrumb, children, align = "center" }: Props) {
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={centered ? "text-center" : "text-left"}>
          {breadcrumb && (
            <div className={`mb-4 flex text-xs text-primary-foreground/70 ${centered ? "justify-center" : ""}`}>{breadcrumb}</div>
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
          <h1 className="text-2xl md:text-4xl font-black font-display text-primary-foreground tracking-tight">{title}</h1>
          <p
            className={`mt-3 max-w-2xl text-primary-foreground/80 text-sm md:text-base leading-7 ${centered ? "mx-auto" : ""}`}
          >
            {tagline}
          </p>
        </div>
        {children && <div className="relative mt-6 md:mt-8">{children}</div>}
      </div>
    </section>
  );
}
