import { Search, MessagesSquare, CreditCard, TicketCheck } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Search or request",
    desc: "Search flights, hotels and packages, or send us your travel requirement.",
  },
  {
    icon: MessagesSquare,
    title: "Compare with support",
    desc: "Our consultants explain the fare options, rules and what is included.",
  },
  {
    icon: CreditCard,
    title: "Confirm & pay",
    desc: "Confirm your selection and pay through a supported secure payment option.",
  },
  {
    icon: TicketCheck,
    title: "Get your confirmation",
    desc: "Receive your ticket, hotel voucher or visa confirmation with support details.",
  },
];

export function HomeHowItWorks() {
  return (
    <section className="py-14 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

        <ol className="relative mt-10 grid gap-5 md:grid-cols-4">
          <div
            className="pointer-events-none absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block"
            aria-hidden="true"
          />
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="group relative rounded-2xl border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-hover"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-primary text-primary-foreground shadow-premium">
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="text-3xl font-black font-display leading-none text-muted/80 transition-colors group-hover:text-gold/40">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold font-display text-foreground">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
