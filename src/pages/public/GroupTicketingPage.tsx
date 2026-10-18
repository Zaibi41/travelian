import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Info,
  Luggage,
  Plane,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AirlineLogo } from "@/components/public/AirlineLogo";
import { PageHeader } from "@/components/public/PageHeader";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { SearchTabs } from "@/components/public/SearchTabs";
import { whatsappUrl } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { airports } from "@/data/airports";
import { CURRENCIES, useLocale } from "@/contexts/LocaleContext";
import {
  buildGroupTicketSearchParams,
  extractAvailableSectors,
  fetchGroupTicketDetail,
  fetchGroupTickets,
  filterGroupTickets,
  getSupplierGCode,
  groupTicketPrimaryDate,
  groupTicketWhatsAppMessage,
  maskGroupTicketForDisplay,
  parseGroupTicketSearchParams,
  type AvailableSector,
  type GroupTicket,
} from "@/lib/group-ticketing";

function whatsappHref(message: string) {
  return whatsappUrl(message);
}

const airportCache = airports;
const popularAirportByCode = new Map(
  [
    { code: "LHE", city: "Lahore" },
    { code: "KHI", city: "Karachi" },
    { code: "ISB", city: "Islamabad" },
    { code: "SKT", city: "Sialkot" },
    { code: "PEW", city: "Peshawar" },
    { code: "MUX", city: "Multan" },
    { code: "DXB", city: "Dubai" },
    { code: "JED", city: "Jeddah" },
    { code: "MED", city: "Madinah" },
    { code: "RUH", city: "Riyadh" },
    { code: "IST", city: "Istanbul" },
    { code: "DOH", city: "Doha" },
    { code: "AUH", city: "Abu Dhabi" },
    { code: "LHR", city: "London" },
    { code: "MAN", city: "Manchester" },
    { code: "JFK", city: "New York" },
    { code: "YYZ", city: "Toronto" },
    { code: "KUL", city: "Kuala Lumpur" },
    { code: "BKK", city: "Bangkok" },
    { code: "SIN", city: "Singapore" },
    { code: "MCT", city: "Muscat" },
    { code: "SHJ", city: "Sharjah" },
  ].map((a) => [a.code, a])
);

function routeLabel(code?: string | null) {
  const cleanCode = String(code || "").trim().toUpperCase();
  if (!cleanCode) return "TBA";
  const airport = airportCache?.find((a) => a.code === cleanCode) || popularAirportByCode.get(cleanCode);
  return airport ? `${cleanCode} ${airport.city}` : cleanCode;
}

function airportCity(code?: string | null) {
  const cleanCode = String(code || "").trim().toUpperCase();
  if (!cleanCode) return "";
  const airport = airportCache?.find((a) => a.code === cleanCode) || popularAirportByCode.get(cleanCode);
  return airport?.city || cleanCode;
}

const RATE_PER_USD: Record<string, number> = {
  ...Object.fromEntries(CURRENCIES.map((c) => [c.code, c.rate])),
  INR: 83,
};

function formatFare(price: number | string | undefined | null, srcCurrency = "PKR", selectedCurrency = "PKR") {
  if (price === undefined || price === null || price === "") return "On request";
  const num = Number(price);
  if (!Number.isFinite(num) || num <= 0) return "On request";
  const src = String(srcCurrency || "PKR").toUpperCase();
  const dst = (selectedCurrency || "PKR").toUpperCase();
  const fromRate = RATE_PER_USD[src] ?? RATE_PER_USD[dst] ?? 1;
  const toRate = RATE_PER_USD[dst] ?? fromRate;
  const converted = src === dst ? num : (num / fromRate) * toRate;
  return `${dst} ${Math.round(converted).toLocaleString()}`;
}

function formatFlightTime(value?: string | null) {
  if (!value) return "TBA";
  const text = String(value).trim();
  const time = text.includes(" ") ? text.split(" ")[1] : text;
  if (time.includes(":")) {
    const parts = time.split(":");
    if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
  }
  return time || "TBA";
}

