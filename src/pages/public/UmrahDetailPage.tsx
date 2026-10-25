import { CalendarDays, Check, Package, Plane, Users } from "lucide-react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { UmrahPackageShowcase } from "@/components/public/UmrahPackageShowcase";
import { useAdmin } from "@/contexts/AdminStore";
import { isPublishedUmrahPackage } from "@/lib/package-availability";
import { whatsappUrl } from "@/lib/site-config";
import { findSeedUmrahOffer, umrahOfferToPackage } from "@/data/services/umrah-adapter";

const siteBase = "https://www.travelian.pk";

function formatPrice(value?: number) {
  return value && value > 0 ? `PKR ${value.toLocaleString()}` : "On request";
}

export default function UmrahDetailPage() {
  const { id } = useParams();
  const { packages } = useAdmin();
  const adminItem = packages.find((entry) => entry.packageId === id && isPublishedUmrahPackage(entry));
  const seedOffer = findSeedUmrahOffer(id);
  const item = adminItem ?? (seedOffer ? umrahOfferToPackage(seedOffer) : undefined);

  if (!item) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-2xl border bg-card p-8 text-center shadow-card">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">Package details are not published</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            This Umrah package is not available from Travelian admin inventory right now. Please contact Travelian for current package details, price, hotel, visa, transport and ticket options.
          </p>
          <a href={whatsappUrl("Hello Travelian, please share current Umrah package details.")} target="_blank" rel="noreferrer">
            <Button className="mt-5 rounded-xl bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp-hover">
              <WhatsAppIcon className="mr-2 h-4 w-4" /> Ask on WhatsApp
            </Button>
          </a>
        </div>
      </div>
    );
  }

  const whatsappMessage = [
    "Hello Travelian,",
    "",
    "I want to inquire about this Umrah package:",
    "",
    `Package: ${item.name}`,
    `Duration: ${item.duration || "Please confirm"}`,
    `Departure City: ${item.departureCity || item.city || "Please confirm"}`,
    `Makkah Hotel: ${item.makkahHotel || item.hotelOptions?.[0]?.makkahHotel || "Please confirm"}`,
    `Madinah Hotel: ${item.madinahHotel || item.hotelOptions?.[0]?.madinahHotel || "Please confirm"}`,
    `Room Sharing: ${item.roomSharing || "Please confirm"}`,
    `Price From: ${formatPrice(item.basePrice)}`,
    `Package URL: ${siteBase}/umrah/${item.packageId}`,
    "",
    "Please share availability and booking details.",
  ].join("\n");

  return (
    <div className="bg-muted/30 py-8">
      <div className="travelian-container space-y-6">
        <UmrahPackageShowcase item={item} detailMode />

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {item.flightDates?.length ? (
              <Card className="shadow-card">
                <CardHeader><CardTitle className="flex items-center gap-2"><Plane className="h-5 w-5 text-primary" /> Flight dates</CardTitle></CardHeader>
                <CardContent className="grid gap-3">
                  {item.flightDates.map((row, index) => (
                    <div key={`${row.outboundDate}-${index}`} className="grid gap-3 rounded-xl border p-4 md:grid-cols-2">
                      <div><p className="text-xs text-muted-foreground">Outbound</p><p className="font-semibold">{row.outboundDate || "Date on request"} {row.outboundRoute ? `- ${row.outboundRoute}` : ""}</p></div>
                      <div><p className="text-xs text-muted-foreground">Return</p><p className="font-semibold">{row.returnDate || "Date on request"} {row.returnRoute ? `- ${row.returnRoute}` : ""}</p></div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {item.hotelOptions?.length ? (
              <Card className="shadow-card">
                <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Additional hotel options</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {item.hotelOptions.slice(1).map((option, index) => (
                    <div key={`${option.label}-${index}`} className="rounded-xl border p-4">
                      <h2 className="font-bold">{option.label}</h2>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div><p className="text-xs text-muted-foreground">Makkah</p><p className="font-semibold">{option.makkahHotel}</p>{option.makkahInfo && <p className="text-sm text-muted-foreground">{option.makkahInfo}</p>}</div>
                        <div><p className="text-xs text-muted-foreground">Madinah</p><p className="font-semibold">{option.madinahHotel}</p>{option.madinahInfo && <p className="text-sm text-muted-foreground">{option.madinahInfo}</p>}</div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                        <Badge variant="secondary" className="justify-center py-2">Sharing {formatPrice(option.prices.sharing)}</Badge>
                        <Badge variant="secondary" className="justify-center py-2">Quad {formatPrice(option.prices.quad)}</Badge>
                        <Badge variant="secondary" className="justify-center py-2">Triple {formatPrice(option.prices.triple)}</Badge>
                        <Badge variant="secondary" className="justify-center py-2">Double {formatPrice(option.prices.double)}</Badge>
                      </div>
                    </div>
                  ))}
                  {item.hotelOptions.length <= 1 && <p className="text-sm text-muted-foreground">No additional hotel options are published for this package.</p>}
                </CardContent>
              </Card>
            ) : null}

            {item.description && (
              <Card className="shadow-card">
                <CardHeader><CardTitle>Package overview</CardTitle></CardHeader>
                <CardContent><p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">{item.description}</p></CardContent>
              </Card>
            )}
          </div>

          <aside className="space-y-6">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> Package includes</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(item.includes || []).length ? (item.includes || []).map((include) => (
                  <p key={include} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-success" /> {include}</p>
                )) : <p className="text-sm text-muted-foreground">Package inclusions are available on request.</p>}
              </CardContent>
            </Card>

            {(item.childPrice || item.infantPrice) && (
              <Card className="shadow-card">
                <CardHeader><CardTitle>Child & infant</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {item.childPrice && <p className="flex justify-between"><span>Child</span><strong>{formatPrice(item.childPrice)}</strong></p>}
                  {item.infantPrice && <p className="flex justify-between"><span>Infant</span><strong>{formatPrice(item.infantPrice)}</strong></p>}
                </CardContent>
              </Card>
            )}

            {item.terms && (
              <Card className="shadow-card">
                <CardHeader><CardTitle>Terms and conditions</CardTitle></CardHeader>
                <CardContent><p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">{item.terms}</p></CardContent>
              </Card>
            )}

            <Card className="shadow-card">
              <CardContent className="p-5">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h2 className="mt-2 font-bold">Need confirmation?</h2>
                <p className="mt-1 text-sm text-muted-foreground">Ask Travelian to confirm seat availability, hotel finalization, visa documents and payment schedule.</p>
                <a href={whatsappUrl(whatsappMessage)} target="_blank" rel="noreferrer">
                  <Button className="mt-4 w-full bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp-hover"><WhatsAppIcon className="mr-2 h-4 w-4" /> Ask on WhatsApp</Button>
                </a>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

