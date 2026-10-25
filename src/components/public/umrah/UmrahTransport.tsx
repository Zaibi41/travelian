import { Briefcase, Car, Info, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { SectionHeading } from "@/components/public/SectionHeading";
import { whatsappUrl } from "@/lib/site-config";
import { contactForPrice } from "@/lib/service-pricing";
import { umrahTransportRates, type UmrahTransportRate } from "@/data/services/umrah";

function transportMessage(item: UmrahTransportRate) {
  return [
    "Assalam o Alaikum Travelian,",
    "",
    "I need Umrah transport:",
    `Route: ${item.route}`,
    `Vehicle: ${item.vehicle}`,
    `Type: ${item.type}`,
    `Passengers: ${item.passengers}`,
    "",
    "Please share the current rate and availability for my dates.",
  ].join("\n");
}

export function UmrahTransport() {
  return (
    <section id="umrah-transport" className="scroll-mt-24">
      <SectionHeading
        eyebrow="Saudi transport"
        title="Umrah Transport Rates"
        description="Route-wise shared and private transport for airport transfers, intercity travel and ziarat in Makkah and Madinah."
      />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {umrahTransportRates.map((item) => (
          <Card key={item.id} className="flex h-full flex-col rounded-xl border-border/70 shadow-card transition-shadow hover:shadow-md">
            <CardContent className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-black leading-5 text-foreground">{item.route}</h3>
                <Badge variant="secondary" className="shrink-0">{item.type}</Badge>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p className="flex items-center gap-2"><Car className="h-4 w-4 text-primary" /> {item.vehicle}</p>
                <p className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> {item.passengers}</p>
                <p className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> {item.luggage}</p>
              </div>
              <p className="text-sm font-bold text-primary">{contactForPrice(item.startingFromSar, "SAR")}</p>
              <p className="flex items-start gap-2 text-xs text-muted-foreground"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {item.note}</p>
              <a className="mt-auto" href={whatsappUrl(transportMessage(item))} target="_blank" rel="noreferrer">
                <Button variant="outline" className="h-11 w-full rounded-xl font-semibold">
                  <WhatsAppIcon className="mr-2 h-4 w-4 text-whatsapp" /> Request Transport
                </Button>
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