function formatFlightDate(value?: string | null) {
  if (!value) return "TBA";
  const text = String(value).trim();
  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) return format(date, "dd MMM yyyy");
  const [datePart] = text.split(" ");
  const parsed = parseDateOnly(datePart);
  return parsed ? format(parsed, "dd MMM yyyy") : text;
}

interface GroupJourneyLeg {
  key: string;
  label: string;
  departureTime: string;
  arrivalTime: string;
  departureDate?: string;
  arrivalDate?: string;
  origin: string;
  destination: string;
  duration?: string;
  stopText?: string;
}

function getJourneyLegs(active: GroupTicket): GroupJourneyLeg[] {
  if (active.itinerary && active.itinerary.length > 0) {
    return active.itinerary.map((leg, index) => ({
      key: leg.id || `${active.id}-leg-${index}`,
      label: active.itinerary!.length === 2
        ? (index === 0 ? "Outbound" : "Return")
        : (active.itinerary!.length === 1 ? "Flight" : `Flight ${index + 1}`),
      departureTime: leg.departureTime || "TBA",
      arrivalTime: leg.arrivalTime || "TBA",
      departureDate: leg.flightDate || active.departureDate,
      arrivalDate: leg.flightDate || active.departureDate,
      origin: leg.origin || "Origin",
      destination: leg.destination || "Destination",
      duration: "Direct",
      stopText: "Direct",
    }));
  }

  const sectorStr = String(active.sector || "").trim();
  const codes = sectorStr.match(/[A-Za-z]{3}/g)?.map((c) => c.toUpperCase()) || [];
  const isRoundtrip = active.tripType === "round-trip" || Boolean(active.returnDate) || (codes.length >= 3 && codes[2] === codes[0]);

  if (codes.length >= 2) {
    if (isRoundtrip) {
      return [
        {
          key: `${active.id}-out`,
          label: "Outbound",
          departureTime: "TBA",
          arrivalTime: "TBA",
          departureDate: active.departureDate,
          arrivalDate: active.departureDate,
          origin: codes[0],
          destination: codes[1],
          duration: "Direct",
          stopText: "Direct",
        },
        {
          key: `${active.id}-ret`,
          label: "Return",
          departureTime: "TBA",
          arrivalTime: "TBA",
          departureDate: active.returnDate,
          arrivalDate: active.returnDate,
          origin: codes[1],
          destination: codes[2] || codes[0],
          duration: "Direct",
          stopText: "Direct",
        },
      ];
    }

    return [
      {
        key: `${active.id}-flight`,
        label: "Flight",
        departureTime: "TBA",
        arrivalTime: "TBA",
        departureDate: active.departureDate,
        arrivalDate: active.departureDate,
        origin: codes[0],
        destination: codes[1],
        duration: "Direct",
        stopText: "Direct",
      },
    ];
  }

  return [
    {
      key: `${active.id}-flight`,
      label: "Flight",
      departureTime: "TBA",
      arrivalTime: "TBA",
      departureDate: active.departureDate,
      arrivalDate: active.departureDate,
      origin: sectorStr || "Origin",
      destination: "Destination",
      duration: "Direct",
      stopText: "Direct",
    },
  ];
}

function SkeletonCards() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="h-32 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}

