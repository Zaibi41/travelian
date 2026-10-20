import { useMemo, useState } from "react";
import { BadgeCheck, BedDouble, CalendarDays, Check, Hotel, MapPin, Plane, Search, ShieldCheck, Star, X } from "lucide-react";
import heroImg from "@/assets/umrah-sample-hero.jpg";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { SectionHeading } from "@/components/public/SectionHeading";
import { UmrahRequestForm } from "@/components/public/umrah/UmrahRequestForm";
import { UmrahFaqs } from "@/components/public/umrah/UmrahSections";
import { whatsappUrl } from "@/lib/site-config";
import { priceValue, startingFrom, PRICING_DISCLAIMER } from "@/lib/service-pricing";
import {
  UMRAH_DEPARTURE_CITIES,
  UMRAH_DURATIONS,
  UMRAH_TIERS,
  umrahOffers,
  umrahTierComparison,
  type UmrahOffer,
} from "@/data/services/umrah";

const ALL = "all";

const tierStyle: Record<string, string> = {
  Economy: "bg-muted text-foreground",
  Standard: "bg-accent text-accent-foreground",
  Executive: "bg-teal-soft text-teal",
  Premium: "bg-gold-light text-gold-foreground",
};

function fmtDate(d?: string) {
  if (!d) return "Flexible";
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function offerMessage(o: UmrahOffer) {
  return [
    "Assalam o Alaikum Travelian,",
    "",
    "I am interested in this Umrah package:",
    `Package: ${o.name}`,
    `Duration: ${o.durationLabel}`,
    `Departure: ${o.departureCity}`,
    `Makkah Hotel: ${o.makkahHotel}`,
    `Madinah Hotel: ${o.madinahHotel}`,
    `${startingFrom(o.startingFrom)}`,
    "",
    "Please share availability and final price.",
  ].join("\n");
}

export default function UmrahSamplePage() {
  const [city, setCity] = useState(ALL);
  const [tier, setTier] = useState(ALL);
  const [days, setDays] = useState(ALL);

  const filtered = useMemo(
    () =>
      umrahOffers.filter(
        (o) =>
          (city === ALL || o.departureCity === city) &&
          (tier === ALL || o.tier === tier) &&
          (days === ALL || String(o.days) === days),
      ),
    [city, tier, days],
  );

  const hasFilters = city !== ALL || tier !== ALL || days !== ALL;
  const reset = () => { setCity(ALL); setTier(ALL); setDays(ALL); };

  return (
    <>
      <SEO title="Umrah Packages (Sample) | Travelian" description="Preview of the redesigned Travelian Umrah packages page." />

      {/* HERO */}
      <section className="relative isolate">
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <img src={heroImg} alt="" width={1600} height={800} className="h-full w-full object-cover" />
          <div className="absolute inset-0 gradient-hero opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-r from-sidebar via-sidebar/70 to-transparent" />
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 md:pb-28 md:pt-16 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Umrah 2026 · From Pakistan</p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-black tracking-tight text-primary-foreground md:text-5xl">
            Your Umrah, planned with care
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-primary-foreground/80 md:text-base">
            Visa, flights, Makkah and Madinah hotels and Saudi transport in one package, with a clear final price before you pay.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 rounded-xl px-6 font-bold">
              <a href="#sample-packages">View Packages</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-primary-foreground/30 bg-primary-foreground/10 px-6 font-bold text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground">
              <a href="#sample-request">Request Custom Umrah</a>
            </Button>
          </div>
        </div>
      </section>

      {/* FLOATING SEARCH CARD */}
      <div className="relative z-20 mx-auto -mt-16 max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border bg-card p-4 shadow-elevated md:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <FilterSelect icon={<MapPin className="h-4 w-4" />} label="Departure city" value={city} onChange={setCity}
              options={UMRAH_DEPARTURE_CITIES.map((c) => ({ value: c, label: c }))} allLabel="All cities" />
            <FilterSelect icon={<Star className="h-4 w-4" />} label="Package type" value={tier} onChange={setTier}
              options={UMRAH_TIERS.map((t) => ({ value: t, label: t }))} allLabel="All types" />
            <FilterSelect icon={<CalendarDays className="h-4 w-4" />} label="Duration" value={days} onChange={setDays}
              options={UMRAH_DURATIONS.map((d) => ({ value: String(d), label: `${d} Days` }))} allLabel="Any duration" />
            <Button asChild className="h-12 self-end rounded-xl px-6 font-bold">
              <a href="#sample-packages"><Search className="mr-2 h-4 w-4" /> Search</a>
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {["Verified hotels", "Visa assistance", "Direct & connecting flights", "24/7 Umrah desk"].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" /> {t}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-12 sm:px-6 lg:px-8">
        {/* PACKAGES */}
        <section id="sample-packages" className="scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionHeading eyebrow="Available packages" title="Umrah Packages" description={`${filtered.length} package${filtered.length === 1 ? "" : "s"} match your selection.`} />
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={reset}><X className="mr-1 h-4 w-4" /> Clear filters</Button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed bg-card p-10 text-center">
              <p className="font-bold text-foreground">No packages match these filters</p>
              <p className="mt-1 text-sm text-muted-foreground">Try another city or duration, or request a custom package.</p>
              <Button className="mt-4 rounded-xl" onClick={reset}>Show all packages</Button>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {filtered.map((o) => <PackageCard key={o.id} offer={o} />)}
            </div>
          )}
        </section>

        {/* TIER COMPARISON */}
        <section className="relative isolate overflow-hidden rounded-3xl gradient-hero px-5 py-10 md:px-10">
          <div className="absolute -top-20 right-10 -z-10 h-64 w-64 rounded-full bg-primary/40 blur-3xl" aria-hidden="true" />
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Compare</p>
            <h2 className="mt-2 font-display text-xl font-black text-primary-foreground md:text-2xl">Which package type suits you?</h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {umrahTierComparison.map((row, i) => {
              const popular = row.tier === "Executive";
              return (
                <div key={row.tier} className={`relative rounded-2xl bg-card p-5 ${popular ? "ring-2 ring-gold" : ""}`}>
                  {popular && <Badge className="absolute -top-3 left-5 bg-gold text-gold-foreground hover:bg-gold">Most popular</Badge>}
                  <p className="font-display text-lg font-black text-primary">{row.tier}</p>
                  <div className="mt-2 flex gap-1" aria-label={`Price level ${row.priceLevel}`}>
                    {[0, 1, 2, 3].map((n) => <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= i ? "bg-gold" : "bg-muted"}`} />)}
                  </div>
                  <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                    <li className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-primary" /> {row.hotelDistance}</li>
                    <li className="flex gap-2"><BedDouble className="h-4 w-4 shrink-0 text-primary" /> {row.roomSharing}</li>
                    <li className="flex gap-2"><Plane className="h-4 w-4 shrink-0 text-primary" /> {row.transport}</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success" /> {row.bestFor}</li>
                  </ul>
                  <Button variant="outline" size="sm" className="mt-4 w-full rounded-xl" onClick={() => { setTier(row.tier); document.getElementById("sample-packages")?.scrollIntoView({ behavior: "smooth" }); }}>
                    See {row.tier} packages
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        {/* CUSTOM REQUEST */}
        <section id="sample-request" className="scroll-mt-24 grid overflow-hidden rounded-3xl border bg-card shadow-card lg:grid-cols-[0.8fr_1.2fr]">
          <div className="gradient-primary p-6 text-primary-foreground md:p-8">
            <ShieldCheck className="h-8 w-8 text-gold" />
            <h2 className="mt-3 font-display text-xl font-black md:text-2xl">Need a custom Umrah plan?</h2>
            <p className="mt-2 text-sm text-primary-foreground/80">Tell us your dates, budget and hotel preference. Our Umrah desk replies with options and a clear price.</p>
            <ul className="mt-5 space-y-2 text-sm">
              {["Hotels close to Haram & Masjid Nabawi", "Family and group arrangements", "Private or shared transport", "Ziarat on request"].map((t) => (
                <li key={t} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-gold" /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="p-4 md:p-6"><UmrahRequestForm /></div>
        </section>

        <UmrahFaqs />
        <p className="text-center text-xs text-muted-foreground">{PRICING_DISCLAIMER}</p>
      </div>
    </>
  );
}

function FilterSelect({ icon, label, value, onChange, options, allLabel }: {
  icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; allLabel: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><span className="text-primary">{icon}</span>{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </label>
  );
}

function PackageCard({ offer: o }: { offer: UmrahOffer }) {
  const rates: [string, number | undefined][] = [["Sharing", o.prices.sharing], ["Quad", o.prices.quad], ["Triple", o.prices.triple], ["Double", o.prices.double]];
  const inc: [string, boolean][] = [["Visa", o.includes.visa], ["Air ticket", o.includes.ticket], ["Hotels", o.includes.hotel], ["Transport", o.includes.transport], ["Ziarat", o.includes.ziarat]];
  return (
    <article className="grid overflow-hidden rounded-2xl border bg-card shadow-card transition-shadow hover:shadow-elevated md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr_230px]">
      <div className="relative min-h-40 overflow-hidden bg-accent">
        <img src={o.image || heroImg} alt="" loading="lazy" width={1600} height={800} className="absolute inset-0 h-full w-full object-cover" />
        <span className={`absolute left-3 top-3 rounded-lg px-2.5 py-1 text-xs font-bold ${tierStyle[o.tier]}`}>{o.tier}</span>
        {o.status !== "Available" && <span className="absolute bottom-3 left-3 rounded-lg bg-card px-2.5 py-1 text-xs font-bold text-warning">{o.status}</span>}
      </div>

      <div className="min-w-0 space-y-3 p-4 md:p-5">
        <h3 className="truncate font-display text-lg font-black text-foreground">{o.name}</h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
          <span className="flex items-center gap-1.5 truncate"><CalendarDays className="h-4 w-4 shrink-0 text-primary" />{o.durationLabel}</span>
          <span className="flex items-center gap-1.5 truncate"><MapPin className="h-4 w-4 shrink-0 text-primary" />{o.departureCity}</span>
          <span className="flex items-center gap-1.5 truncate"><Plane className="h-4 w-4 shrink-0 text-primary" />{o.airline}</span>
          <span className="flex items-center gap-1.5 truncate"><CalendarDays className="h-4 w-4 shrink-0 text-primary" />{fmtDate(o.departureDate)} – {fmtDate(o.returnDate)}</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <HotelLine city="Makkah" name={o.makkahHotel} distance={o.makkahDistance} />
          <HotelLine city="Madinah" name={o.madinahHotel} distance={o.madinahDistance} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {inc.filter(([, on]) => on).map(([l]) => (
            <span key={l} className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success"><Check className="h-3 w-3" />{l}</span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t bg-muted/30 p-4 md:col-span-2 lg:col-span-1 lg:border-l lg:border-t-0">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Starting from</p>
          <p className="font-display text-2xl font-black text-primary">{o.startingFrom ? `PKR ${priceValue(o.startingFrom)}` : "On Request"}</p>
        </div>
        <div className="grid grid-cols-4 gap-1 text-center lg:grid-cols-2">
          {rates.map(([l, p]) => (
            <div key={l} className="rounded-lg border bg-card px-1 py-1.5">
              <p className="text-[10px] font-bold text-muted-foreground">{l}</p>
              <p className="truncate text-xs font-black text-foreground">{priceValue(p, "On req.")}</p>
            </div>
          ))}
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2 lg:grid-cols-1">
          <Button asChild className="rounded-xl font-bold"><a href="#sample-request">Enquire Now</a></Button>
          <Button asChild className="rounded-xl bg-whatsapp font-bold text-whatsapp-foreground hover:bg-whatsapp-hover">
            <a href={whatsappUrl(offerMessage(o))} target="_blank" rel="noreferrer"><WhatsAppIcon className="mr-1.5 h-4 w-4" /> WhatsApp</a>
          </Button>
        </div>
      </div>
    </article>
  );
}

function HotelLine({ city, name, distance }: { city: string; name: string; distance: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border bg-background p-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary"><Hotel className="h-4 w-4" /></span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase text-primary">{city}</p>
        <p className="truncate text-sm font-bold text-foreground">{name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{distance}</p>
      </div>
    </div>
  );
}
