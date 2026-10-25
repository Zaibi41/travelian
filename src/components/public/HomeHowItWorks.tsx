import { Search, MessagesSquare, CreditCard, TicketCheck } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Search or Request",
    desc: "Search flights, hotels or packages, or send us your travel requirement.",
  },
  {
    icon: MessagesSquare,
    title: "Compare with Support",
    desc: "We explain fare options, rules and what is included.",
  },
  {
    icon: CreditCard,
    title: "Confirm & Pay",
    desc: "Confirm your selection and pay through a supported secure payment option.",
  },
  {
    icon: TicketCheck,
    title: "Get Your Confirmation",
    desc: "Receive your ticket or booking voucher with support details.",
  },
];

export function HomeHowItWorks() {
  return (
    <section className="py-12 md:py-14">
      <div className="travelian-container ">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-accent-foreground">
            Simple process
          </span>
          <h2 className="mt-3 text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground">
            How Travelian works
          </h2>
          <p className="mt-2 text-sm md:text-base leading-7 text-muted-foreground">
            Four clear steps from your first search to a confirmed booking.
          </p>
        </div>

        <ol className="relative mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            className="pointer-events-none absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block"
            aria-hidden="true"
          />
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="group relative rounded-2xl border bg-card p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-hover"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-primary text-primary-foreground shadow-premium">
                  <s.icon className="h-4 w-4" />
                </div>
                <h3 className="min-w-0 flex-1 text-sm font-bold font-display text-foreground">{s.title}</h3>
                <span className="text-xl font-black font-display leading-none text-muted-foreground/30 transition-colors group-hover:text-gold/50">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="mt-3 text-sm leading-5 text-muted-foreground">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
