import { Plane, ShieldCheck, Star, Headphones, Lock } from "lucide-react";

interface AuthAsideProps {
  eyebrow: string;
  title: string;
  description: string;
  points?: string[];
  variant?: "default" | "minimal";
}

export function AuthAside({ eyebrow, title, description, points = [], variant = "default" }: AuthAsideProps) {
  if (variant === "minimal") {
    return (
      <aside className="relative hidden overflow-hidden bg-primary px-9 py-12 text-primary-foreground lg:flex lg:flex-col lg:justify-center">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden="true" style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
        <div className="relative">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary-foreground/70">{eyebrow}</p>
          <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-4 max-w-xs text-sm leading-7 text-primary-foreground/80">{description}</p>
        </div>
      </aside>
    );
  }
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-6 sm:p-7 md:p-8 text-primary-foreground md:flex md:min-h-[420px] lg:min-h-[480px]">
      {/* layered ambience */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-16 -top-20 h-72 w-72 rounded-full bg-teal/25 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-gold/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
      </div>

      <div className="relative">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-primary-foreground/15 ring-1 ring-primary-foreground/20">
            <Plane className="h-4 w-4 sm:h-5 sm:w-5 text-gold" />
          </div>
          <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">
            {eyebrow}
          </span>
        </div>
        <h2 className="mt-5 sm:mt-6 font-display text-2xl sm:text-3xl font-extrabold leading-tight lg:text-[2.1rem]">{title}</h2>
        <p className="mt-2.5 sm:mt-3 max-w-sm text-xs sm:text-sm leading-relaxed text-primary-foreground/75">{description}</p>

        <ul className="mt-5 sm:mt-6 md:mt-7 grid gap-2.5 sm:gap-3 text-xs sm:text-sm text-primary-foreground/90">
          {points.map(item => (
            <li
              key={item}
              className="flex items-center gap-2.5 sm:gap-3 rounded-xl border border-primary-foreground/10 bg-primary-foreground/[0.07] px-2.5 sm:px-3 py-2 sm:py-2.5 backdrop-blur-sm"
            >
              <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-gold" />
              <span className="text-[11px] sm:text-sm leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-6 sm:mt-7 md:mt-8 grid grid-cols-3 gap-2.5 sm:gap-3 border-t border-primary-foreground/15 pt-4 sm:pt-5">
        {[
          { icon: Lock, label: "Secure payments" },
          { icon: Headphones, label: "24/7 support" },
          { icon: Star, label: "Transparent fares" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1 sm:gap-1.5 text-center">
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gold" />
            <span className="text-[10px] sm:text-[11px] font-medium leading-tight text-primary-foreground/70">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
