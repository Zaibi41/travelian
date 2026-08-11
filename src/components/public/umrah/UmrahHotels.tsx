import { Bus, Check, MapPin, Utensils, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PackageImage } from "@/components/public/PackageImage";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { SectionHeading } from "@/components/public/SectionHeading";
import { whatsappUrl } from "@/lib/site-config";
import { priceValue } from "@/lib/service-pricing";
import type { UmrahHotelRate } from "@/data/services/umrah";

function hotelMessage(hotel: UmrahHotelRate) {
  return [
    "Assalam o Alaikum Travelian,",
    "",
    `I want the latest room rate for this ${hotel.city} hotel:`,
    `Hotel: ${hotel.name}`,
    `Location: ${hotel.location}`,
    `Distance: ${hotel.distance}`,
    `Category: ${hotel.category}`,
    `Meal plan: ${hotel.mealPlan}`,
    `Room type: ${hotel.roomType}`,
    "",
    "Please share the current rate with my dates and number of guests.",
  ].join("\n");
}

interface Props {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  hotels: UmrahHotelRate[];
}

export function UmrahHotels({ id, eyebrow, title, description, hotels }: Props) {
  return (
    <section id={id} className="scroll-mt-24">
      <SectionHeading eyebrow={eyebrow} title={title} description={description} />
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {hotels.map((hotel) => (
          <Card key={hotel.id} className="flex h-full flex-col overflow-hidden border-0 shadow-card transition-shadow hover:shadow-elevated">
            <div className="relative">
              <PackageImage src={hotel.image} alt={`${hotel.name}, ${hotel.city}`} className="h-40 w-full" />
              <Badge className="absolute left-3 top-3 bg-primary/90 text-primary-foreground hover:bg-primary/90">{hotel.category}</Badge>
            </div>
            <CardContent className="flex flex-1 flex-col gap-3 p-5">
              <div>
                <h3 className="text-base font-black text-foreground">{hotel.name}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 text-primary" /> {hotel.location}</p>
                <p className="mt-1 text-sm font-bold text-primary">{hotel.distance}</p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className={hotel.shuttle ? "bg-success/10 text-success hover:bg-success/10" : "text-muted-foreground"}>
                  {hotel.shuttle ? <Check className="mr-1 h-3 w-3" /> : <X className="mr-1 h-3 w-3" />} Shuttle service
                </Badge>
                <Badge variant="secondary"><Utensils className="mr-1 h-3 w-3" /> {hotel.mealPlan}</Badge>
                <Badge variant="outline">{hotel.roomType}</Badge>
              </div>

              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Starting from rates (SAR / night)</p>
                <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                  {[["Sharing", hotel.rates.sharing], ["Double", hotel.rates.double], ["Triple", hotel.rates.triple], ["Quad", hotel.rates.quad]].map(([label, value]) => (
                    <div key={label as string}>
                      <p className="text-[11px] font-bold text-primary">{label as string}</p>
                      <p className="text-sm font-black text-foreground">{priceValue(value as number)}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">{hotel.rateValidity}{hotel.supplier ? ` · ${hotel.supplier}` : ""}</p>
              </div>

              <a className="mt-auto" href={whatsappUrl(hotelMessage(hotel))} target="_blank" rel="noreferrer">
                <Button className="h-11 w-full rounded-xl bg-whatsapp font-semibold text-whatsapp-foreground hover:bg-whatsapp-hover">
                  <WhatsAppIcon className="mr-2 h-4 w-4" /> Ask Hotel Price
                </Button>
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Bus className="h-4 w-4 text-primary" /> Hotel rates change with season and occupancy. Contact us for the updated price on your dates.</p>
    </section>
  );
}
