import { Check, Clock, Hotel, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/public/PageHeader";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { useAdmin } from "@/contexts/AdminStore";
import { isPublishedUmrahPackage } from "@/lib/package-availability";

const timeline = [
  { step: "Choose Package", desc: "Select an active Travelian Umrah package once inventory is published." },
  { step: "Submit Documents", desc: "Passport, photo, CNIC and required visa documents." },
  { step: "Visa Processing", desc: "Processing timeline is confirmed per package." },
  { step: "Travel", desc: "Travel with Travelian support." },
];

const whatsappBase = "https://wa.me/923244440014";
const siteBase = "https://www.travelian.pk";

export default function PublicPackagesPage() {
  const { packages } = useAdmin();
  const activePackages = packages.filter(isPublishedUmrahPackage);

  return (
    <div>
      <PageHeader title="Umrah Packages" tagline="Carefully managed Umrah packages from Travelian inventory" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {activePackages.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center shadow-card">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-bold text-foreground">No Umrah packages are published right now</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
              Travelian only shows active packages from admin inventory. Contact our team for the latest Umrah availability and custom package options.
            </p>
            <a
              href={`${whatsappBase}?text=${encodeURIComponent("Hello Travelian, please share the latest Umrah package availability.")}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button className="mt-5 rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a]">
                <WhatsAppIcon className="mr-2 h-4 w-4" /> Ask on WhatsApp
              </Button>
            </a>
          </div>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {activePackages.map((item) => (
              <Card key={item.packageId} className="overflow-hidden border-0 shadow-card">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="h-52 w-full object-cover" />
                ) : (
                  <div className="flex h-52 items-center justify-center bg-primary/10">
                    <Package className="h-12 w-12 text-primary" />
                  </div>
                )}
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge className="mb-2 capitalize">{item.packageType || "Umrah"}</Badge>
                      <h2 className="text-lg font-bold text-foreground">{item.name}</h2>
                      <p className="text-sm text-muted-foreground">{item.duration}{item.seatsLabel ? ` | ${item.seatsLabel}` : ""}</p>
                    </div>
                    <p className="text-right text-xl font-black text-primary">PKR {item.basePrice.toLocaleString()}</p>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="flex gap-2"><Hotel className="mt-0.5 h-4 w-4 text-primary" /> {item.makkahHotel || "Makkah hotel"} / {item.madinahHotel || "Madinah hotel"}</p>
                    <p>{item.departureCity || item.city || "Departure city on request"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.includes.slice(0, 5).map((include) => <Badge key={include} variant="secondary">{include}</Badge>)}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild className="gradient-primary text-primary-foreground"><Link to={`/umrah/${item.packageId}`}>View Details</Link></Button>
                    <a
                      href={`${whatsappBase}?text=${encodeURIComponent(`Hello Travelian,\n\nI want to inquire about this Umrah package:\n${item.name}\nDuration: ${item.duration}\nPrice: PKR ${item.basePrice.toLocaleString()}\nPackage URL: ${siteBase}/umrah/${item.packageId}`)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="outline" className="w-full"><WhatsAppIcon className="mr-2 h-4 w-4" /> WhatsApp</Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        <section className="bg-muted/40 rounded-2xl p-6 md:p-10">
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Umrah Visa Assistance</h2>
              <p className="text-sm text-muted-foreground mt-2">We handle the full visa process from document collection to issuance after your package is confirmed.</p>
            </div>
            <ul className="space-y-2">
              {["Passport with 6+ months validity", "Recent passport-size photo", "Vaccination certificate", "CNIC copy"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="h-4 w-4 text-success" /> {item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold text-foreground text-center">Your Journey</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {timeline.map((step, index) => (
              <Card key={step.step} className="border-0 shadow-card">
                <CardContent className="p-5 text-center">
                  <div className="h-10 w-10 rounded-full gradient-primary text-primary-foreground flex items-center justify-center mx-auto font-bold">{index + 1}</div>
                  <p className="font-semibold text-foreground mt-3 text-sm">{step.step}</p>
                  <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-start gap-3">
            <Clock className="mt-1 h-5 w-5 text-primary" />
            <div>
              <h2 className="font-bold text-foreground">Need a custom Umrah package?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Share departure city, duration, hotel preference, room sharing, visa, transport, ticket and meal requirements.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
