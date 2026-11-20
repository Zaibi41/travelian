import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BadgeCheck, BedDouble, CalendarDays, Clock, Hotel, MapPin, Plane, Search, ShieldCheck, Star, X } from "lucide-react";
import heroImg from "@/assets/umrah-sample-hero.jpg";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { SectionHeading } from "@/components/public/SectionHeading";
import { UmrahFaqs } from "@/components/public/umrah/UmrahSections";
import { whatsappUrl } from "@/lib/site-config";
import { isPriced, priceValue, PRICING_DISCLAIMER } from "@/lib/service-pricing";
import {
  UMRAH_DEPARTURE_CITIES,
  UMRAH_DURATIONS,
  UMRAH_TIERS,
  umrahOffers,
  umrahTierComparison,
  type UmrahOffer,
} from "@/data/services/umrah";

const ALL = "any";

const monthOptions = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + i);
  return {
    value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    label: d.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
  };
});

const tierStyle: Record<string, string> = {
  Economy: "bg-muted text-foreground",
  Standard: "bg-accent text-accent-foreground",
  Executive: "bg-teal-soft text-teal",
  Premium: "bg-gold-light text-gold-foreground",
};

const CUSTOM_MESSAGE = [
  "Assalam o Alaikum Travelian,",
  "",
  "I am looking for a custom Umrah package.",
  "Please share the available options and final price.",
].join("\n");

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
    ...(isPriced(o.prices.sharing) ? [`Room sharing: PKR ${priceValue(o.prices.sharing)}`] : []),
    o.startingFrom ? `Starting from PKR ${priceValue(o.startingFrom)}` : "Price on request",
    "",
    "Please share availability and final price.",
  ].join("\n");
}

