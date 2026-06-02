import { CalendarDays, Check, Hotel, Package, Plane, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { useAdmin } from "@/contexts/AdminStore";
import { getSession } from "@/lib/auth-session";
import { isPublishedUmrahPackage } from "@/lib/package-availability";

const whatsappBase = "https://wa.me/923244440014";
const siteBase = "https://www.travelian.pk";

function formatPrice(value?: number) {
  return value ? `PKR ${value.toLocaleString()}` : "On request";
}

export default function UmrahDetailPage() {
  const { id } = useParams();
  const { packages } = useAdmin();
  const item = packages.find((entry) => entry.packageId === id && isPublishedUmrahPackage(entry));

  if (!item) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="rounded-2xl border bg-card p-8 text-center shadow-card">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">Package details are not published</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            This Umrah package is not available from Travelian admin inventory right now. Please contact Travelian for current package details, price, hotel, visa, transport and ticket options.
          </p>
          <a href={`${whatsappBase}?text=${encodeURIComponent("Hello Travelian, please share current Umrah package details.")}`} target="_blank" rel="noreferrer">
            <Button className="mt-5 rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a]">
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
    `Duration: ${item.duration}`,
    `Departure City: ${item.departureCity || item.city || "Please confirm"}`,
    `Makkah Hotel: ${item.makkahHotel || "Please confirm"}`,
    `Madinah Hotel: ${item.madinahHotel || "Please confirm"}`,
    `Room Sharing: ${item.roomSharing || "Please confirm"}`,
    `Price From: PKR ${item.basePrice.toLocaleString()}`,
    `Package URL: ${siteBase}/umrah/${item.packageId}`,
    "",
    "Please share availability and booking details.",
  ].join("\n");
  const bookingPath = `/booking?type=umrah&id=${encodeURIComponent(item.packageId)}`;
  const bookingLink = getSession() ? bookingPath : `/signin?redirect=${encodeURIComponent(bookingPath)}`;

  return (
    <div className="bg-muted/30">
      <section className="gradient-hero">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
          <div className="text-primary-foreground">
            <Badge className="mb-4 bg-white/15 text-primary-foreground hover:bg-white/20">{item.seatsLabel || "Travelian Umrah"}</Badge>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">{item.name}</h1>
            <p className="mt-3 max-w-3xl text-primary-foreground/80">{item.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge className="bg-white/15 text-primary-foreground hover:bg-white/20">{item.duration}</Badge>
              {item.departureCity && <Badge className="bg-white/15 text-primary-foreground hover:bg-white/20">{item.departureCity}</Badge>}
              {item.packageType && <Badge className="bg-white/15 text-primary-foreground hover:bg-white/20 capitalize">{item.packageType}</Badge>}
            </div>
          </div>
          <Card className="border-white/10 bg-white shadow-2xl">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Starting from</p>
              <p className="mt-1 text-4xl font-black text-primary">PKR {item.basePrice.toLocaleString()}</p>
              <p className="mt-1 text-sm text-muted-foreground">Per person, package terms apply</p>
              <div className="mt-5 grid gap-2">
                <Button asChild className="gradient-primary text-primary-foreground">
                  <Link to={bookingLink}>Book Now</Link>
                </Button>
                <a href={`${whatsappBase}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="w-full"><WhatsAppIcon className="mr-2 h-4 w-4" /> WhatsApp Inquiry</Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {item.image && <img src={item.image} alt={item.name} className="max-h-[520px] w-full rounded-2xl object-cover shadow-card" />}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><Hotel className="h-5 w-5 text-primary" /> Hotels</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Makkah Hotel</p>
                  <h2 className="mt-1 text-lg font-bold">{item.makkahHotel || "On request"}</h2>
                  {item.makkahHotelInfo && <p className="mt-1 text-sm text-muted-foreground">{item.makkahHotelInfo}</p>}
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Madinah Hotel</p>
                  <h2 className="mt-1 text-lg font-bold">{item.madinahHotel || "On request"}</h2>
                  {item.madinahHotelInfo && <p className="mt-1 text-sm text-muted-foreground">{item.madinahHotelInfo}</p>}
                </div>
              </CardContent>
            </Card>

            {item.flightDates?.length ? (
              <Card className="shadow-card">
                <CardHeader><CardTitle className="flex items-center gap-2"><Plane className="h-5 w-5 text-primary" /> Flight dates</CardTitle></CardHeader>
                <CardContent className="grid gap-3">
                  {item.flightDates.map((row, index) => (
                    <div key={`${row.outboundDate}-${index}`} className="grid gap-3 rounded-xl border p-4 md:grid-cols-2">
                      <div><p className="text-xs text-muted-foreground">Outbound</p><p className="font-semibold">{row.outboundDate || "Date on request"} {row.outboundRoute ? `· ${row.outboundRoute}` : ""}</p></div>
                      <div><p className="text-xs text-muted-foreground">Return</p><p className="font-semibold">{row.returnDate || "Date on request"} {row.returnRoute ? `· ${row.returnRoute}` : ""}</p></div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {item.hotelOptions?.length ? (
              <Card className="shadow-card">
                <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Hotel options & prices</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {item.hotelOptions.map((option, index) => (
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
                </CardContent>
              </Card>
            ) : null}
          </div>

          <aside className="space-y-6">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> Package includes</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {item.includes.map((include) => (
                  <p key={include} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-success" /> {include}</p>
                ))}
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
                <CardContent><p className="whitespace-pre-line text-sm text-muted-foreground">{item.terms}</p></CardContent>
              </Card>
            )}

            <Card className="shadow-card">
              <CardContent className="p-5">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h2 className="mt-2 font-bold">Need confirmation?</h2>
                <p className="mt-1 text-sm text-muted-foreground">Ask Travelian to confirm seat availability, hotel finalization, visa documents and payment schedule.</p>
                <a href={`${whatsappBase}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noreferrer">
                  <Button className="mt-4 w-full bg-[#25D366] text-white hover:bg-[#20bd5a]"><WhatsAppIcon className="mr-2 h-4 w-4" /> Ask on WhatsApp</Button>
                </a>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
