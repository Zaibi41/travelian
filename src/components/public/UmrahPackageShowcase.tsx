import { CalendarDays, Check, Headphones, Plane, ShieldCheck, Tag } from "lucide-react";
import type React from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { UmrahPackage } from "@/data/models";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { whatsappUrl } from "@/lib/site-config";

const siteBase = "https://www.travelian.pk";

function formatPrice(value?: number) {
  return value && value > 0 ? `PKR ${value.toLocaleString()}` : "On request";
}

function getRoomPrices(item: UmrahPackage) {
  const option = item.hotelOptions?.[0];
  return {
    sharing: option?.prices.sharing || item.basePrice,
    quad: option?.prices.quad,
    triple: option?.prices.triple,
    double: option?.prices.double,
  };
}

function getInclusions(item: UmrahPackage) {
  const inclusions = [
    { label: "Visa Included", enabled: item.visaIncluded !== false },
    { label: "Air Ticket", enabled: item.ticketIncluded !== false },
    { label: "Hotel Accommodation", enabled: true },
    { label: "Transport", enabled: item.transportIncluded !== false },
    { label: "24/7 Support", enabled: true },
  ];
  const lowerIncludes = (item.includes || []).map((entry) => entry.toLowerCase());
  return inclusions.filter((entry) => {
    if (entry.enabled) return true;
    return lowerIncludes.some((include) => include.includes(entry.label.toLowerCase().split(" ")[0]));
  });
}

function getWhatsAppMessage(item: UmrahPackage) {
  return [
    "Hello Travelian,",
    "",
    "I want to inquire about this Umrah package:",
    "",
    `Package: ${item.name}`,
    `Duration: ${item.duration || "Please confirm"}`,
    `Package Type: ${item.packageType || "Please confirm"}`,
    `Departure City: ${item.departureCity || item.city || "Please confirm"}`,
    `Makkah Hotel: ${item.makkahHotel || item.hotelOptions?.[0]?.makkahHotel || "Please confirm"}`,
    `Madinah Hotel: ${item.madinahHotel || item.hotelOptions?.[0]?.madinahHotel || "Please confirm"}`,
    `Starting Price: ${formatPrice(item.basePrice)}`,
    `Package URL: ${siteBase}/umrah/${item.packageId}`,
    "",
    "Please share availability and booking details.",
  ].join("\n");
}

interface UmrahPackageShowcaseProps {
  item: UmrahPackage;
  detailMode?: boolean;
}