export default function UmrahSamplePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const city = searchParams.get("city") ?? ALL;
  const month = searchParams.get("month") ?? ALL;
  const days = searchParams.get("duration") ?? ALL;
  const tier = searchParams.get("tier") ?? ALL;

  // Listing loads in batches so a large inventory never renders all at once.
  const PAGE_SIZE = 8;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => setVisibleCount(PAGE_SIZE), [city, month, days, tier]);


  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === ALL) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };
  const reset = () => setSearchParams({}, { replace: true });

  const filtered = useMemo(
    () =>
      umrahOffers.filter(
        (o) =>
          (city === ALL || o.departureCity === city) &&
          (tier === ALL || o.tier === tier) &&
          (days === ALL || String(o.days) === days) &&
          (month === ALL || (o.departureDate?.startsWith(month) ?? false)),
      ),
    [city, tier, days, month],
  );

  const tierCards = useMemo(
    () =>
      UMRAH_TIERS.map((t) => {
        const offers = umrahOffers.filter((o) => o.tier === t);
        const priced = offers.filter((o) => isPriced(o.startingFrom)).map((o) => o.startingFrom as number);
        return {
          tier: t,
          count: offers.length,
          startingFrom: priced.length ? Math.min(...priced) : undefined,
          detail: umrahTierComparison.find((r) => r.tier === t),
        };
      }),
    [],
  );

  const hasFilters = [city, month, days, tier].some((v) => v !== ALL);
  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visible.length;
  const scrollToResults = () => document.getElementById("sample-packages")?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      <SEO title="Umrah Packages | Travelian" description="Travelian Umrah packages: compare packages and ask for a custom Umrah on WhatsApp." />

      {/* HERO */}
      <section className="relative isolate">
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <img src={heroImg} alt="" width={1600} height={800} className="h-full w-full object-cover" />
          <div className="absolute inset-0 gradient-hero opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-r from-sidebar via-sidebar/70 to-transparent" />
        </div>
        <div className="travelian-container pb-24 pt-12 md:pb-28 md:pt-16">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Umrah 2026 · From Pakistan</p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-black tracking-tight text-primary-foreground md:text-5xl">
            Your Umrah, planned with care
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-primary-foreground md:text-base">
            Visa, flights, Makkah and Madinah hotels and Saudi transport in one package, with a clear final price before you pay.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 rounded-xl px-6 font-bold">
              <a href="#sample-packages">View Packages</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-primary-foreground/30 bg-primary-foreground/10 px-6 font-bold text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground">
              <a href="#sample-request">Custom Umrah on WhatsApp</a>
            </Button>
          </div>
        </div>
      </section>

      {/* FLOATING SEARCH CARD */}
      <div className="travelian-container relative z-20 -mt-16">
        <div className="rounded-2xl border bg-card p-4 shadow-elevated md:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <FilterSelect icon={<MapPin className="h-4 w-4" />} label="Departure city" value={city} onChange={(v) => setParam("city", v)}
              options={UMRAH_DEPARTURE_CITIES.map((c) => ({ value: c, label: c }))} allLabel="All cities" />
            <FilterSelect icon={<CalendarDays className="h-4 w-4" />} label="Travel month" value={month} onChange={(v) => setParam("month", v)}
              options={monthOptions} allLabel="Any month" />
            <FilterSelect icon={<Clock className="h-4 w-4" />} label="Duration" value={days} onChange={(v) => setParam("duration", v)}
              options={UMRAH_DURATIONS.map((d) => ({ value: String(d), label: `${d} Days` }))} allLabel="Any duration" />
            <FilterSelect icon={<Star className="h-4 w-4" />} label="Package type" value={tier} onChange={(v) => setParam("tier", v)}
              options={UMRAH_TIERS.map((t) => ({ value: t, label: t }))} allLabel="All types" />
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

      <div className="travelian-container space-y-14 py-12">
        {/* PACKAGE TYPE CARDS */}
        <section>
          <SectionHeading eyebrow="Package types" title="Choose your Umrah style" description="Four package types, each with one clear starting price." />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tierCards.map(({ tier: t, count, startingFrom, detail }) => (
              <div key={t} className="relative flex flex-col rounded-2xl border bg-card p-5 shadow-card">
                {t === "Executive" && <Badge className="absolute -top-3 left-5 bg-gold text-gold-foreground hover:bg-gold">Most popular</Badge>}
                <p className="font-display text-lg font-black text-primary">{t}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Starting from</p>
                <p className="font-display text-xl font-black text-foreground">{startingFrom ? `PKR ${priceValue(startingFrom)}` : "On Request"}</p>
                <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-primary" /> {detail?.hotelDistance}</li>
                  <li className="flex gap-2"><BedDouble className="h-4 w-4 shrink-0 text-primary" /> {detail?.roomSharing}</li>
                </ul>
                <p className="mt-3 text-xs font-semibold text-muted-foreground">{count} package{count === 1 ? "" : "s"}</p>
                <Button variant="outline" size="sm" className="mt-3 w-full rounded-xl" onClick={() => { setParam("tier", t); scrollToResults(); }}>
                  View {t} packages
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* MATCHING PACKAGES */}
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
              <p className="mt-1 text-sm text-muted-foreground">Try another month or city, or ask our Umrah desk for a custom package.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button className="rounded-xl" onClick={reset}>Show all packages</Button>
                <Button asChild className="rounded-xl bg-whatsapp font-bold text-whatsapp-foreground hover:bg-whatsapp-hover">
                  <a href={whatsappUrl(CUSTOM_MESSAGE)} target="_blank" rel="noreferrer"><WhatsAppIcon className="mr-1.5 h-4 w-4" /> WhatsApp Us</a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {visible.map((o) => <PackageCard key={o.id} offer={o} />)}
            </div>
          )}

          {remaining > 0 && (
            <div className="mt-6 text-center">
              <Button variant="outline" size="lg" className="rounded-xl px-8 font-bold" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                Show more packages ({remaining} more)
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">Showing {visible.length} of {filtered.length} packages.</p>
            </div>
          )}
        </section>

        {/* CUSTOM REQUEST — WhatsApp only */}
        <section id="sample-request" className="scroll-mt-24 overflow-hidden rounded-3xl gradient-primary px-5 py-8 text-center md:py-10">
          <ShieldCheck className="mx-auto h-8 w-8 text-gold" />
          <h2 className="mt-2 font-display text-xl font-black text-primary-foreground md:text-2xl">Need a custom Umrah plan?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-primary-foreground">
            Message us on WhatsApp with your dates and budget — our Umrah desk replies with options and a clear final price.
          </p>
          <Button asChild size="lg" className="mt-4 h-12 rounded-xl bg-whatsapp px-6 font-bold text-whatsapp-foreground hover:bg-whatsapp-hover">
            <a href={whatsappUrl(CUSTOM_MESSAGE)} target="_blank" rel="noreferrer"><WhatsAppIcon className="mr-2 h-5 w-5" /> Chat on WhatsApp</a>
          </Button>
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
  return (
    <article className="grid overflow-hidden rounded-2xl border bg-card shadow-card transition-shadow hover:shadow-elevated md:grid-cols-[200px_1fr_210px]">
      <div className="relative min-h-36 overflow-hidden bg-accent">
        <img src={o.image || heroImg} alt="" loading="lazy" width={1600} height={800} className="absolute inset-0 h-full w-full object-cover" />
        <span className={`absolute left-3 top-3 rounded-lg px-2.5 py-1 text-xs font-bold ${tierStyle[o.tier]}`}>{o.tier}</span>
        {o.status !== "Available" && <span className="absolute bottom-3 left-3 rounded-lg bg-card px-2.5 py-1 text-xs font-bold text-warning">{o.status}</span>}
      </div>

      <div className="min-w-0 space-y-2.5 p-4">
        <h3 className="truncate font-display text-base font-black text-foreground">{o.name}</h3>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 truncate"><CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary" />{o.durationLabel}</span>
          <span className="flex items-center gap-1.5 truncate"><MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />{o.departureCity}</span>
          <span className="flex items-center gap-1.5 truncate"><Plane className="h-3.5 w-3.5 shrink-0 text-primary" />{fmtDate(o.departureDate)} – {fmtDate(o.returnDate)}</span>
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <HotelLine city="Makkah" name={o.makkahHotel} distance={o.makkahDistance} />
          <HotelLine city="Madinah" name={o.madinahHotel} distance={o.madinahDistance} />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t bg-muted/30 p-4 md:border-l md:border-t-0">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Starting from</p>
          <p className="font-display text-xl font-black text-primary">{o.startingFrom ? `PKR ${priceValue(o.startingFrom)}` : "On Request"}</p>
        </div>
        <Button asChild className="mt-auto rounded-xl bg-whatsapp font-bold text-whatsapp-foreground hover:bg-whatsapp-hover">
          <a href={whatsappUrl(offerMessage(o))} target="_blank" rel="noreferrer"><WhatsAppIcon className="mr-1.5 h-4 w-4" /> WhatsApp Enquiry</a>
        </Button>
      </div>
    </article>
  );
}

function HotelLine({ city, name, distance }: { city: string; name: string; distance: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-background px-2.5 py-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent text-primary"><Hotel className="h-3.5 w-3.5" /></span>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-foreground"><span className="font-black uppercase text-primary">{city}</span> · {name}</p>
        <p className="truncate text-xs text-muted-foreground">{distance}</p>
      </div>
    </div>
  );
}
