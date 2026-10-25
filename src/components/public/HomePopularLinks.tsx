import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const groups = [
  {
    title: "Flights to top cities from Pakistan",
    items: ["Jeddah", "Riyadh", "Dubai", "Dammam", "Al Madinah", "Muscat", "Manama", "Sharjah", "Abu Dhabi", "Kuwait City", "Doha", "Istanbul"],
    href: (name: string) => `/flights-search?to=${encodeURIComponent(name)}`,
    label: (name: string) => `Flights to ${name}`,
  },
  {
    title: "Flights to top countries from Pakistan",
    items: ["Saudi Arabia", "United Arab Emirates", "Oman", "Bahrain", "Kuwait", "Qatar", "Turkey", "United Kingdom", "Azerbaijan", "Malaysia", "China", "United States"],
    href: (name: string) => `/flights-search?destination=${encodeURIComponent(name)}`,
    label: (name: string) => `Flights to ${name}`,
  },
  {
    title: "Hotels in top cities",
    items: ["Lahore", "Karachi", "Islamabad", "Murree", "Skardu", "Multan", "Makkah", "Al Madinah", "Dubai", "Baku", "Istanbul", "Kuala Lumpur", "Bangkok", "Doha", "Muscat", "Riyadh"],
    href: (name: string) => `/hotels-search?location=${encodeURIComponent(name)}`,
    label: (name: string) => `Hotels in ${name}`,
  },
  {
    title: "Hotels in top countries",
    items: ["Saudi Arabia", "United Arab Emirates", "Azerbaijan", "Turkey", "Malaysia", "Thailand", "Indonesia", "Qatar", "United States", "United Kingdom", "Uzbekistan", "Sri Lanka", "Bahrain", "Vietnam", "Spain", "Oman"],
    href: (name: string) => `/hotels-search?country=${encodeURIComponent(name)}`,
    label: (name: string) => `Hotels in ${name}`,
  },
];

export function HomePopularLinks() {
  return (
    <section className="py-12 md:py-14">
      <div className="travelian-container ">
        <div className="mx-auto mb-7 max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Explore popular flights and hotels with Travelian
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Quick links to popular flight routes and hotel destinations from Pakistan.
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {groups.map((group, index) => (
            <AccordionItem key={group.title} value={`popular-${index}`} className="rounded-2xl border bg-card px-4 shadow-card">
              <AccordionTrigger className="text-left text-base font-bold text-foreground hover:no-underline">
                {group.title}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-2 pb-3 sm:grid-cols-2 lg:grid-cols-4">
                  {group.items.map((item) => (
                    <Link
                      key={item}
                      to={group.href(item)}
                      className="truncate rounded-xl bg-muted/50 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                    >
                      {group.label(item)}
                    </Link>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