export function UmrahPackageShowcase({ item, detailMode = false }: UmrahPackageShowcaseProps) {
  const prices = getRoomPrices(item);
  const hotelOption = item.hotelOptions?.[0];
  const packageType = item.packageType || "Umrah";
  const bookingPath = `/booking?type=umrah&id=${encodeURIComponent(item.packageId)}`;
  const whatsappMessage = getWhatsAppMessage(item);

  return (
    <Card className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.09)]">
      <CardContent className="p-0">
        {detailMode && (
          <div className="bg-[#0b2145] px-6 py-8 text-center text-white md:px-10">
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">Umrah Packages</h1>
            <p className="mt-2 text-sm font-medium text-white/75 md:text-base">Carefully managed Umrah packages from Travelian inventory</p>
          </div>
        )}

        <div className="grid gap-8 p-5 md:p-8 lg:grid-cols-[minmax(280px,0.82fr)_1.18fr]">
          <div className="relative min-h-[330px] overflow-hidden rounded-2xl bg-slate-100 shadow-sm">
            {item.image ? (
              <img src={item.image} alt={item.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-full min-h-[330px] items-center justify-center bg-primary/10">
                <img src="/icons/makkah.png" alt="" className="h-28 w-28 object-contain" loading="lazy" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
            <Badge className="absolute left-4 top-4 gap-2 rounded-lg bg-[#0b2145] px-4 py-2 text-white hover:bg-[#0b2145]">
              <ShieldCheck className="h-4 w-4" />
              {packageType} Package
            </Badge>
            <div className="absolute inset-x-4 bottom-4 rounded-xl bg-[#0b2145]/88 p-4 text-white shadow-lg backdrop-blur">
              <p className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-5 w-5" /> Trusted by Thousands</p>
              <p className="mt-1 text-xs text-white/75">Travel with comfort and peace of mind</p>
            </div>
          </div>

          <div className="space-y-5">
            <h2 className="text-2xl font-black tracking-tight text-slate-950 md:text-4xl">{item.name}</h2>

            <div className="grid gap-3 sm:grid-cols-3">
              <InfoTile icon={<CalendarDays className="h-5 w-5" />} label="Duration" value={item.duration || "On request"} />
              <InfoTile icon={<Plane className="h-5 w-5" />} label="Departure" value={item.departureCity || item.city || "On request"} />
              <InfoTile icon={<Tag className="h-5 w-5" />} label="Starting from" value={formatPrice(item.basePrice)} success />
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80">
              <HotelRow
                title="Makkah Hotel"
                name={item.makkahHotel || hotelOption?.makkahHotel || item.hotel || "On request"}
                detail={item.makkahHotelInfo || hotelOption?.makkahInfo || item.roomSharing || "Hotel details on request"}
                icon="/icons/makkah.png"
              />
              <HotelRow
                title="Madinah Hotel"
                name={item.madinahHotel || hotelOption?.madinahHotel || "On request"}
                detail={item.madinahHotelInfo || hotelOption?.madinahInfo || item.roomSharing || "Hotel details on request"}
                icon="/icons/madina.png"
              />
            </div>

            <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-4">
              <RoomPrice label="Sharing" price={prices.sharing} />
              <RoomPrice label="Quad" price={prices.quad} />
              <RoomPrice label="Triple" price={prices.triple} />
              <RoomPrice label="Double" price={prices.double} />
            </div>
          </div>
        </div>

        <div className="grid gap-3 px-5 pb-5 md:grid-cols-5 md:px-8">
          {getInclusions(item).map((include) => (
            <div key={include.label} className="flex min-h-16 items-center justify-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 text-sm font-bold text-slate-800">
              <Check className="h-5 w-5 text-primary" />
              {include.label}
            </div>
          ))}
        </div>

        <div className="grid gap-3 px-5 pb-6 md:grid-cols-3 md:px-8">
          <Button asChild size="lg" className="h-14 rounded-xl bg-primary text-base font-bold text-primary-foreground hover:bg-primary/90">
            <Link to={detailMode ? bookingPath : `/umrah/${item.packageId}`}>{detailMode ? "Book Now" : "View Details"}</Link>
          </Button>
          <a href={whatsappUrl(whatsappMessage)} target="_blank" rel="noreferrer">
            <Button size="lg" className="h-14 w-full rounded-xl bg-[#16a34a] text-base font-bold text-white hover:bg-[#15803d]">
              <WhatsAppIcon className="mr-2 h-5 w-5" /> Book on WhatsApp
            </Button>
          </a>
          <Button asChild variant="outline" size="lg" className="h-14 rounded-xl text-base font-bold">
            <Link to={bookingPath}><Headphones className="mr-2 h-5 w-5" /> Enquire Now</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoTile({ icon, label, value, success = false }: { icon: React.ReactNode; label: string; value: string; success?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className={success ? "text-emerald-600" : "text-primary"}>{icon}</div>
      <div>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="text-sm font-black text-slate-950">{value}</p>
      </div>
    </div>
  );
}

function HotelRow({ title, name, detail, icon }: { title: string; name: string; detail: string; icon: string }) {
  return (
    <div className="grid grid-cols-[54px_1fr] gap-4 border-b border-slate-200 p-4 last:border-b-0">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
        <img src={icon} alt="" className="h-9 w-9 object-contain" loading="lazy" />
      </div>
      <div>
        <p className="text-xs font-bold text-primary">{title}</p>
        <p className="text-base font-black text-slate-950 md:text-lg">{name}</p>
        <p className="text-sm text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

function RoomPrice({ label, price }: { label: string; price?: number }) {
  return (
    <div className="border-b border-r border-slate-200 p-4 text-center last:border-r-0 sm:border-b-0">
      <p className="font-black text-primary">{label}</p>
      <p className="mt-3 text-xs font-semibold text-slate-500">PKR</p>
      <p className="text-2xl font-black tracking-tight text-slate-950">{price && price > 0 ? price.toLocaleString() : "On request"}</p>
    </div>
  );
}
