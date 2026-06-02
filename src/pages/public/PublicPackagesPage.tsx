import { CalendarDays, Check, Clock, Headphones, Hotel, MapPin, Package, Plane, ShieldCheck, Tag } from "lucide-react";
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
          <section className="grid gap-6">
            {activePackages.map((item) => (
              <Card key={item.packageId} className="overflow-hidden border-0 shadow-card">
                <CardContent className="grid gap-0 p-0 lg:grid-cols-[340px_1fr]">
                  <div className="relative min-h-[280px] bg-primary/10">
                    {item.image ? <img src={item.image} alt={item.name} className="absolute inset-0 h-full w-full object-cover" /> : <div className="flex h-full min-h-[280px] items-center justify-center"><Package className="h-14 w-14 text-primary" /></div>}
                    <Badge className="absolute left-4 top-4 bg-primary text-primary-foreground capitalize">{item.packageType || "Umrah"} package</Badge>
                    <div className="absolute inset-x-4 bottom-4 rounded-lg bg-slate-950/70 p-3 text-sm text-white"><ShieldCheck className="mr-2 inline h-4 w-4" /> Trusted Travelian inventory</div>
                  </div>
                  <div className="space-y-5 p-5 md:p-6">
                    <h2 className="text-xl font-black text-foreground md:text-2xl">{item.name}</h2>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <p className="rounded-lg bg-muted/50 p-3 text-sm"><CalendarDays className="mr-2 inline h-4 w-4 text-primary" /><strong>{item.duration}</strong></p>
                      <p className="rounded-lg bg-muted/50 p-3 text-sm"><MapPin className="mr-2 inline h-4 w-4 text-primary" /><strong>{item.departureCity || item.city || "On request"}</strong></p>
                      <p className="rounded-lg bg-muted/50 p-3 text-sm"><Tag className="mr-2 inline h-4 w-4 text-success" /> From <strong>PKR {item.basePrice.toLocaleString()}</strong></p>
                    </div>
                    <div className="grid gap-2 rounded-xl border p-4 text-sm md:grid-cols-2"><p><Hotel className="mr-2 inline h-4 w-4 text-primary" /> Makkah: <strong>{item.makkahHotel || "On request"}</strong></p><p><Hotel className="mr-2 inline h-4 w-4 text-primary" /> Madinah: <strong>{item.madinahHotel || "On request"}</strong></p></div>
                    {item.hotelOptions?.[0] && <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(item.hotelOptions[0].prices).map(([label, price]) => <div key={label} className="rounded-lg bg-muted/50 p-3 text-center text-sm capitalize"><p className="text-muted-foreground">{label}</p><strong>{price ? `PKR ${price.toLocaleString()}` : "On request"}</strong></div>)}</div>}
                    <div className="flex flex-wrap gap-2">{item.includes.slice(0, 5).map(include => <Badge key={include} variant="secondary">{include}</Badge>)}</div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Button asChild className="gradient-primary text-primary-foreground"><Link to={`/umrah/${item.packageId}`}>View Details</Link></Button>
                    <a
                      href={`${whatsappBase}?text=${encodeURIComponent(`Hello Travelian,\n\nI want to inquire about this Umrah package:\n${item.name}\nDuration: ${item.duration}\nPrice: PKR ${item.basePrice.toLocaleString()}\nPackage URL: ${siteBase}/umrah/${item.packageId}`)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button className="w-full bg-[#25D366] text-white hover:bg-[#20bd5a]"><WhatsAppIcon className="mr-2 h-4 w-4" /> Book on WhatsApp</Button>
                    </a>
                    <Button asChild variant="outline"><Link to={`/booking?type=umrah&id=${encodeURIComponent(item.packageId)}`}><Headphones className="mr-2 h-4 w-4" /> Enquire Now</Link></Button>
                  </div>
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
