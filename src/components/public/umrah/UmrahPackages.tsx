import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { DEFAULT_UMRAH_SEARCH, matchesUmrahPreferences, UMRAH_ROOM_TYPES, type UmrahSearchValues } from "@/lib/umrah-search";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BedDouble, CalendarDays, Building2, Plane, Ticket, Users, Clock, MapPin, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { SectionHeading } from "@/components/public/SectionHeading";
import { whatsappUrl } from "@/lib/site-config";
import { priceValue, startingFrom } from "@/lib/service-pricing";
import { UMRAH_DEPARTURE_CITIES, UMRAH_DURATIONS, UMRAH_TIERS, type UmrahOffer } from "@/data/services/umrah";

const ANY = "any";
const MAX_PRICE = 1000000;

function formatDate(value?: string) {
  if (!value) return "On request";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function inquiryMessage(offer: UmrahOffer, search?: UmrahSearchValues) {
  return [
    "Assalam o Alaikum Travelian,",
    "",
    "I want to inquire about this Umrah package:",
    `Package: ${offer.name}`,
    `Type: ${offer.tier}`,
    `Duration: ${offer.durationLabel}`,
    `Departure city: ${offer.departureCity}`,
    `Airline: ${offer.airline}`,
    `Departure: ${formatDate(offer.departureDate)}`,
    `Return: ${formatDate(offer.returnDate)}`,
    `Makkah hotel: ${offer.makkahHotel} (${offer.makkahDistance})`,
    `Madinah hotel: ${offer.madinahHotel} (${offer.madinahDistance})`,
    `Starting from: ${startingFrom(offer.startingFrom ?? offer.prices.sharing)}`,
    "",
    ...(search ? [
      `Travellers: ${search.travelers.adults} adult${search.travelers.adults === 1 ? "" : "s"}, ${search.travelers.children} ${search.travelers.children === 1 ? "child" : "children"}, ${search.travelers.infants} infant${search.travelers.infants === 1 ? "" : "s"}`,
      `Preferred room: ${UMRAH_ROOM_TYPES.find(room => room.value === search.room)?.label || "Please advise"}`,
    ] : []),
    "Please confirm availability, room sharing options and final price.",
  ].join("\n");
}

export function UmrahPackages({ offers, search = DEFAULT_UMRAH_SEARCH, onResetSearch }: { offers: UmrahOffer[]; search?: UmrahSearchValues; onResetSearch?: () => void }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    if (!filtersOpen) return;
    const desktop = window.matchMedia("(min-width: 640px)");
    const close = () => { if (desktop.matches) setFiltersOpen(false); };
    desktop.addEventListener("change", close);
    return () => desktop.removeEventListener("change", close);
  }, [filtersOpen]);
  const [duration, setDuration] = useState(search.duration);
  const [tier, setTier] = useState(search.tier);
  const [city, setCity] = useState(search.city);
  const [airline, setAirline] = useState(ANY);
  const [distance, setDistance] = useState(ANY);
  const [status, setStatus] = useState(ANY);
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);

  const airlines = useMemo(() => Array.from(new Set(offers.map((o) => o.airline))).sort(), [offers]);

  const filtered = useMemo(
    () =>
      offers.filter((offer) => {
        if (!matchesUmrahPreferences(offer, search)) return false;
        const from = offer.startingFrom ?? offer.prices.sharing;
        if (duration !== ANY && String(offer.days) !== duration) return false;
        if (tier !== ANY && offer.tier !== tier) return false;
        if (city !== ANY && offer.departureCity !== city) return false;
        if (airline !== ANY && offer.airline !== airline) return false;
        if (status !== ANY && offer.status !== status) return false;
        if (distance !== ANY) {
          const meters = offer.makkahDistanceMeters ?? 99999;
          if (distance === "300" && meters > 300) return false;
          if (distance === "800" && meters > 800) return false;
          if (distance === "1500" && meters > 1500) return false;
        }
        if (maxPrice < MAX_PRICE && from && from > maxPrice) return false;
        return true;
      }),
    [offers, duration, tier, city, airline, status, distance, maxPrice, search],
  );

  const reset = () => {
    setDuration(ANY);
    setTier(ANY);
    setCity(ANY);
    setAirline(ANY);
    setDistance(ANY);
    setStatus(ANY);
    setMaxPrice(MAX_PRICE);
    onResetSearch?.();
  };

  const filtersActive = [duration, tier, city, airline, distance, status].some((v) => v !== ANY) || maxPrice < MAX_PRICE || search.month !== ANY || search.room !== ANY;

  const filterPanel = (
      <Card className="rounded-xl border-border/70 shadow-card">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <FilterSelect label="Duration" value={duration} onChange={setDuration} placeholder="Any duration"
            options={UMRAH_DURATIONS.map((d) => ({ value: String(d), label: `${d} Days` }))} />
          <FilterSelect label="Package type" value={tier} onChange={setTier} placeholder="Any type"
            options={UMRAH_TIERS.map((t) => ({ value: t, label: t }))} />
          <FilterSelect label="Departure city" value={city} onChange={setCity} placeholder="Any city"
            options={UMRAH_DEPARTURE_CITIES.map((c) => ({ value: c, label: c }))} />
          <FilterSelect label="Airline" value={airline} onChange={setAirline} placeholder="Any airline"
            options={airlines.map((a) => ({ value: a, label: a }))} />
          <FilterSelect label="Makkah hotel distance" value={distance} onChange={setDistance} placeholder="Any distance"
            options={[
              { value: "300", label: "Within 300 m of Haram" },
              { value: "800", label: "Within 800 m of Haram" },
              { value: "1500", label: "Within 1.5 km of Haram" },
            ]} />
          <FilterSelect label="Availability" value={status} onChange={setStatus} placeholder="Any status"
            options={[
              { value: "Available", label: "Available" },
              { value: "Limited seats", label: "Limited seats" },
              { value: "On request", label: "On request" },
            ]} />
          <div className="sm:col-span-2 lg:col-span-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">Budget per person (max)</label>
              <span className="text-xs font-bold text-foreground">
                {maxPrice >= MAX_PRICE ? "Any budget" : `Up to PKR ${maxPrice.toLocaleString()}`}
              </span>
            </div>
            <Slider className="mt-3" min={150000} max={MAX_PRICE} step={25000} value={[maxPrice]} onValueChange={([v]) => setMaxPrice(v)} />
          </div>
        </CardContent>
      </Card>
  );

  return (
    <section id="umrah-packages" tabIndex={-1} aria-label="Umrah package results" className="space-y-6 scroll-mt-24 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
      <SectionHeading
        eyebrow="Ready-made packages"
        title="Umrah Packages"
        description="Browse available packages and refine by your preferences. Rates are starting-from and confirmed before booking."
      />

      <div className="hidden sm:block">{filterPanel}</div>
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetTrigger asChild><Button variant="outline" className="h-12 w-full rounded-xl sm:hidden">Refine packages{filtersActive ? " · Filters applied" : ""}</Button></SheetTrigger>
        <SheetContent side="bottom" overlayClassName="z-[1050]" className="z-[1100] flex max-h-[90dvh] flex-col gap-4 rounded-t-xl p-4">
          <SheetHeader className="shrink-0 pr-8"><SheetTitle>Refine Umrah packages</SheetTitle><SheetDescription>Choose your preferences to refine the available packages.</SheetDescription></SheetHeader>
          <div className="min-h-0 overflow-y-auto">{filterPanel}</div>
          <div className="grid shrink-0 grid-cols-2 gap-3 border-t pt-3"><Button variant="outline" className="h-12 rounded-xl" onClick={reset}>Clear filters</Button><Button className="h-12 rounded-xl" onClick={() => setFiltersOpen(false)}>Show {filtered.length} packages</Button></div>
        </SheetContent>
      </Sheet>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          Showing <span className="font-bold text-foreground">{filtered.length}</span> of {offers.length} packages
        </p>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" /> Reset filters</Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card role="status" className="rounded-xl border-border/70 shadow-card">
          <CardContent className="p-8 text-center">
            <p className="font-bold text-foreground">No Umrah packages match your current filters.</p>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              Tell us your dates, hotel preference and budget and we will build a custom Umrah package for you.
            </p>
            <Button variant="outline" className="mr-2 mt-5 h-12 rounded-xl" onClick={reset}>Clear filters</Button>
            <Button asChild className="mt-5 h-12 rounded-xl bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp-hover">
              <a href={whatsappUrl("Assalam o Alaikum Travelian, I need a custom Umrah package quote.")} target="_blank" rel="noreferrer">
                <WhatsAppIcon className="mr-2 h-4 w-4" /> Request custom package
              </a>
          </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {filtered.map((offer) => <OfferCard key={offer.id} offer={offer} search={search} />)}
        </div>
      )}
    </section>
  );
}

