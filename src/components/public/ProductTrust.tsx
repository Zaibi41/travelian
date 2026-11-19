import { BadgeCheck, Headphones, Plane, Shield } from "lucide-react";

const productValues = {
  flights: "Live + Group Fares",
  "group-ticketing": "Fixed Group Inventory",
  hotels: "Hotel Booking Assistance",
  umrah: "Custom + Ready Packages",
} as const;

type Product = keyof typeof productValues;

export function ProductValuePills({ product }: { product: Product }) {
  const values = [
    { icon: Shield, label: "Secure Payments" },
    { icon: Headphones, label: "WhatsApp Support" },
    { icon: Plane, label: productValues[product] },
  ];
  return (
    <ul aria-label="Travelian value highlights" className="flex flex-wrap items-center justify-center gap-2">
      {values.map(value => (
        <li key={value.label} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1.5 text-xs font-medium text-primary-foreground ring-1 ring-white/15 sm:text-xs">
          <value.icon aria-hidden="true" className="h-3.5 w-3.5 text-gold" />
          {value.label}
        </li>
      ))}
    </ul>
  );
}

const trustItems = [
  { icon: BadgeCheck, title: "Registered Travel Company", description: "Operating from Johar Town, Lahore." },
  { icon: Shield, title: "Documented Booking", description: "Payment and booking details in writing." },
  { icon: Headphones, title: "Human Support", description: "Help by WhatsApp and phone." },
];

export function TravelianTrustStrip() {
  return (
    <section aria-label="Booking confidence" className="w-full border-b bg-card py-3 sm:py-4">
      <div className="travelian-container">
        <ul className="m-0 grid w-full list-none grid-cols-1 gap-3 p-0 md:grid-cols-3 md:gap-4">
          {trustItems.map(item => (
            <li key={item.title} className="flex min-w-0 justify-start text-left md:justify-center">
              <div className="flex w-fit min-w-0 max-w-full items-start gap-2.5">
                <item.icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground sm:text-sm">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
