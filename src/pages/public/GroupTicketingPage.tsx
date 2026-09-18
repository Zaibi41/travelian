import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Check,
  Info,
  Luggage,
  Plane,
  RefreshCw,
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
import { GroupTicketingCategories } from "@/components/public/GroupTicketingCategories";
import { SearchTabs } from "@/components/public/SearchTabs";
import { whatsappUrl } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { airports } from "@/data/airports";
import { CURRENCIES, useLocale } from "@/contexts/LocaleContext";
import {
  buildGroupTicketSearchParams,
  fetchGroupTicketDetail,
  fetchGroupTickets,
  filterGroupTickets,
  ensureGroupTicketCollectionsLoaded,
  groupTicketCategoryLabel,
  groupTicketDisplayTitle,
  groupTicketPublicCollectionLabel,
  groupTicketWhatsAppMessage,
  maskGroupTicketForDisplay,
  parseGroupTicketSearchParams,
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

function limitText(value: string | null | undefined, maxLength: number) {
  const text = String(value || "").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
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
    <div className="grid gap-4">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-36 animate-pulse rounded-2xl bg-muted" />
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
  const categorySlug = active.categorySlug || group.categorySlug;
  const collectionLabel = groupTicketPublicCollectionLabel(categorySlug, active.categoryLabel);
  const message = groupTicketWhatsAppMessage(category, active);
  const fareTitle = display.displayTitle || collectionLabel || "Group Fare";
  const formattedPrice = formatFare(active.fare, active.currency, selectedCurrency);
  const journeyLegs = getJourneyLegs(active);
  const showStackedLegs = journeyLegs.length > 1;
  const routeSummary = journeyLegs.length === 1
    ? `${routeLabel(journeyLegs[0].origin)} → ${routeLabel(journeyLegs[0].destination)}`
    : (active.sector || "Group Flight");

  return (
    <Card className="overflow-hidden transition-all duration-300 border-0 shadow-card hover:shadow-hover">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col gap-2 sm:gap-3 md:flex-row md:items-start">
            {/* Airline Logo & Name */}
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3 md:w-[11rem] md:shrink-0 md:pt-1">
              <AirlineLogo
                airline={active.airlineName || active.airlineCode || "Airline"}
                flightNumber={group.flightNumber}
                imageUrl={active.airlineLogo}
                className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs sm:text-sm font-semibold text-foreground" title={active.airlineName || active.airlineCode || "Airline"}>
                  {limitText(active.airlineName || active.airlineCode || "Airline", 12)}
                </p>
                <Badge variant="secondary" className="mt-0.5 rounded-md border-0 text-[9px] sm:text-[10px] bg-slate-100 text-slate-600">
                  {collectionLabel}
                </Badge>
              </div>
            </div>

            {/* Desktop timeline */}
            <div className="hidden min-w-0 flex-1 md:block">
              {showStackedLegs ? (
                <div className="space-y-3">
                  {journeyLegs.map((leg) => (
                    <div key={leg.key} className="min-w-0 space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-primary">{leg.label}</p>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="min-w-0 shrink-0 basis-[8.75rem] text-left">
                          <p className="text-xl font-bold leading-none text-foreground">{formatFlightTime(leg.departureTime)}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">{formatFlightDate(leg.departureDate)}</p>
                          <p className="truncate text-xs text-muted-foreground" title={routeLabel(leg.origin)}>{routeLabel(leg.origin)}</p>
                        </div>
                        <div className="flex min-w-[5rem] flex-1 flex-col items-center px-1">
                          <span className="max-w-full truncate text-[10px] font-medium text-muted-foreground">{leg.duration || "Direct"}</span>
                          <div className="relative my-1.5 h-px w-full bg-border">
                            <div className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-primary bg-card" />
                            <div className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-primary" />
                          </div>
                          {leg.stopText && <span className="max-w-full truncate text-[10px] font-medium text-success" title={leg.stopText}>{leg.stopText}</span>}
                        </div>
                        <div className="min-w-0 shrink-0 basis-[8.75rem] text-left">
                          <p className="text-xl font-bold leading-none text-foreground">{formatFlightTime(leg.arrivalTime)}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">{formatFlightDate(leg.arrivalDate || leg.departureDate)}</p>
                          <p className="truncate text-xs text-muted-foreground" title={routeLabel(leg.destination)}>{routeLabel(leg.destination)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-w-0 items-center gap-3">
                  <div className="min-w-0 shrink-0 basis-[8.75rem] text-left">
                    <p className="text-xl font-bold leading-none text-foreground">{formatFlightTime(journeyLegs[0]?.departureTime)}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{formatFlightDate(journeyLegs[0]?.departureDate)}</p>
                    <p className="truncate text-xs text-muted-foreground" title={routeLabel(journeyLegs[0]?.origin)}>{routeLabel(journeyLegs[0]?.origin)}</p>
                  </div>
                  <div className="flex min-w-[5rem] flex-1 flex-col items-center px-1">
                    <span className="max-w-full truncate text-[10px] font-medium text-muted-foreground">{journeyLegs[0]?.duration || "Direct"}</span>
                    <div className="relative my-1.5 h-px w-full bg-border">
                      <div className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-primary bg-card" />
                      <div className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-primary" />
                    </div>
                    {journeyLegs[0]?.stopText && <span className="max-w-full truncate text-[10px] font-medium text-success" title={journeyLegs[0]?.stopText}>{journeyLegs[0]?.stopText}</span>}
                  </div>
                  <div className="min-w-0 shrink-0 basis-[8.75rem] text-left">
                    <p className="text-xl font-bold leading-none text-foreground">{formatFlightTime(journeyLegs[0]?.arrivalTime)}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{formatFlightDate(journeyLegs[0]?.arrivalDate || journeyLegs[0]?.departureDate)}</p>
                    <p className="truncate text-xs text-muted-foreground" title={routeLabel(journeyLegs[0]?.destination)}>{routeLabel(journeyLegs[0]?.destination)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile timeline */}
            <div className="min-w-0 flex-1 md:hidden">
              {showStackedLegs ? (
                <div className="space-y-2.5">
                  {journeyLegs.map((leg) => (
                    <div key={leg.key} className="min-w-0 rounded-xl bg-muted/40 px-3 py-2">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-primary">{leg.label}</p>
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="font-bold text-foreground">{formatFlightTime(leg.departureTime)}</span>
                        <span className="font-semibold text-foreground">{leg.origin}</span>
                        <span aria-hidden="true">──</span>
                        <span className="truncate">{leg.duration || "Direct"}</span>
                        <span aria-hidden="true">──</span>
                        <span className="font-bold text-foreground">{formatFlightTime(leg.arrivalTime)}</span>
                        <span className="font-semibold text-foreground">{leg.destination}</span>
                        <span>·</span>
                        <span className="truncate text-success">{leg.stopText || "Direct"}</span>
                        <span>·</span>
                        <span className="truncate">{formatFlightDate(leg.departureDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <div className="min-w-0 shrink-0 basis-[7.5rem] sm:basis-[8.75rem] text-left">
                    <p className="text-lg sm:text-xl font-bold leading-none text-foreground">{formatFlightTime(journeyLegs[0]?.departureTime)}</p>
                    <p className="mt-1 text-[10px] sm:text-[11px] text-muted-foreground">{formatFlightDate(journeyLegs[0]?.departureDate)}</p>
                    <p className="truncate text-[11px] sm:text-xs text-muted-foreground" title={routeLabel(journeyLegs[0]?.origin)}>{routeLabel(journeyLegs[0]?.origin)}</p>
                  </div>
                  <div className="flex min-w-[4rem] sm:min-w-[5rem] flex-1 flex-col items-center px-1">
                    <span className="max-w-full truncate text-[9px] sm:text-[10px] font-medium text-muted-foreground">{journeyLegs[0]?.duration || "Direct"}</span>
                    <div className="relative my-1.5 h-px w-full bg-border">
                      <div className="absolute left-0 top-1/2 h-2 w-2 sm:h-2.5 sm:w-2.5 -translate-y-1/2 rounded-full border-2 border-primary bg-card" />
                      <div className="absolute right-0 top-1/2 h-2 w-2 sm:h-2.5 sm:w-2.5 -translate-y-1/2 rounded-full bg-primary" />
                    </div>
                    {journeyLegs[0]?.stopText && <span className="max-w-full truncate text-[9px] sm:text-[10px] font-medium text-success" title={journeyLegs[0]?.stopText}>{journeyLegs[0]?.stopText}</span>}
                  </div>
                  <div className="min-w-0 shrink-0 basis-[7.5rem] sm:basis-[8.75rem] text-left">
                    <p className="text-lg sm:text-xl font-bold leading-none text-foreground">{formatFlightTime(journeyLegs[0]?.arrivalTime)}</p>
                    <p className="mt-1 text-[10px] sm:text-[11px] text-muted-foreground">{formatFlightDate(journeyLegs[0]?.arrivalDate || journeyLegs[0]?.departureDate)}</p>
                    <p className="truncate text-[11px] sm:text-xs text-muted-foreground" title={routeLabel(journeyLegs[0]?.destination)}>{routeLabel(journeyLegs[0]?.destination)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Flight Details Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-auto h-7 sm:h-8 shrink-0 rounded-lg px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold md:mt-1"
              onClick={() => {
                setFareDetailsTab("flight");
                setDetailOpen(true);
              }}
            >
              Flight Details
            </Button>
          </div>

          {/* Fare options table under the timeline */}
          <div className="overflow-hidden rounded-2xl border">
            {/* Desktop Table */}
            <table className="hidden w-full table-fixed border-collapse md:table">
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[19%]" />
                <col className="w-[22%]" />
                <col className="w-[19%]" />
                <col className="w-[20%]" />
              </colgroup>
              <thead className="bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <tr className="border-b">
                  <th className="px-4 py-2 text-left">Fare</th>
                  <th className="px-4 py-2 text-left">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <span className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>Meal</span>
                    </span>
                  </th>
                  <th className="px-4 py-2 text-left">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <span className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>Baggage</span>
                    </span>
                  </th>
                  <th className="px-3 py-2 text-center">Price</th>
                  <th className="px-3 py-2 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr className="bg-card text-sm">
                  <td className="min-w-0 px-4 py-3 align-middle">
                    <p className="truncate font-bold text-foreground" title={fareTitle}>{fareTitle}</p>
                    {active.seatsAvailable ? (
                      <p className="truncate text-xs text-muted-foreground">{active.seatsAvailable} seats left</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <p className="flex min-w-0 items-center gap-1.5 text-muted-foreground" title="Meal info not available">
                      <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">Meal info not available</span>
                    </p>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <p className="flex min-w-0 items-center gap-1.5 text-muted-foreground" title={active.baggage || "Baggage info not available"}>
                      <Luggage className={cn("h-3.5 w-3.5 shrink-0", active.baggage ? "text-emerald-600" : "text-muted-foreground opacity-50")} />
                      <span className="truncate">{active.baggage || "Baggage info not available"}</span>
                    </p>
                  </td>
                  <td className="overflow-hidden px-3 py-3 text-center align-middle">
                    <span className="block truncate whitespace-nowrap text-base font-black text-foreground" title={formattedPrice}>{formattedPrice}</span>
                  </td>
                  <td className="overflow-hidden px-3 py-3 text-right align-middle">
                    <a href={whatsappHref(message)} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="w-full min-w-0 justify-center gap-2 rounded-xl px-3">
                        <WhatsAppIcon className="h-4 w-4" /> WhatsApp Help
                      </Button>
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Mobile Fare Row */}
            <div className="divide-y md:hidden">
              <div className="bg-card px-4 py-4 text-sm space-y-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-foreground text-base" title={fareTitle}>{fareTitle}</p>
                  {active.seatsAvailable ? (
                    <p className="text-xs text-muted-foreground">{active.seatsAvailable} seats left</p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <p className="flex min-w-0 items-center gap-2 text-muted-foreground text-xs" title="Meal info not available">
                    <UtensilsCrossed className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">Meal info not available</span>
                  </p>
                  <p className="flex min-w-0 items-center gap-2 text-muted-foreground text-xs" title={active.baggage || "Baggage info not available"}>
                    <Luggage className={cn("h-4 w-4 shrink-0", active.baggage ? "text-emerald-600" : "text-muted-foreground opacity-50")} />
                    <span className="truncate">{active.baggage || "Baggage info not available"}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="whitespace-nowrap text-lg font-black text-primary">{formattedPrice}</p>
                  <a href={whatsappHref(message)} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" className="h-9 whitespace-nowrap rounded-xl gap-2 px-4 font-semibold">
                      <WhatsAppIcon className="h-4 w-4" /> WhatsApp Help
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
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
                <p className="truncate text-base font-black text-slate-950" title={`${active.airlineName || "Airline"} - ${group.flightNumber || ""}`}>
                  {active.airlineName || active.airlineCode || "Airline"} {group.flightNumber ? <><span className="text-slate-400">·</span> {group.flightNumber}</> : null}
                </p>
                <p className="mt-1 truncate text-xs font-semibold text-primary">
                  {routeSummary} <span className="text-slate-300">·</span> {collectionLabel}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="shrink-0 bg-white/60 px-4 pt-3 sm:px-5">
            <div className="grid overflow-hidden rounded-xl border border-primary/15 bg-white p-1 text-xs font-bold text-slate-600 shadow-sm sm:grid-cols-3">
              {([
                ["flight", "Flight Info"],
                ["rules", "Fare Rules"],
                ["baggage", "Baggage"],
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
                      <section key={leg.key || legIdx} className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm sm:p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-full bg-primary/5 px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
                            {leg.label}
                          </span>
                          <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-900 ring-1 ring-slate-100">
                            <AirlineLogo
                              airline={active.airlineName || "Airline"}
                              flightNumber={group.flightNumber}
                              imageUrl={active.airlineLogo}
                              className="h-6 w-6 shrink-0 rounded-md border-0 shadow-none ring-0"
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
                              {active.airlineName || active.airlineCode || "Airline"} · {leg.duration || "Direct"} · {leg.stopText || "Direct"}
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
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Fare</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{fareTitle}</p>
                    </div>
                    <div className="rounded-2xl border bg-card p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Baggage Allowance</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{active.baggage || "Baggage info not available"}</p>
                    </div>
                    <div className="rounded-2xl border bg-card p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Meal</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">Meal info not available</p>
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

function filterSummary(filters: { from?: string; to?: string; dateFrom?: string }) {
  const parts: string[] = [];
  if (filters.from && filters.to) parts.push(`${filters.from} to ${filters.to}`);
  else if (filters.from) parts.push(`from ${filters.from}`);
  else if (filters.to) parts.push(`to ${filters.to}`);
  if (filters.dateFrom) parts.push(`departing ${filters.dateFrom}`);
  if (!parts.length) return "Showing all available group tickets";
  return `Showing tickets ${parts.join(" · ")}`;
}

export default function GroupTicketingPage() {
  const { currency: selectedCurrency } = useLocale();
  const { category } = useParams();
  const selectedCategory = category || "all";
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchFilters = useMemo(() => parseGroupTicketSearchParams(searchParams), [searchParams]);
  const [groups, setGroups] = useState<GroupTicket[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const load = () => {
    const controller = new AbortController();
    setStatus("loading");
    fetchGroupTickets(selectedCategory, controller.signal)
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

  useEffect(load, [selectedCategory]);

  useEffect(() => {
    const controller = new AbortController();
    ensureGroupTicketCollectionsLoaded(controller.signal, true).catch(() => undefined);
    return () => controller.abort();
  }, []);

  const filteredGroups = useMemo(
    () => filterGroupTickets(groups, searchFilters),
    [groups, searchFilters],
  );

  const label = selectedCategory === "all"
    ? "All Available Group Tickets"
    : groupTicketCategoryLabel(selectedCategory);

  const handleSearch = (values: { from?: string; to?: string; dateFrom?: string }) => {
    const params = buildGroupTicketSearchParams(values);
    const basePath = selectedCategory === "all" ? "/group-ticketing" : `/group-ticketing/${selectedCategory}`;
    const query = params.toString();
    navigate(query ? `${basePath}?${query}` : basePath);
  };

  return (
    <div>
      <PageHeader title="Group Ticketing" tagline="Live group ticket availability from Travelian">
        <SearchTabs
          initialTab="group-ticketing"
          visibleTabIds={["flights", "group-ticketing", "hotels"]}
          groupInitialValues={searchFilters}
          onGroupSearch={handleSearch}
        />
      </PageHeader>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <GroupTicketingCategories compact />
        <div className="flex items-center justify-between gap-3">
          <div>
            {selectedCategory !== "all" && (
              <Link to="/group-ticketing" className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                <ArrowLeft className="h-4 w-4" /> All group tickets
              </Link>
            )}
            <h2 className="text-2xl font-bold text-foreground">{label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filterSummary(searchFilters)}
              {status === "success" ? ` · ${filteredGroups.length} ticket${filteredGroups.length === 1 ? "" : "s"}` : ""}
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>

        {status === "loading" && <SkeletonCards />}
        {status === "error" && (
          <div className="rounded-2xl border bg-card p-8 text-center shadow-card">
            <Info className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-bold">Group ticketing is temporarily unavailable</h2>
            <p className="mt-2 text-sm text-muted-foreground">The group ticketing service is temporarily unavailable. Please retry shortly or contact Travelian for the latest availability.</p>
            <Button className="mt-5 rounded-xl" onClick={load}>Retry</Button>
          </div>
        )}
        {status === "success" && filteredGroups.length === 0 && (
          <div className="rounded-2xl border bg-card p-8 text-center shadow-card">
            <Plane className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-bold">No group tickets match your search.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchFilters.from || searchFilters.to || searchFilters.dateFrom
                ? "Try different airports or dates, or clear the filters to browse all available group tickets."
                : "Please contact Travelian on WhatsApp for the latest group ticket availability."}
            </p>
            <a href={whatsappHref("Hello Travelian, please share the latest group ticket availability.")} target="_blank" rel="noreferrer">
              <Button className="mt-5 rounded-xl bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp-hover">
                <WhatsAppIcon className="mr-2 h-4 w-4" /> WhatsApp Travelian
              </Button>
            </a>
          </div>
        )}
        {status === "success" && filteredGroups.length > 0 && (
          <div className="grid gap-4">
            {filteredGroups.map((group, index) => (
              <GroupCard
                key={group.id}
                group={group}
                category={label}
                index={index}
                selectedCurrency={selectedCurrency}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

