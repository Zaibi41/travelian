import { Headphones, Plane, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const reasons = [
  {
    icon: Wallet,
    title: "Transparent Fares",
    desc: "Clear baggage, taxes and fare conditions.",
  },
  {
    icon: Plane,
    title: "Multiple Flight Sources",
    desc: "Live and group fare options in one search experience.",
  },
  {
    icon: Headphones,
    title: "Human Support",
    desc: "Travelian assistance before and after booking.",
  },
];

export function HomeWhyBook() {
  return (
    <section className="py-10 md:pt-6 md:pb-10">
      <div className="travelian-container ">
        <div className="max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground">
            Why book with Travelian?
          </h2>
          <p className="mt-2 text-sm md:text-base leading-7 text-muted-foreground">
            Understand your travel options before you book.
          </p>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {reasons.map((r) => (
            <Card
              key={r.title}
              className="rounded-xl border-border shadow-sm transition-colors hover:border-primary/30"
            >
              <CardContent className="p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-soft text-teal ring-1 ring-teal/15">
                  <r.icon aria-hidden="true" className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-base font-bold font-display text-foreground">{r.title}</h3>
                <p className="mt-1.5 text-sm leading-5 text-muted-foreground">{r.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