function FilterSelect({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className="mt-1.5 h-12 rounded-xl border-muted bg-muted/30"><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{placeholder}</SelectItem>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function OfferCard({ offer, search }: { offer: UmrahOffer; search?: UmrahSearchValues }) {
  const includes = [
    { label: "Air ticket", ok: offer.includes.ticket },
    { label: "Umrah visa", ok: offer.includes.visa },
    { label: "Hotels", ok: offer.includes.hotel },
    { label: "Transport", ok: offer.includes.transport },
    { label: "Ziarat", ok: offer.includes.ziarat },
  ];

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-xl border-border/70 shadow-card transition-shadow hover:shadow-md">
      <div className="relative isolate overflow-hidden border-b border-border/70 bg-card px-5 py-5">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-accent text-primary hover:bg-accent">{offer.tier}</Badge>
            <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted">{offer.durationLabel}</Badge>
            <Badge variant="secondary" className={offer.status === "Available" ? "bg-success/20 text-success hover:bg-success/20" : "bg-muted text-muted-foreground hover:bg-muted"}>{offer.status}</Badge>
          </div>
          <h3 className="mt-3 font-display text-lg font-semibold tracking-tight text-foreground md:text-xl">{offer.name}</h3>
          <p className="mt-1 text-sm font-semibold text-primary">{startingFrom(offer.startingFrom ?? offer.prices.sharing)}</p>
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div className="grid gap-2 sm:grid-cols-2">
          <Fact icon={<Plane className="h-4 w-4" />} label="Departure city" value={offer.departureCity} />
          <Fact icon={<Ticket className="h-4 w-4" />} label="Airline" value={offer.airline} />
          <Fact icon={<CalendarDays className="h-4 w-4" />} label="Departure date" value={formatDate(offer.departureDate)} />
          <Fact icon={<CalendarDays className="h-4 w-4" />} label="Return date" value={formatDate(offer.returnDate)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <HotelBlock city="Makkah" name={offer.makkahHotel} distance={offer.makkahDistance} />
          <HotelBlock city="Madinah" name={offer.madinahHotel} distance={offer.madinahDistance} />
        </div>

        <div className="rounded-xl border bg-muted/20 p-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <BedDouble className="h-4 w-4" /> Per person rates (PKR)
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Rate label="Sharing" value={offer.prices.sharing} />
            <Rate label="Quad" value={offer.prices.quad} />
            <Rate label="Triple" value={offer.prices.triple} />
            <Rate label="Double" value={offer.prices.double} />
          </div>
          {(offer.prices.child || offer.prices.infant) && (
            <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3">
              <Rate label="Child" value={offer.prices.child} />
              <Rate label="Infant" value={offer.prices.infant} />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {includes.map((item) => (
            <Badge key={item.label} variant={item.ok ? "secondary" : "outline"} className={item.ok ? "bg-success/10 text-success hover:bg-success/10" : "text-muted-foreground"}>
              {item.ok ? "Included" : "Optional"}: {item.label}
            </Badge>
          ))}
        </div>

        {(offer.seatsLeft || offer.bookingDeadline) && (
          <div className="flex flex-wrap gap-4 text-xs font-semibold text-muted-foreground">
            {offer.seatsLeft && <span className="flex items-center gap-1.5 text-gold"><Users className="h-4 w-4" /> {offer.seatsLeft} seats left</span>}
            {offer.bookingDeadline && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Book before {formatDate(offer.bookingDeadline)}</span>}
          </div>
        )}

        <div className="mt-auto grid gap-2 sm:grid-cols-2">
          <Button asChild variant="outline" className="h-11 rounded-xl font-semibold">
            <Link to={`/umrah/${encodeURIComponent(offer.id)}`}>Request Details</Link>
          </Button>
          <Button asChild className="h-11 w-full rounded-xl bg-whatsapp font-semibold text-whatsapp-foreground hover:bg-whatsapp-hover">
            <a href={whatsappUrl(inquiryMessage(offer, search))} target="_blank" rel="noreferrer">
              <WhatsAppIcon className="mr-2 h-4 w-4" /> Send on WhatsApp
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border bg-card p-3">
      <span className="mt-0.5 text-primary">{icon}</span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function HotelBlock({ city, name, distance }: { city: string; name: string; distance: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
        <Building2 className="h-3.5 w-3.5" /> {city} hotel
      </p>
      <p className="mt-1 text-sm font-bold text-foreground">{name}</p>
      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {distance}</p>
    </div>
  );
}

function Rate({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-lg bg-card p-2.5 text-center shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-primary">{label}</p>
      <p className="mt-1 text-sm font-black text-foreground">{priceValue(value)}</p>
    </div>
  );
}
