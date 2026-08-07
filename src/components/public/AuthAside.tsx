import { Plane, ShieldCheck, Star, Headphones, Lock } from "lucide-react";

interface AuthAsideProps {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
}

export function AuthAside({ eyebrow, title, description, points }: AuthAsideProps) {
  return (
    <div className="relative hidden min-h-[480px] flex-col justify-between overflow-hidden bg-primary p-8 text-primary-foreground md:flex">
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
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-foreground/15 ring-1 ring-primary-foreground/20">
            <Plane className="h-5 w-5 text-gold" />
          </div>
          <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">
            {eyebrow}
          </span>
        </div>
        <h2 className="mt-6 font-display text-3xl font-extrabold leading-tight lg:text-[2.1rem]">{title}</h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-primary-foreground/75">{description}</p>

        <ul className="mt-7 grid gap-3 text-sm text-primary-foreground/90">
          {points.map(item => (
            <li
              key={item}
              className="flex items-center gap-3 rounded-xl border border-primary-foreground/10 bg-primary-foreground/[0.07] px-3 py-2.5 backdrop-blur-sm"
            >
              <ShieldCheck className="h-4 w-4 shrink-0 text-gold" />
              <span className="leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-8 grid grid-cols-3 gap-3 border-t border-primary-foreground/15 pt-5">
        {[
          { icon: Lock, label: "Secure payments" },
          { icon: Headphones, label: "24/7 support" },
          { icon: Star, label: "Transparent fares" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1.5 text-center">
            <Icon className="h-4 w-4 text-gold" />
            <span className="text-[11px] font-medium leading-tight text-primary-foreground/70">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