function GroupCard({
  group,
  category,
  index,
  selectedCurrency = "PKR",
}: {
  group: GroupTicket;
  category: string;
  index: number;
  selectedCurrency?: string;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [fareDetailsTab, setFareDetailsTab] = useState<"flight" | "rules" | "baggage">("flight");
  const [detail, setDetail] = useState<GroupTicket | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!detailOpen || detail) return;

    if (group.itinerary?.length) {
      setDetail(group);
      return;
    }

    let cancelled = false;
    setLoadingDetail(true);
    fetchGroupTicketDetail(group.id)
      .then((loaded) => {
        if (!cancelled) setDetail(loaded);
      })
      .catch(() => {
        if (!cancelled) setDetail(group);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [detailOpen, detail, group]);

  const active = detail || group;
  const display = maskGroupTicketForDisplay(active, index);
  const gCode = getSupplierGCode(active);
  const isReturn = active.tripType === "round-trip" || Boolean(active.returnDate);
  const message = groupTicketWhatsAppMessage(category, active);
  const formattedPrice = formatFare(active.fare, active.currency, selectedCurrency);
  const journeyLegs = getJourneyLegs(active);
  const outboundLeg = journeyLegs[0];
  const returnLeg = journeyLegs[1];

  return (
    <Card className="overflow-hidden transition-all duration-200 border border-slate-200/80 bg-card shadow-sm hover:border-primary/30 hover:shadow-md">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-3.5">
          {/* Header row: Airline info + G-Code + Trip Type */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/50 pb-3">
            <div className="flex min-w-0 items-center gap-3">
              <AirlineLogo
                airline={active.airlineName || active.airlineCode || "Airline"}
                flightNumber={group.flightNumber}
                imageUrl={active.airlineLogo}
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl shrink-0"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground" title={active.airlineName || "Airline"}>
                  {active.airlineName || active.airlineCode || "Airline"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {group.flightNumber ? `Flight ${group.flightNumber}` : "Group Allocation"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Trip Type badge */}
              <Badge
                variant="secondary"
                className={cn(
                  "rounded-lg px-2.5 py-0.5 text-xs font-bold",
                  isReturn
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                    : "bg-sky-50 text-sky-700 border border-sky-200/80",
                )}
              >
                {isReturn ? "Return" : "One-Way"}
              </Badge>

              {/* Public G-Code Badge for Travelian staff identification */}
              <Badge
                className="rounded-lg bg-primary px-2.5 py-0.5 text-xs font-black tracking-wider text-primary-foreground shadow-sm"
                title={`Supplier reference code: ${gCode}`}
              >
                {gCode}
              </Badge>
            </div>
          </div>

          {/* Body: Outbound & Return Itinerary Details */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] items-center">
            {/* Outbound Sector */}
            <div className="rounded-xl bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  {isReturn ? "Outbound Flight" : "Flight Sector"}
                </span>
                <span className="text-xs font-bold text-foreground">
                  {formatFlightDate(outboundLeg?.departureDate || active.departureDate)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-base font-black text-foreground">
                    {outboundLeg?.origin || "Origin"} → {outboundLeg?.destination || "Destination"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {routeLabel(outboundLeg?.origin)} to {routeLabel(outboundLeg?.destination)}
                  </p>
                </div>
                {outboundLeg?.departureTime && outboundLeg.departureTime !== "TBA" && (
                  <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                    {formatFlightTime(outboundLeg.departureTime)}
                  </span>
                )}
              </div>
            </div>

            {/* Return Sector (if Return / Umrah) or Amenities (if One-Way) */}
            {isReturn && returnLeg ? (
              <div className="rounded-xl bg-emerald-50/40 border border-emerald-100/60 p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Return Flight
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {formatFlightDate(returnLeg?.departureDate || active.returnDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-black text-foreground">
                      {returnLeg?.origin || "Origin"} → {returnLeg?.destination || "Destination"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {routeLabel(returnLeg?.origin)} to {routeLabel(returnLeg?.destination)}
                    </p>
                  </div>
                  {returnLeg?.departureTime && returnLeg.departureTime !== "TBA" && (
                    <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                      {formatFlightTime(returnLeg.departureTime)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-muted/20 p-3 flex flex-col justify-center gap-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Included Amenities
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Luggage className="h-3.5 w-3.5 text-emerald-600" />
                    {active.baggage || "Baggage included"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    {active.seatsAvailable ? `${active.seatsAvailable} seats left` : "Guaranteed seat"}
                  </span>
                </div>
              </div>
            )}

            {/* Price and Action Buttons */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 pt-2 sm:pt-0 sm:pl-2">
              <div className="text-left sm:text-right">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Fixed Fare</p>
                <p className="text-xl font-black text-primary leading-tight">{formattedPrice}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl px-3 text-xs font-semibold"
                  onClick={() => {
                    setFareDetailsTab("flight");
                    setDetailOpen(true);
                  }}
                >
                  Flight Details
                </Button>
                <a href={whatsappHref(message)} target="_blank" rel="noreferrer">
                  <Button size="sm" className="h-9 rounded-xl bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp-hover px-3.5 text-xs font-bold gap-1.5 shadow-sm">
                    <WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp Help
                  </Button>
                </a>
              </div>
            </div>
          </div>

          {/* Sub-bar: Baggage & Seat Counter for Return tickets */}
          {isReturn && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 font-medium">
                  <Luggage className="h-3.5 w-3.5 text-emerald-600" />
                  Baggage: <strong className="text-foreground">{active.baggage || "Allowance confirmed upon booking"}</strong>
                </span>
                {active.seatsAvailable ? (
                  <span className="flex items-center gap-1.5 font-medium">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    Seats: <strong className="text-foreground">{active.seatsAvailable} left</strong>
                  </span>
                ) : null}
              </div>
              <span className="text-[11px] font-semibold text-primary">
                Reference Code: {gCode}
              </span>
            </div>
          )}
        </div>
      </CardContent>

      {/* Flight Details Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="top-[calc(50%+1.75rem)] flex max-h-[calc(100dvh-7rem)] w-[calc(100vw-1.5rem)] flex-col overflow-hidden border border-primary/10 bg-gradient-to-br from-white via-sky-50/50 to-white p-0 shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:max-h-[calc(100dvh-8rem)] sm:max-w-2xl md:max-w-3xl">
          <DialogHeader className="sticky top-0 z-10 shrink-0 border-b border-primary/10 bg-white/95 px-4 py-3 text-left backdrop-blur sm:px-5">
            <div className="flex items-start gap-3 pr-8">
              <AirlineLogo
                airline={active.airlineName || active.airlineCode || "Airline"}
                flightNumber={group.flightNumber}
                imageUrl={active.airlineLogo}
                className="h-10 w-10 rounded-xl border-slate-200 shadow-sm ring-0"
              />
              <div className="min-w-0">
                <DialogTitle className="sr-only">Flight details</DialogTitle>
                <div className="flex items-center gap-2">
                  <p className="truncate text-base font-black text-slate-950" title={active.airlineName || "Airline"}>
                    {active.airlineName || active.airlineCode || "Airline"} {group.flightNumber ? `· ${group.flightNumber}` : ""}
                  </p>
                  <Badge className="bg-primary text-white text-[10px] font-black">{gCode}</Badge>
                </div>
                <p className="mt-0.5 truncate text-xs font-semibold text-primary">
                  {active.sector || "Group Flight"} · {isReturn ? "Return Itinerary" : "One-Way Itinerary"}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="shrink-0 bg-white/60 px-4 pt-3 sm:px-5">
            <div className="grid overflow-hidden rounded-xl border border-primary/15 bg-white p-1 text-xs font-bold text-slate-600 shadow-sm sm:grid-cols-3">
              {([
                ["flight", "Flight Info"],
                ["rules", "Fare Rules"],
                ["baggage", "Baggage & Seats"],
              ] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFareDetailsTab(tab)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 transition-colors",
                    fareDetailsTab === tab ? "bg-primary text-primary-foreground shadow-sm" : "bg-transparent hover:bg-primary/5 hover:text-primary",
                  )}
                >
                  {fareDetailsTab === tab && <Check className="h-3.5 w-3.5" />}
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {loadingDetail ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading group flight details...</p>
            ) : (
              <>
                {fareDetailsTab === "flight" && (
                  <div className="space-y-3">
                    {journeyLegs.map((leg, legIdx) => (
                      <section key={leg.key || legIdx} className="rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-sm sm:p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
                            {leg.label}
                          </span>
                          <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-900 ring-1 ring-slate-100">
                            <AirlineLogo
                              airline={active.airlineName || "Airline"}
                              flightNumber={group.flightNumber}
                              imageUrl={active.airlineLogo}
                              className="h-5 w-5 shrink-0 rounded-md border-0 shadow-none ring-0"
                            />
                            <span className="truncate">{active.airlineName || active.airlineCode || "Airline"}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-[1rem_minmax(0,1fr)] gap-3">
                          <div className="relative flex justify-center pt-1">
                            <span className="h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary/10" />
                            <span className="absolute bottom-4 top-4 w-px bg-gradient-to-b from-primary to-emerald-400" />
                            <span className="absolute bottom-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10" />
                          </div>
                          <div className="min-w-0 space-y-3">
                            <div className="grid gap-1 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-4">
                              <p className="text-lg font-black leading-tight text-slate-950">{formatFlightTime(leg.departureTime)}</p>
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Departure</p>
                                <p className="truncate text-sm font-bold text-slate-950" title={routeLabel(leg.origin)}>
                                  {routeLabel(leg.origin)}
                                </p>
                                {leg.departureDate && (
                                  <p className="text-xs text-muted-foreground">{formatFlightDate(leg.departureDate)}</p>
                                )}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                              {active.airlineName || "Airline"} · {leg.duration || "Direct"} · {leg.stopText || "Direct"}
                            </div>

                            <div className="grid gap-1 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-4">
                              <p className="text-lg font-black leading-tight text-slate-950">{formatFlightTime(leg.arrivalTime)}</p>
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Arrival</p>
                                <p className="truncate text-sm font-bold text-slate-950" title={routeLabel(leg.destination)}>
                                  {routeLabel(leg.destination)}
                                </p>
                                {leg.arrivalDate && (
                                  <p className="text-xs text-muted-foreground">{formatFlightDate(leg.arrivalDate)}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </section>
                    ))}
                  </div>
                )}

                {fareDetailsTab === "rules" && (
                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm space-y-3">
                    <div className="rounded-xl border border-red-100 bg-red-50/50 p-3">
                      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-red-500">Cancellation</p>
                      <p className="text-sm text-slate-700">{display.cancellationRules || "Subject to Travelian terms."}</p>
                    </div>
                    <div className="rounded-xl border border-primary/10 bg-primary/5 p-3">
                      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">Terms & Conditions</p>
                      <p className="text-sm text-slate-700">{display.terms || "Available — confirm with Travelian before booking."}</p>
                    </div>
                  </div>
                )}

                {fareDetailsTab === "baggage" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border bg-card p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Trip Type</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{isReturn ? "Return Itinerary" : "One-Way Itinerary"}</p>
                    </div>
                    <div className="rounded-2xl border bg-card p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Baggage Allowance</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{active.baggage || "Standard Group Baggage"}</p>
                    </div>
                    <div className="rounded-2xl border bg-card p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Supplier Reference</p>
                      <p className="mt-2 text-sm font-semibold text-primary font-black">{gCode}</p>
                    </div>
                    <div className="rounded-2xl border bg-card p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Seats Available</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{active.seatsAvailable ? `${active.seatsAvailable} seats` : "Availability on request"}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function GroupTicketingPage() {
  const { currency: selectedCurrency } = useLocale();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchFilters = useMemo(() => parseGroupTicketSearchParams(searchParams), [searchParams]);
  const [groups, setGroups] = useState<GroupTicket[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const hasSearchCriteria = Boolean(searchFilters.from || searchFilters.to || searchFilters.dateFrom);

  const load = () => {
    const controller = new AbortController();
    setStatus("loading");
    fetchGroupTickets("all", controller.signal)
      .then((items) => {
        setGroups(items);
        setStatus("success");
      })
      .catch(() => {
        setGroups([]);
        setStatus("error");
      });
    return () => controller.abort();
  };

  useEffect(load, []);

  const availableSectors = useMemo(() => extractAvailableSectors(groups), [groups]);

  // Filter and sort by departure date ascending
  const filteredGroups = useMemo(() => {
    if (!hasSearchCriteria) return [];
    const matched = filterGroupTickets(groups, searchFilters);
    return [...matched].sort((a, b) => {
      const dA = groupTicketPrimaryDate(a) || "9999-99-99";
      const dB = groupTicketPrimaryDate(b) || "9999-99-99";
      return dA.localeCompare(dB);
    });
  }, [groups, searchFilters, hasSearchCriteria]);

  const handleSearch = (values: { from?: string; to?: string; dateFrom?: string }) => {
    const params = buildGroupTicketSearchParams(values);
    const query = params.toString();
    navigate(query ? `/group-ticketing?${query}` : "/group-ticketing");
  };

  const handleQuickSector = (sec: AvailableSector) => {
    handleSearch({ from: sec.from, to: sec.to });
  };

  const clearSearch = () => {
    navigate("/group-ticketing");
  };

  return (
    <div>
      {/* 1. Navbar handled globally */}

      {/* 2. Group Ticketing Hero + Search */}
      <PageHeader
        title="Group Ticketing"
        tagline="Exclusive wholesale fixed-rate group inventory with instant WhatsApp confirmation"
      >
        <SearchTabs
          initialTab="group-ticketing"
          visibleTabIds={["flights", "group-ticketing", "hotels"]}
          groupInitialValues={searchFilters}
          onGroupSearch={handleSearch}
        />
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Loading state */}
        {status === "loading" && hasSearchCriteria && <SkeletonCards />}

        {/* Error state */}
        {status === "error" && (
          <div className="rounded-2xl border bg-card p-8 text-center shadow-card">
            <Info className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-bold">Group ticketing is temporarily unavailable</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The group ticketing service is temporarily unavailable. Please retry shortly or contact Travelian for the latest availability.
            </p>
            <Button className="mt-5 rounded-xl" onClick={load}>Retry</Button>
          </div>
        )}

        {/* 3. Search Results Section (Shown only when user has searched) */}
        {hasSearchCriteria && status === "success" && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
              <div>
                <h2 className="text-2xl font-black text-foreground">
                  {searchFilters.from && searchFilters.to
                    ? `${searchFilters.from} → ${searchFilters.to} Group Tickets`
                    : searchFilters.from
                      ? `Flights from ${searchFilters.from}`
                      : searchFilters.to
                        ? `Flights to ${searchFilters.to}`
                        : "Matching Group Tickets"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {filteredGroups.length} available ticket{filteredGroups.length === 1 ? "" : "s"}
                  {searchFilters.dateFrom ? ` on ${formatFlightDate(searchFilters.dateFrom)}` : " · Sorted by departure date"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={clearSearch}>
                  Clear search
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={load}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
                </Button>
              </div>
            </div>

            {/* Empty state if 0 tickets match */}
            {filteredGroups.length === 0 ? (
              <div className="rounded-2xl border bg-card p-8 text-center shadow-card">
                <Plane className="mx-auto h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-bold text-foreground">No group tickets available for this route/date</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  We don't have scheduled group seats matching this route or date right now. Contact our group ticketing desk on WhatsApp to check upcoming allocations or request a custom quote.
                </p>
                <a
                  href={whatsappHref(`Hello Travelian, please let me know upcoming group ticket availability for ${searchFilters.from || ""} to ${searchFilters.to || ""}.`)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button className="mt-5 rounded-xl bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp-hover font-bold">
                    <WhatsAppIcon className="mr-2 h-4 w-4" /> WhatsApp Travelian Desk
                  </Button>
                </a>
              </div>
            ) : (
              <div className="grid gap-3.5">
                {filteredGroups.map((group, index) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    category="Group Tickets"
                    index={index}
                    selectedCurrency={selectedCurrency}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* 4. On Platform: Live + Group Tickets Section */}
        <section className="rounded-3xl border border-primary/15 bg-gradient-to-br from-slate-900 via-primary/95 to-slate-900 p-6 sm:p-10 text-white shadow-xl">
          <div className="max-w-3xl">
            <Badge className="bg-white/20 text-white border-0 text-xs font-bold uppercase tracking-wider mb-3">
              One Platform
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Live Commercial Flights + Exclusive Group Tickets
            </h2>
            <p className="mt-2 text-sm sm:text-base text-white/80">
              Travelian combines real-time scheduled carrier search with wholesale fixed-rate group allocations across Pakistan, Saudi Arabia, and the Gulf.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition-all hover:bg-white/10">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <ShieldCheck className="h-5 w-5 text-gold" />
              </div>
              <h3 className="text-base font-bold">Guaranteed Fixed Fares</h3>
              <p className="mt-1 text-xs text-white/75">
                Wholesale locked seat pricing with zero dynamic surge during peak holiday and Umrah seasons.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition-all hover:bg-white/10">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Luggage className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold">Baggage Included</h3>
              <p className="mt-1 text-xs text-white/75">
                Generous 30kg–40kg checked baggage allowances standard on all Saudi and international group sectors.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition-all hover:bg-white/10">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Sparkles className="h-5 w-5 text-sky-400" />
              </div>
              <h3 className="text-base font-bold">Transparent G-Codes</h3>
              <p className="mt-1 text-xs text-white/75">
                Each ticket features a verified public G-Code (G1, G2, G3) for instant verification via WhatsApp.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition-all hover:bg-white/10">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Users className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="text-base font-bold">Instant Agent Booking</h3>
              <p className="mt-1 text-xs text-white/75">
                Pre-filled WhatsApp inquiries connect you straight to dedicated group ticketing specialists in seconds.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Popular Group Sectors Section */}
        {availableSectors.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground">Popular Group Sectors</h2>
                <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                  Explore active group inventory by sector. Click any sector to view all available flight dates.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {availableSectors.slice(0, 6).map((sec) => {
                const fromCity = airportCity(sec.from);
                const toCity = airportCity(sec.to);
                const isSelected = searchFilters.from === sec.from && searchFilters.to === sec.to;
                return (
                  <Card
                    key={sec.sector}
                    className={cn(
                      "cursor-pointer overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                      isSelected ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border/80 bg-card hover:border-primary/40",
                    )}
                    onClick={() => handleQuickSector(sec)}
                  >
                    <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-foreground">{sec.from}</span>
                          <ArrowRight className="h-4 w-4 text-primary" />
                          <span className="text-lg font-black text-foreground">{sec.to}</span>
                        </div>
                        <p className="truncate text-xs font-semibold text-muted-foreground mt-0.5">
                          {fromCity} to {toCity}
                        </p>
                        <Badge variant="secondary" className="mt-2 text-[10px] font-bold text-primary bg-primary/10">
                          {sec.count} group departure{sec.count === 1 ? "" : "s"}
                        </Badge>
                      </div>

                      <Button
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        className="rounded-xl text-xs font-bold shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickSector(sec);
                        }}
                      >
                        View Tickets
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* 6. How It Works Section */}
        <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 sm:p-10 space-y-6">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-foreground">How Group Ticketing Works</h2>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Simple, transparent wholesale seat booking in four convenient steps
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">
                1
              </span>
              <h3 className="text-sm font-bold text-foreground">Select Route or Sector</h3>
              <p className="text-xs text-muted-foreground">
                Search with origin and destination airports or choose from the dynamic Available Sectors dropdown.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">
                2
              </span>
              <h3 className="text-sm font-bold text-foreground">Review Dates & G-Code</h3>
              <p className="text-xs text-muted-foreground">
                Compare guaranteed fixed fares, baggage limits, and note the verified public G-Code on your preferred ticket.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">
                3
              </span>
              <h3 className="text-sm font-bold text-foreground">Tap WhatsApp Help</h3>
              <p className="text-xs text-muted-foreground">
                Click WhatsApp Help to launch a chat with your ticket G-Code, flight dates, and route details pre-filled.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">
                4
              </span>
              <h3 className="text-sm font-bold text-foreground">Instant Confirmation</h3>
              <p className="text-xs text-muted-foreground">
                A Travelian ticketing specialist confirms seat availability and issues your ticket with full support.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
