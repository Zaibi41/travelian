import { MAX_MULTI_CITY_FLIGHTS } from "@/lib/flight-search-limits";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { CalendarPopup, CalendarPopupContent, CalendarPopupTrigger } from "@/components/ui/calendar-popup";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plane, Search, Wifi, Coffee, ArrowLeftRight, Shield, Luggage, CalendarIcon, Pencil, Calculator, Clock, FileText, TimerReset, Utensils, UtensilsCrossed, ChevronDown, ChevronUp, Check, Users, Loader2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { SEO } from "@/components/SEO";
import { TravelersClassPicker, formatTravelers, type TravelersValue } from "@/components/public/TravelersClassPicker";
import { fetchFlightFares, hydrateSooperFareOptions, searchFlights, type FareOption, type TravelianFlight } from "@/lib/travelian-api";
import { AirportCombobox } from "@/components/public/AirportCombobox";
import { FlightSearchLoader } from "@/components/public/FlightSearchLoader";
import { CURRENCIES, useLocale, type CurrencyCode } from "@/contexts/LocaleContext";
import { AirlineLogo } from "@/components/public/AirlineLogo";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { formatDateOnly, parseDateOnly } from "@/lib/date-only";
import { whatsappUrl } from "@/lib/site-config";
import { airportByCode, loadPublicAirports } from "@/data/airports";
import { isGroupTicketingProvider, groupTicketToFlight } from "@/lib/provider-systems";
import { searchPublicGroups, GATEWAY_GROUP_PROVIDER } from "@/lib/public-booking";
import { normalizeAirlineName, isSameAirline, extractAllAirlines, getAirlineNameFromCarrier } from "@/lib/airline-normalization";

// Preload airports for routeLabel lookup
// The shared airport list (D36) loads once in the background; labels use it when ready, the popular list before.
void loadPublicAirports();
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
  ].map(a => [a.code, a])
);

type FlightTripType = "oneway" | "roundtrip" | "multicity";
type FlightSegment = { from: string; to: string; date: Date | undefined };
type DisplayFare = {
  tier: string;
  price: { currency?: string; total: number; base?: number | null; taxes?: number | null };
  bags?: string | null;
  meal?: string | null;
  refund?: string | null;
  change?: string | null;
  noShow?: string | null;
  cancellation?: string | null;
  conditions?: string | null;
  amenities?: string[];
};
type FareDetailsTab = "options" | "flight" | "rules" | "baggage";
type ItinerarySegment = NonNullable<TravelianFlight["segments"]>[number];
type DisplayJourneyLeg = {
  key: string;
  label: string;
  departureTime: string;
  arrivalTime: string;
  origin: string;
  destination: string;
  originAirport?: string | null;
  destinationAirport?: string | null;
  duration?: string;
  stopText?: string;
};
const SEARCH_RESULT_TTL_SECONDS = 900;

const sortOptions = [
  { value: "price-asc", label: "Price - Low to High" },
  { value: "price-desc", label: "Price - High to Low" },
  { value: "duration-asc", label: "Shortest Duration" },
  { value: "duration-desc", label: "Longest Duration" },
  { value: "departure-asc", label: "Departure - Early to Late" },
];

function tripTypeFromParam(value: string | null): FlightTripType {
  return value === "roundtrip" || value === "multicity" ? value : "oneway";
}

function segmentsFromParam(value: string | null): FlightSegment[] {
  if (!value) return [];
  try {
    const segments = JSON.parse(value);
    return Array.isArray(segments)
      ? segments.map((segment) => ({
        from: String(segment.from || ""),
        to: String(segment.to || ""),
        date: parseDateOnly(segment.date),
      }))
      : [];
  } catch {
    return [];
  }
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function clampToToday(date: Date | undefined) {
  const today = startOfLocalDay(new Date());
  if (!date) return today;
  return startOfLocalDay(date) < today ? today : date;
}

function consolidateFlights(list: TravelianFlight[]): TravelianFlight[] {
  const byKey = new Map<string, TravelianFlight>();
  for (const f of list) {
    const flightNo = String(f.flightNumber || "").trim().toLowerCase();
    const depart = String(f.departureTime || "").trim().toLowerCase();
    const orig = String(f.origin || "").trim().toLowerCase();
    const dest = String(f.destination || "").trim().toLowerCase();
    const key = `${flightNo}-${orig}-${dest}-${depart}`;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...f, fareOptions: f.fareOptions ? [...f.fareOptions] : [] });
    } else {
      const existingOptions = existing.fareOptions || [];
      const newOptions = f.fareOptions || [];
      const combined = [...existingOptions];
      for (const opt of newOptions) {
        const optKey = `${opt.tier}-${opt.bags}`.toLowerCase();
        if (!combined.some((o) => `${o.tier}-${o.bags}`.toLowerCase() === optKey)) {
          combined.push(opt);
        }
      }
      existing.fareOptions = combined;
      if (f.price && (!existing.price || f.price < existing.price)) {
        existing.price = f.price;
      }
    }
  }
  return Array.from(byKey.values());
}

export default function PublicFlightsPage({ bookingPath = "/booking", adminMode = false }: { bookingPath?: string; adminMode?: boolean } = {}) {
  const { currency: selectedCurrency } = useLocale();
  const [params, setParams] = useSearchParams();
  const initFrom = params.get("from") || "LHE";
  const initTo = params.get("to") || "JED";
  // Accept both `depart` (canonical) and `date` (used by older booking-flow links)
  const initDateStr = params.get("depart") || params.get("date");
  const initReturnDateStr = params.get("return");
  const initTripType = tripTypeFromParam(params.get("trip"));
  const initCabin = params.get("cabin") || "Economy";
  const initCurrency = (params.get("currency") as CurrencyCode) || selectedCurrency || "PKR";
  const initAdults = parseInt(params.get("adults") || "1") || 1;
  const initChildren = parseInt(params.get("children") || "0") || 0;
  const initInfants = parseInt(params.get("infants") || "0") || 0;
  const initDate = clampToToday(parseDateOnly(initDateStr));
  const initReturnDate = parseDateOnly(initReturnDateStr);
  const initSegments = segmentsFromParam(params.get("segments"));

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(initFrom);
  const [to, setTo] = useState(initTo);
  const [currency, setSearchCurrency] = useState<CurrencyCode>(initCurrency);
  const [travelers, setTravelers] = useState<TravelersValue>({
    adults: initAdults, children: initChildren, infants: initInfants, cabin: initCabin,
  });
  // Admin: no range until results arrive, then the full range of the results (no 0–700 jump).
  const [priceRangeState, setPriceRange] = useState<number[] | null>(adminMode ? null : [0, 700]);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [selectedStops, setSelectedStops] = useState<string[]>([]);
  const [selectedDepartureTimes, setSelectedDepartureTimes] = useState<string[]>([]);
  const [sort, setSort] = useState("price-asc");
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
  const [departDate, setDepartDate] = useState<Date>(initDate);
  const [returnDate, setReturnDate] = useState<Date | undefined>(initReturnDate);
  const [tripType, setTripType] = useState<FlightTripType>(initTripType);
  const [segments, setSegments] = useState<FlightSegment[]>(initSegments);
  const [modifyOpen, setModifyOpen] = useState(false);
  const [apiFlights, setApiFlights] = useState<TravelianFlight[]>([]);
  const [apiStatus, setApiStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [apiMessage, setApiMessage] = useState("");
  const [expirySeconds, setExpirySeconds] = useState(0);
  const expiryReloaded = useRef(false);
  const [fareCalculatorOpen, setFareCalculatorOpen] = useState(false);
  const [addToQuotations, setAddToQuotations] = useState(false);
  const [detailsFlight, setDetailsFlight] = useState<TravelianFlight | null>(null);
  const [fareDetails, setFareDetails] = useState<{ flight: TravelianFlight; fare: DisplayFare } | null>(null);
  const [fareDetailsTab, setFareDetailsTab] = useState<FareDetailsTab>("flight");
  const [expandedFareRule, setExpandedFareRule] = useState<string | null>(null);
  const [calculatorBase, setCalculatorBase] = useState("");
  const [calculatorTaxes, setCalculatorTaxes] = useState("");
  const [calculatorServiceFee, setCalculatorServiceFee] = useState("");
  const [searchRefreshKey, setSearchRefreshKey] = useState(0);
  const [dateFareMap, setDateFareMap] = useState<Record<string, { price: number; currency: string } | null>>({});
  const [modalFaresLoading, setModalFaresLoading] = useState(false);
  const [modalFaresError, setModalFaresError] = useState<string | null>(null);
  const [modalFaresCache, setModalFaresCache] = useState<Record<string, FareOption[]>>({});

  // Modal-local edit state
  const [editFrom, setEditFrom] = useState(from);
  const [editTo, setEditTo] = useState(to);
  const [editDate, setEditDate] = useState<Date | undefined>(departDate);
  const [editReturnDate, setEditReturnDate] = useState<Date | undefined>(returnDate);
  const [editTripType, setEditTripType] = useState<FlightTripType>(tripType);
  const [editSegments, setEditSegments] = useState<FlightSegment[]>(segments);
  const [editTravelers, setEditTravelers] = useState<TravelersValue>(travelers);
  const [editDateOpen, setEditDateOpen] = useState(false);
  const [editReturnDateOpen, setEditReturnDateOpen] = useState(false);
  const [editSegmentDateOpen, setEditSegmentDateOpen] = useState<number | null>(null);

  const openModify = () => {
    setEditFrom(from);
    setEditTo(to);
    setEditDate(departDate);
    setEditReturnDate(returnDate);
    setEditTripType(tripType);
    setEditSegments(segments.length ? segments : [
      { from, to, date: departDate },
      { from: to, to: "", date: returnDate },
    ]);
    setEditTravelers(travelers);
    setModifyOpen(true);
  };

  const applyModify = () => {
    const effectiveSegments = editTripType === "multicity" ? editSegments : [];
    if (editTripType === "roundtrip" && (!editReturnDate || (editDate && editReturnDate < editDate))) {
      setApiMessage("Select a return date on or after the departure date.");
      return;
    }
    if (editTripType === "multicity" && (effectiveSegments.length < 2 || effectiveSegments.some((segment) => !/^[A-Z]{3}$/.test(segment.from) || !/^[A-Z]{3}$/.test(segment.to) || segment.from === segment.to || !segment.date))) {
      setApiMessage("Complete each multi-city flight with different airports and a travel date.");
      return;
    }
    const firstSegment = effectiveSegments[0];
    const effectiveFrom = firstSegment?.from || editFrom;
    const effectiveTo = firstSegment?.to || editTo;
    const effectiveDate = clampToToday(firstSegment?.date || editDate || departDate);
    setFrom(effectiveFrom);
    setTo(effectiveTo);
    setDepartDate(effectiveDate);
    setReturnDate(editTripType === "roundtrip" ? editReturnDate : undefined);
    setTripType(editTripType);
    setSegments(effectiveSegments);
    setTravelers(editTravelers);
    setSearchCurrency(currency);
    setSelectedAirlines([]);
    setSelectedStops([]);
    setSelectedDepartureTimes([]);
    setSelectedFlight(null);
    setParams(new URLSearchParams({
      from: effectiveFrom,
      to: effectiveTo,
      depart: formatDateOnly(effectiveDate),
      trip: editTripType,
      ...(editTripType === "roundtrip" && editReturnDate ? { return: formatDateOnly(editReturnDate) } : {}),
      ...(editTripType === "multicity" ? {
        segments: JSON.stringify(effectiveSegments.map((segment) => ({
          from: segment.from,
          to: segment.to,
          date: segment.date ? formatDateOnly(segment.date) : "",
        }))),
      } : {}),
      adults: String(editTravelers.adults),
      children: String(editTravelers.children),
      infants: String(editTravelers.infants),
      cabin: editTravelers.cabin,
      currency,
    }), { replace: true });
    setModifyOpen(false);
  };

  const swapEdit = () => {
    setEditFrom(editTo);
    setEditTo(editFrom);
  };

  const toggleAirline = (a: string) => {
    const canonical = normalizeAirlineName(a);
    setSelectedAirlines(prev =>
      prev.some(x => isSameAirline(x, canonical))
        ? prev.filter(x => !isSameAirline(x, canonical))
        : [...prev, canonical]
    );
  };
  const toggleStopFilter = (value: string) => setSelectedStops(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]);
  const toggleDepartureTimeFilter = (value: string) => setSelectedDepartureTimes(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]);

  const [, setProviderUpdateCounter] = useState(0);
  useEffect(() => {
    const onProviderChanged = () => setProviderUpdateCounter((c) => c + 1);
    window.addEventListener("travelian:provider-systems-changed", onProviderChanged);
    window.addEventListener("storage", onProviderChanged);
    return () => {
      window.removeEventListener("travelian:provider-systems-changed", onProviderChanged);
      window.removeEventListener("storage", onProviderChanged);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setApiStatus("loading");
    setApiMessage("Searching live providers...");

    // Persist recent searches for future quick-access surfaces.
    try {
      const key = "travelian.recentFlightSearches";
      const raw = localStorage.getItem(key);
      const list: Array<{ from: string; to: string; depart: string; travelers: string; ts: number }> = raw ? JSON.parse(raw) : [];
      const entry = { from, to, depart: formatDateOnly(departDate), travelers: formatTravelers(travelers), ts: Date.now() };
      const dedup = [entry, ...list.filter(x => !(x.from === entry.from && x.to === entry.to && x.depart === entry.depart))].slice(0, 6);
      localStorage.setItem(key, JSON.stringify(dedup));
    } catch { /* localStorage unavailable */ }

    const departDateStr = formatDateOnly(departDate);
    const originAirport = from.trim().toUpperCase();
    const destAirport = to.trim().toUpperCase();
    const adultsCount = Number(travelers.adults ?? 1);
    const childrenCount = Number(travelers.children ?? 0);
    const infantsCount = Number(travelers.infants ?? 0);
    // Group fares are adults only (any number of adults).
    const isAdultsOnly = childrenCount === 0 && infantsCount === 0;

    Promise.allSettled([
      searchFlights({
        from,
        to,
        tripType,
        departureDate: departDateStr,
        returnDate: returnDate ? formatDateOnly(returnDate) : undefined,
        segments: segments.map((segment) => ({
          from: segment.from,
          to: segment.to,
          date: segment.date ? formatDateOnly(segment.date) : "",
        })),
        cabin: travelers.cabin,
        currency,
        passengers: {
          adults: travelers.adults,
          children: travelers.children,
          infants: travelers.infants,
        },
      }, controller.signal),
      (isAdultsOnly
        ? searchPublicGroups({ origin: originAirport, destination: destAirport, departureDate: departDateStr, adults: adultsCount }, controller.signal)
        : Promise.resolve([])),
    ])
      .then(async ([flightsOutcome, groupsOutcome]) => {
        if (controller.signal.aborted) return;
        let flightsList: TravelianFlight[] = [];
        if (flightsOutcome.status === "fulfilled") {
          flightsList = flightsOutcome.value.flights;
        }

        // Group fares come only from the Travelian gateway (bookable, priced by Travelian); the legacy results' group fares are dropped.
        flightsList = flightsList.filter((f) =>
          !isGroupTicketingProvider(f.provider) &&
          f.fareBrand !== "Group Ticket" &&
          !f.flightId.startsWith("group-")
        );
        if (isAdultsOnly && groupsOutcome.status === "fulfilled") {
          flightsList.push(...groupsOutcome.value.map(groupTicketToFlight));
        }

        if (flightsOutcome.status === "rejected" && flightsList.length === 0) {
          const err = flightsOutcome.reason;
          setApiFlights([]);
          setPriceRange(adminMode ? null : [0, 700]);
          setApiStatus("error");
          setApiMessage(err instanceof Error ? err.message : "Live flight search is unavailable. Please modify your search and try again.");
          setExpirySeconds(0);
          return;
        }

        const consolidated = consolidateFlights(flightsList);

        // Render search results immediately with zero background fare overhead
        setApiFlights(consolidated);
        const liveMaxPrice = Math.max(700, ...consolidated.map((f) => f.price));
        setPriceRange(adminMode ? null : [0, Math.ceil(liveMaxPrice / 1000) * 1000]);
        setApiStatus("success");
        setApiMessage(consolidated.length ? "" : "No live bookable fares returned for this search.");
        setExpirySeconds(consolidated.length ? SEARCH_RESULT_TTL_SECONDS : 0);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setApiFlights([]);
        setPriceRange(adminMode ? null : [0, 700]);
        setApiStatus("error");
        setApiMessage(error instanceof Error ? error.message : "Live flight search is unavailable. Please modify your search and try again.");
        setExpirySeconds(0);
      });

    return () => controller.abort();
  }, [from, to, departDate, returnDate, tripType, segments, travelers, currency, searchRefreshKey]);

  useEffect(() => {
    if (expirySeconds <= 0 || apiStatus !== "success") return;
    const interval = window.setInterval(() => setExpirySeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(interval);
  }, [apiStatus, expirySeconds]);


  useEffect(() => {
    if (expirySeconds > 0) {
      expiryReloaded.current = false;
      return;
    }
    if (!adminMode && apiStatus === "success" && apiFlights.length > 0 && !expiryReloaded.current) {
      expiryReloaded.current = true;
      window.location.reload();
    }
  }, [adminMode, apiStatus, apiFlights.length, expirySeconds]);

  const flights = apiFlights;
  const maxPrice = Math.max(700, ...flights.map(f => f.price));
  const priceRange = priceRangeState ?? [0, Math.max(700, Math.ceil(maxPrice / 1000) * 1000)];

  // Group fares are adults only (any number of adults).
  const isAdultsOnly = Number(travelers.children ?? 0) === 0 && Number(travelers.infants ?? 0) === 0;

  let filtered = flights.filter(f => {
    if (!isAdultsOnly) {
      const isGroup = isGroupTicketingProvider(f.provider) || f.fareBrand === "Group Ticket" || f.flightId.startsWith("group-");
      if (isGroup) return false;
    }
    if (search) {
      const q = search.toLowerCase().trim();
      const qCompact = q.replace(/[^a-z0-9]/g, "");
      const airlineCompact = (f.airline || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const matchSearch =
        f.origin.toLowerCase().includes(q) ||
        f.destination.toLowerCase().includes(q) ||
        f.airline.toLowerCase().includes(q) ||
        (qCompact.length > 0 && airlineCompact.includes(qCompact));
      if (!matchSearch) return false;
    }
    if (f.price < priceRange[0] || f.price > priceRange[1]) return false;
    if (selectedAirlines.length > 0 && !selectedAirlines.some(selected => isSameAirline(selected, f.airline))) return false;
    if (selectedStops.length > 0) {
      const stops = f.stops || 0;
      const stopKey = stops === 0 ? "nonstop" : stops === 1 ? "1stop" : "2plus";
      if (!selectedStops.includes(stopKey)) return false;
    }
    if (selectedDepartureTimes.length > 0) {
      const timePart = String(f.departureTime || "").match(/\b(\d{1,2}):\d{2}\b/)?.[1];
      const hour = Number(timePart);
      if (!Number.isFinite(hour)) return false;
      const departureKey = hour < 6 ? "early" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
      if (!selectedDepartureTimes.includes(departureKey)) return false;
    }
    return true;
  });

  const durationMs = (flight: TravelianFlight) => new Date(flight.arrivalTimestamp || flight.arrivalTime).getTime() - new Date(flight.departureTimestamp || flight.departureTime).getTime();
  const departureMs = (flight: TravelianFlight) => new Date(flight.departureTimestamp || flight.departureTime).getTime();
  if (sort === "price-asc") filtered.sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") filtered.sort((a, b) => b.price - a.price);
  else if (sort === "duration-asc") filtered.sort((a, b) => {
    const aDuration = durationMs(a);
    const bDuration = durationMs(b);
    if (!Number.isFinite(aDuration)) return 1;
    if (!Number.isFinite(bDuration)) return -1;
    return aDuration - bDuration;
  });
  else if (sort === "duration-desc") filtered.sort((a, b) => {
    const aDuration = durationMs(a);
    const bDuration = durationMs(b);
    if (!Number.isFinite(aDuration)) return 1;
    if (!Number.isFinite(bDuration)) return -1;
    return bDuration - aDuration;
  });
  else if (sort === "departure-asc") filtered.sort((a, b) => {
    const aDeparture = departureMs(a);
    const bDeparture = departureMs(b);
    if (!Number.isFinite(aDeparture)) return 1;
    if (!Number.isFinite(bDeparture)) return -1;
    return aDeparture - bDeparture;
  });

  const getDuration = (dep: string, arr: string) => {
    const ms = new Date(arr).getTime() - new Date(dep).getTime();
    if (!Number.isFinite(ms) || ms < 0) return "Duration TBA";
    return `${Math.floor(ms / 3600000)}h ${Math.round((ms % 3600000) / 60000)}m`;
  };
  const getFlightDuration = (flight: TravelianFlight) => flight.duration || getDuration(
    flight.departureTimestamp || flight.departureTime,
    flight.arrivalTimestamp || flight.arrivalTime,
  );

  const RATE_PER_USD: Record<string, number> = {
    ...Object.fromEntries(CURRENCIES.map((c) => [c.code, c.rate])),
    INR: 83,
  };
  const formatFare = (price: number, srcCurrency = "PKR") => {
    const src = String(srcCurrency || "PKR").toUpperCase();
    const dst = (selectedCurrency || "PKR").toUpperCase();
    const fromRate = RATE_PER_USD[src] ?? RATE_PER_USD[dst] ?? 1;
    const toRate = RATE_PER_USD[dst] ?? fromRate;
    const converted = src === dst ? price : (price / fromRate) * toRate;
    return `${dst} ${Math.round(converted).toLocaleString()}`;
  };

  const isUnclearDisplayValue = (value: unknown) => {
    const text = String(value || "").trim();
    return !text || /^(null|undefined|n\/a|na|-|none|not available|see supplier details|subject to supplier rules|meal info not available|baggage info not available)$/i.test(text);
  };

  const cleanFareText = (value: unknown, fallback: string) => {
    const text = String(value || "").trim();
    if (isUnclearDisplayValue(text)) return fallback;
    return text;
  };

  const isGdsBrandCarrier = (airline?: string | null, code?: string | null) => {
    const c = String(code || "").trim().toUpperCase();
    const a = String(airline || "").trim().toLowerCase();
    return ["QR", "SV", "GF", "EK"].includes(c) || /qatar|saudia|saudi arabian|gulf air|emirates/i.test(a);
  };

  const cleanFareTier = (value: unknown, fallback: string, flight: TravelianFlight) => {
    const text = cleanFareText(value, fallback);
    if (isGdsBrandCarrier(flight.airline, flight.airlineCode)) {
      return text.replace(/\s*\([A-Z0-9]{1,2}\)$/i, "").trim() || text;
    }
    return text;
  };

  const mealLabel = (fare: DisplayFare, flight: TravelianFlight) => {
    const meal = cleanFareText(fare.meal || flight.meal, "No Meal");
    if (/included|available|yes/i.test(meal)) return "Meal";
    return meal === "No Meal" ? "No Meal" : "Meal";
  };

  const baggageLabel = (fare: DisplayFare, flight: TravelianFlight) => {
    if (/nil baggage/i.test(fare.tier)) return "7 KG";
    const baggage = cleanFareText(fare.bags || flight.baggage, "7 KG");
    return /^nil(?: baggage)?$/i.test(baggage) ? "7 KG" : baggage;
  };

  const hasMeal = (fare: DisplayFare, flight: TravelianFlight) => mealLabel(fare, flight) !== "No Meal";
  const hasBaggage = (fare: DisplayFare, flight: TravelianFlight) => baggageLabel(fare, flight) !== "No Baggage";

  const fareRows = (flight: TravelianFlight): DisplayFare[] => {
    if (flight.fareOptions?.length) {
      return flight.fareOptions.map((fare) => ({
        tier: cleanFareTier(fare.tier, flight.fareBrand || "Fare option", flight),
        price: fare.price,
        bags: fare.bags,
        meal: fare.meal || flight.meal,
        refund: fare.refund,
        change: fare.change,
        noShow: (fare as DisplayFare).noShow,
        cancellation: (fare as DisplayFare).cancellation || fare.refund,
        conditions: (fare as DisplayFare).conditions,
        amenities: fare.amenities,
      })).sort((a, b) => a.price.total - b.price.total);
    }
    const isNonRefundable = flight.refundable === false;
    return [{
      tier: cleanFareTier(flight.fareBrand, "Fare option", flight),
      price: { currency: flight.currency, total: flight.price },
      bags: flight.baggage,
      meal: flight.meal,
      refund: isNonRefundable ? "Non-refundable as per airline policy." : "Refundable subject to airline fare conditions.",
      change: "Permitted subject to airline date change fees and fare difference.",
      noShow: "",
      cancellation: isNonRefundable ? "Non-refundable as per airline policy." : "Refundable subject to airline fare conditions.",
      conditions: "",
      amenities: [],
    }];
  };

  const stopLabel = (flight: TravelianFlight) => {
    const stops = flight.stops || 0;
    const via = (flight.layovers || []).map((layover) => String(layover.location || "").trim()).filter(Boolean);
    if (!stops) return "";
    const stopText = `${stops} Stop${stops === 1 ? "" : "s"}`;
    return via.length ? `${stopText} (${via.join(", ")})` : stopText;
  };

  const limitText = (value: string | null | undefined, maxLength: number) => {
    const text = String(value || "").trim();
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  const formatFlightTime = (value?: string | null) => {
    const time = String(value || "").split(" ")[1] || "TBA";
    // Remove seconds if present (HH:MM:SS -> HH:MM)
    if (time.includes(":")) {
      const parts = time.split(":");
      if (parts.length === 3) return `${parts[0]}:${parts[1]}`;
    }
    return time;
  };
  const formatFlightDate = (value?: string | null) => {
    const text = String(value || "");
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) return format(date, "dd MMM yyyy");
    const [datePart] = text.split(" ");
    const parsed = parseDateOnly(datePart);
    return parsed ? format(parsed, "dd MMM yyyy") : format(departDate, "dd MMM yyyy");
  };

  const formatFlightDateTimeLabel = (value?: string | null) => {
    const text = String(value || "");
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) return format(date, "dd MMM, yyyy hh:mm a");
    return text || "TBA";
  };

  const formatProviderName = (provider?: string) => {
    const key = String(provider || "").trim().toLowerCase();
    if (!key) return "";
    return key.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const formatProviderGroup = (_provider?: string) => "Live API";

  const expiryLabel = `${Math.floor(expirySeconds / 60)}:${String(expirySeconds % 60).padStart(2, "0")}`;
  const searchExpired = apiStatus === "success" && flights.length > 0 && expirySeconds === 0;
  const calculatorTotal = (Number(calculatorBase) || 0) + (Number(calculatorTaxes) || 0) + (Number(calculatorServiceFee) || 0);

  const flightWhatsAppHref = (flight: TravelianFlight) => {
    const message = [
      "Hello Travelian,",
      "",
      "I need help with this flight:",
      "",
      `Airline: ${flight.airline}`,
      `Flight: ${flight.flightNumber}`,
      `Route: ${flight.origin} to ${flight.destination}`,
      `Date: ${format(departDate, "MMM dd, yyyy")}`,
      `Cabin: ${flight.class}`,
      `Fare: ${formatFare(flight.price, flight.currency)}`,
      "",
      "Please guide me with booking details.",
    ].join("\n");
    return whatsappUrl(message);
  };

  const fareWhatsAppHref = (flight: TravelianFlight, fare: DisplayFare) => {
    const message = [
      "Hello Travelian,",
      "",
      "I need help with this fare option:",
      "",
      `Airline: ${flight.airline}`,
      `Flight: ${flight.flightNumber}`,
      `Route: ${flight.origin} to ${flight.destination}`,
      `Date: ${format(departDate, "MMM dd, yyyy")}`,
      `Cabin: ${flight.class}`,
      `Fare option: ${fare.tier}`,
      `Baggage: ${baggageLabel(fare, flight)}`,
      `Meal: ${mealLabel(fare, flight)}`,
      `Fare: ${formatFare(fare.price.total, fare.price.currency || flight.currency)}`,
      "",
      "Please guide me with booking details.",
    ].join("\n");
    return whatsappUrl(message);
  };

  const bookingHref = (flight: TravelianFlight, fare?: { tier: string; price: { base?: number | null; taxes?: number | null; total: number; currency?: string }; amenities?: string[] }) => {
    if (adminMode) {
      // Admin checkout never takes a price or supplier flight ID from the URL: the gateway
      // must reprice the fare (booking is blocked until it can). Itinerary only.
      const query = new URLSearchParams({
        type: "flight", airline: flight.airline, flightNo: flight.flightNumber, from: flight.origin, to: flight.destination,
        date: format(departDate, "MMM dd, yyyy"), cabin: flight.class, trip: tripType,
        adults: String(travelers.adults), children: String(travelers.children), infants: String(travelers.infants),
      });
      if (fare?.tier) query.set("fare", fare.tier);
      if (flight.segments?.length) query.set("segments", JSON.stringify(flight.segments.map(({ flightNumber, origin, destination, departureTime, arrivalTime }) => ({ flightNumber, origin, destination, departureTime, arrivalTime }))));
      if (tripType === "roundtrip" && returnDate) query.set("return", format(returnDate, "MMM dd, yyyy"));
      return `${bookingPath}?${query.toString()}`;
    }
    const query = new URLSearchParams({
      type: "flight",
      flightId: flight.flightId,
      airline: flight.airline,
      flightNo: flight.flightNumber,
      from: flight.origin,
      to: flight.destination,
      date: format(departDate, "MMM dd, yyyy"),
      cabin: flight.class,
      trip: tripType,
      adults: String(travelers.adults),
      children: String(travelers.children),
      infants: String(travelers.infants),
      price: String(fare?.price.total ?? flight.price),
      currency: fare?.price.currency || flight.currency || "PKR",
    });
    if (fare?.tier) query.set("fare", fare.tier);
    // A group fare from the Travelian gateway: booked and priced by the gateway (the price here is for display only).
    if (flight.provider === GATEWAY_GROUP_PROVIDER && flight.offerId) query.set("groupTicketId", String(flight.offerId));
    if (Number.isFinite(Number(fare?.price.base))) query.set("baseFare", String(fare?.price.base));
    if (Number.isFinite(Number(fare?.price.taxes))) query.set("taxes", String(fare?.price.taxes));
    if (fare?.amenities?.length) query.set("farePerks", fare.amenities.join("|"));
    if (flight.layovers?.length) query.set("layovers", JSON.stringify(flight.layovers));
    if (flight.segments?.length) query.set("segments", JSON.stringify(flight.segments));
    if (tripType === "roundtrip" && returnDate) query.set("return", format(returnDate, "MMM dd, yyyy"));
    return `${bookingPath}?${query.toString()}`;
  };

  const bestFlight = filtered.length > 0 ? filtered.reduce((best, f) => f.price < best.price ? f : best, filtered[0]) : null;
  const fastestFlight = filtered.length > 0 ? filtered.reduce((fast, f) => {
    const fDur = durationMs(f);
    const fastDur = durationMs(fast);
    if (!Number.isFinite(fDur)) return fast;
    if (!Number.isFinite(fastDur)) return f;
    return fDur < fastDur ? f : fast;
  }, filtered[0]) : null;

  // Seven bookable dates. Past travel dates are never shown as search options.
  const dateFlexDays = useMemo(() => {
    const today = startOfLocalDay(new Date());
    const selected = startOfLocalDay(departDate);
    const daysFromToday = Math.max(0, Math.floor((selected.getTime() - today.getTime()) / 86400000));
    const start = selected <= today ? today : addDays(selected, -Math.min(3, daysFromToday));
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(start, i);
      return { date: d };
    });
  }, [departDate]);

  useEffect(() => {
    if (tripType === "multicity") {
      setDateFareMap({});
      return;
    }

    const controller = new AbortController();
    const selectedKey = formatDateOnly(departDate);
    const candidateDates = dateFlexDays
      .map((day) => formatDateOnly(day.date))
      .filter((dateKey) => dateKey !== selectedKey);

    if (!candidateDates.length) return () => controller.abort();

    setDateFareMap(Object.fromEntries(candidateDates.map((dateKey) => [dateKey, null])));

    (async () => {
      for (const dateKey of candidateDates) {
        if (controller.signal.aborted) return;
        try {
          const result = await searchFlights({
            from,
            to,
            tripType,
            departureDate: dateKey,
            returnDate: returnDate ? formatDateOnly(returnDate) : undefined,
            segments: [],
            cabin: travelers.cabin,
            currency,
            passengers: {
              adults: travelers.adults,
              children: travelers.children,
              infants: travelers.infants,
            },
          }, controller.signal);
          const best = result.flights.reduce<TravelianFlight | null>((currentBest, flight) => (
            !currentBest || flight.price < currentBest.price ? flight : currentBest
          ), null);
          if (controller.signal.aborted) return;
          setDateFareMap((current) => ({
            ...current,
            [dateKey]: best ? { price: best.price, currency: best.currency || currency } : null,
          }));
        } catch {
          if (controller.signal.aborted) return;
        }
      }
    })();

    return () => controller.abort();
  }, [dateFlexDays, departDate, from, to, tripType, returnDate, travelers, currency]);

  const airlineOptions = useMemo(() => {
    const set = new Set<string>();
    for (const f of flights) {
      const airlines = extractAllAirlines(f.airline);
      for (const a of airlines) {
        const canonical = normalizeAirlineName(a);
        if (canonical) set.add(canonical);
      }
    }
    return Array.from(set).sort();
  }, [flights]);
  const stopOptions = [
    { value: "nonstop", label: "Non-stop" },
    { value: "1stop", label: "1 Stop" },
    { value: "2plus", label: "2+ Stops" },
  ];
  const departureTimeOptions = [
    { value: "early", label: "Early Morning (00-06)" },
    { value: "morning", label: "Morning (06-12)" },
    { value: "afternoon", label: "Afternoon (12-18)" },
    { value: "evening", label: "Evening (18-24)" },
  ];
  const activeFilterLabels = [
    ...selectedAirlines.map((airline) => ({ key: `airline-${airline}`, label: airline, onRemove: () => toggleAirline(airline) })),
    ...selectedStops.map((value) => ({ key: `stop-${value}`, label: stopOptions.find((option) => option.value === value)?.label || value, onRemove: () => toggleStopFilter(value) })),
    ...selectedDepartureTimes.map((value) => ({ key: `departure-${value}`, label: departureTimeOptions.find((option) => option.value === value)?.label || value, onRemove: () => toggleDepartureTimeFilter(value) })),
    ...(search ? [{ key: "search", label: `Search: ${search}`, onRemove: () => setSearch("") }] : []),
  ];
  const hasFilterChanges = activeFilterLabels.length > 0 || priceRange[0] > 0 || priceRange[1] < maxPrice;
  const tryDate = (date: Date) => {
    const safeDate = clampToToday(date);
    setDepartDate(safeDate);
    setSelectedAirlines([]);
    setSearch("");
    const next = new URLSearchParams(params);
    next.set("depart", formatDateOnly(safeDate));
    setParams(next, { replace: true });
  };
  const routeLabel = (code: string, airportName?: string | null) => {
    const cleanCode = String(code || "").trim().toUpperCase();
    // Show just "IATA City" instead of full airport name for consistency with SooperFare
    const airport = airportByCode(cleanCode) || popularAirportByCode.get(cleanCode);
    return airport ? `${cleanCode} ${airport.city}` : cleanCode;
  };
  const airportCode = (value?: string | null) => String(value || "").trim().toUpperCase();
  const firstSegment = (flight: TravelianFlight) => flight.segments?.[0];
  const lastSegment = (flight: TravelianFlight) => flight.segments?.[flight.segments.length - 1];
  const flightOriginLabel = (flight: TravelianFlight) => routeLabel(flight.origin, flight.originAirport || firstSegment(flight)?.departureAirport);
  const flightDestinationLabel = (flight: TravelianFlight) => routeLabel(flight.destination, flight.destinationAirport || lastSegment(flight)?.arrivalAirport);
  const itinerarySegments = (flight: TravelianFlight): ItinerarySegment[] => {
    if (flight.segments?.length) return flight.segments;
    return [{
      flightNumber: flight.flightNumber,
      carrier: flight.flightNumber.split("-")[0],
      origin: flight.origin,
      destination: flight.destination,
      departureAirport: flight.originAirport,
      arrivalAirport: flight.destinationAirport,
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
      departureTimestamp: flight.departureTimestamp,
      arrivalTimestamp: flight.arrivalTimestamp,
      duration: flight.duration,
    }];
  };
  const segmentDuration = (segment: ItinerarySegment) =>
    segment.duration || getDuration(segment.departureTimestamp || segment.departureTime || "", segment.arrivalTimestamp || segment.arrivalTime || "");
  const stopTextForSegments = (group: ItinerarySegment[]) => {
    const stops = Math.max(group.length - 1, 0);
    if (!stops) return "Direct";
    const via = group.slice(0, -1).map((segment) => airportCode(segment.destination)).filter(Boolean);
    const label = `${stops} Stop${stops === 1 ? "" : "s"}`;
    return via.length ? `${label} (${via.join(", ")})` : label;
  };
  const legFromSegments = (group: ItinerarySegment[], label: string, key: string): DisplayJourneyLeg | null => {
    if (!group.length) return null;
    const first = group[0];
    const last = group[group.length - 1];
    return {
      key,
      label,
      departureTime: first.departureTime || "",
      arrivalTime: last.arrivalTime || "",
      origin: airportCode(first.origin),
      destination: airportCode(last.destination),
      originAirport: first.departureAirport,
      destinationAirport: last.arrivalAirport,
      duration: getDuration(first.departureTimestamp || first.departureTime || "", last.arrivalTimestamp || last.arrivalTime || ""),
      stopText: stopTextForSegments(group),
    };
  };
  const splitRoundtripSegments = (flight: TravelianFlight) => {
    const segs = itinerarySegments(flight);
    const destination = airportCode(flight.destination);
    let splitAt = -1;
    for (let index = 0; index < segs.length; index += 1) {
      if (airportCode(segs[index].destination) === destination) {
        splitAt = index;
        break;
      }
    }
    if (splitAt < 0 || splitAt >= segs.length - 1) {
      return { outbound: segs, inbound: [] as ItinerarySegment[] };
    }
    return {
      outbound: segs.slice(0, splitAt + 1),
      inbound: segs.slice(splitAt + 1),
    };
  };
  const splitMulticitySegments = (flight: TravelianFlight) => {
    const segs = itinerarySegments(flight);
    const routeLegs = segments.length >= 2
      ? segments
      : [{ from: flight.origin, to: flight.destination, date: departDate }];
    const groups: ItinerarySegment[][] = [];
    let cursor = 0;
    for (const route of routeLegs) {
      const from = airportCode(route.from);
      const to = airportCode(route.to);
      while (cursor < segs.length && airportCode(segs[cursor].origin) !== from) cursor += 1;
      const start = cursor;
      while (cursor < segs.length) {
        const reached = airportCode(segs[cursor].destination) === to;
        cursor += 1;
        if (reached) break;
      }
      groups.push(segs.slice(start, cursor));
    }
    return groups.filter((group) => group.length);
  };
  const journeyLegsForCard = (flight: TravelianFlight): DisplayJourneyLeg[] => {
    if (tripType === "roundtrip") {
      const { outbound, inbound } = splitRoundtripSegments(flight);
      const outboundLeg = legFromSegments(outbound, "Outbound", `${flight.flightId}-out`)
        || {
          key: `${flight.flightId}-out`,
          label: "Outbound",
          departureTime: flight.departureTime,
          arrivalTime: flight.arrivalTime,
          origin: flight.origin,
          destination: flight.destination,
          originAirport: flight.originAirport,
          destinationAirport: flight.destinationAirport,
          duration: getFlightDuration(flight),
          stopText: stopLabel(flight) || "Direct",
        };
      const inboundLeg = inbound.length
        ? legFromSegments(inbound, "Return", `${flight.flightId}-ret`)
        : flight.returnDepartureTime && flight.returnArrivalTime
          ? {
            key: `${flight.flightId}-ret`,
            label: "Return",
            departureTime: flight.returnDepartureTime,
            arrivalTime: flight.returnArrivalTime,
            origin: flight.destination,
            destination: flight.origin,
            originAirport: flight.destinationAirport,
            destinationAirport: flight.originAirport,
            duration: getDuration(flight.returnDepartureTimestamp || flight.returnDepartureTime, flight.returnArrivalTimestamp || flight.returnArrivalTime),
            stopText: "Direct",
          }
          : null;
      return inboundLeg ? [outboundLeg, inboundLeg] : [outboundLeg];
    }

    if (tripType === "multicity") {
      const groups = splitMulticitySegments(flight);
      if (groups.length >= 2) {
        return groups
          .map((group, index) => legFromSegments(group, `Flight ${index + 1}`, `${flight.flightId}-leg-${index}`))
          .filter((leg): leg is DisplayJourneyLeg => Boolean(leg));
      }
    }

    return [{
      key: `${flight.flightId}-oneway`,
      label: "Flight",
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
      origin: flight.origin,
      destination: flight.destination,
      originAirport: flight.originAirport || firstSegment(flight)?.departureAirport,
      destinationAirport: flight.destinationAirport || lastSegment(flight)?.arrivalAirport,
      duration: getFlightDuration(flight),
      stopText: stopLabel(flight) || "Direct",
    }];
  };
  const LegTimelineDesktop = ({ leg }: { leg: DisplayJourneyLeg }) => (
    <div className="min-w-0 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-primary">{leg.label}</p>
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0 shrink-0 basis-[8.75rem] text-left">
          <p className="text-xl font-bold leading-none text-foreground">{formatFlightTime(leg.departureTime)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{formatFlightDate(leg.departureTime)}</p>
          <p className="truncate text-xs text-muted-foreground" title={routeLabel(leg.origin, leg.originAirport)}>{routeLabel(leg.origin, leg.originAirport)}</p>
        </div>
        <div className="flex min-w-[5rem] flex-1 flex-col items-center px-1">
          <span className="max-w-full truncate text-[10px] font-medium text-muted-foreground">{leg.duration || getDuration(leg.departureTime, leg.arrivalTime)}</span>
          <div className="relative my-1.5 h-px w-full bg-border">
            <div className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-primary bg-card" />
            <div className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-primary" />
          </div>
          {leg.stopText && <span className="max-w-full truncate text-[10px] font-medium text-success" title={leg.stopText}>{leg.stopText}</span>}
        </div>
        <div className="min-w-0 shrink-0 basis-[8.75rem] text-left">
          <p className="text-xl font-bold leading-none text-foreground">{formatFlightTime(leg.arrivalTime)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{formatFlightDate(leg.arrivalTime)}</p>
          <p className="truncate text-xs text-muted-foreground" title={routeLabel(leg.destination, leg.destinationAirport)}>{routeLabel(leg.destination, leg.destinationAirport)}</p>
        </div>
      </div>
    </div>
  );
  const LegTimelineMobile = ({ leg }: { leg: DisplayJourneyLeg }) => (
    <div className="min-w-0 rounded-xl bg-muted/40 px-3 py-2">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-primary">{leg.label}</p>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        <span className="font-bold text-foreground">{formatFlightTime(leg.departureTime)}</span>
        <span className="font-semibold text-foreground">{airportCode(leg.origin)}</span>
        <span aria-hidden="true">──</span>
        <span className="truncate">{leg.duration || getDuration(leg.departureTime, leg.arrivalTime)}</span>
        <span aria-hidden="true">──</span>
        <span className="font-bold text-foreground">{formatFlightTime(leg.arrivalTime)}</span>
        <span className="font-semibold text-foreground">{airportCode(leg.destination)}</span>
        <span>·</span>
        <span className="truncate text-success">{leg.stopText || "Direct"}</span>
        <span>·</span>
        <span className="truncate">{formatFlightDate(leg.departureTime)}</span>
      </div>
    </div>
  );
  const JourneyTimeline = ({ flight }: { flight: TravelianFlight }) => {
    const segmentsToShow = itinerarySegments(flight);

    return (
      <div className="space-y-3">
        {segmentsToShow.map((segment, index) => {
          const nextSegment = segmentsToShow[index + 1];
          const layover = flight.layovers?.[index];
          const hasStopAfter = index < segmentsToShow.length - 1;
          const stopCode = String(layover?.location || segment.destination || nextSegment?.origin || "Transit").trim().toUpperCase();
          const stopAirport = segment.arrivalAirport || nextSegment?.departureAirport || "";
          const flightNumber = segment.flightNumber || flight.flightNumber;
          const segmentAirline = segment.airline || getAirlineNameFromCarrier(segment.carrier) || segment.carrier || flight.airline;
          const isSameAsParent = isSameAirline(segmentAirline, flight.airline);

          return (
            <div key={`${flightNumber}-${index}`} className="space-y-3">
              <section className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm sm:p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-primary/5 px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">Flight {index + 1}</span>
                  <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-900 ring-1 ring-slate-100">
                    <AirlineLogo airline={segmentAirline} flightNumber={flightNumber} imageUrl={isSameAsParent && !adminMode ? flight.airlineImage : undefined} className="h-6 w-6 shrink-0 rounded-md border-0 shadow-none ring-0" />
                    <span className="truncate">{flightNumber}</span>
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
                      <p className="text-lg font-black leading-tight text-slate-950">{formatFlightTime(segment.departureTime)}</p>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Departure</p>
                        <p className="truncate text-sm font-bold text-slate-950" title={routeLabel(segment.origin || "", segment.departureAirport)}>
                          {routeLabel(segment.origin || "", segment.departureAirport)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                      {segmentAirline} · {flightNumber} · Duration {segmentDuration(segment)}
                    </div>

                    <div className="grid gap-1 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-4">
                      <p className="text-lg font-black leading-tight text-slate-950">{formatFlightTime(segment.arrivalTime)}</p>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Arrival</p>
                        <p className="truncate text-sm font-bold text-slate-950" title={routeLabel(segment.destination || "", segment.arrivalAirport)}>
                          {routeLabel(segment.destination || "", segment.arrivalAirport)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {hasStopAfter && (
                <section className="rounded-xl border border-dashed border-primary/25 bg-primary/5 px-4 py-3 text-sm">
                  <div className="flex gap-3">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-950" title={routeLabel(stopCode, stopAirport)}>
                        Stop at {routeLabel(stopCode, stopAirport)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">Layover duration: {layover?.duration || "TBA"}</p>
                      {(layover?.arrivalTime || layover?.departureTime) && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Arrive {formatFlightTime(layover?.arrivalTime || segment.arrivalTime)} · Depart {formatFlightTime(layover?.departureTime || nextSegment?.departureTime)}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  const dateFareLabel = (date: Date) => {
    const dateKey = formatDateOnly(date);
    if (dateKey === formatDateOnly(departDate) && bestFlight) return formatFare(bestFlight.price, bestFlight.currency);
    const fare = dateFareMap[dateKey];
    return fare ? formatFare(fare.price, fare.currency) : "-";
  };
  const revalidateSearch = () => {
    setSelectedFlight(null);
    setModalFaresCache({});
    setSearchRefreshKey((value) => value + 1);
  };

  const openFlightDetails = async (flight: TravelianFlight, primaryFare: DisplayFare) => {
    setFareDetailsTab("options");
    setExpandedFareRule(primaryFare.tier);
    setFareDetails({ flight, fare: primaryFare });
    setModalFaresError(null);

    const cachedOptions = modalFaresCache[flight.flightId] || (flight.fareOptions && flight.fareOptions.length > 1 ? flight.fareOptions : null);
    if (cachedOptions) {
      setModalFaresLoading(false);
      return;
    }

    if (flight.provider === "sooperfare" && flight.rawRef?.faresPayload) {
      setModalFaresLoading(true);
      try {
        const options = await fetchFlightFares(flight);
        if (options && options.length > 0) {
          setModalFaresCache((prev) => ({ ...prev, [flight.flightId]: options }));
          const lowestFare = options.reduce((lowest, fare) =>
            fare.price.total < lowest.price.total ? fare : lowest
          );
          const updatedFlight: TravelianFlight = {
            ...flight,
            fareOptions: options,
            fareBrand: lowestFare.tier,
            price: lowestFare.price.total,
            currency: lowestFare.price.currency || flight.currency,
            baggage: lowestFare.bags || flight.baggage,
          };
          setApiFlights((current) =>
            current.map((f) => (f.flightId === flight.flightId ? updatedFlight : f))
          );
          setFareDetails((current) =>
            current && current.flight.flightId === flight.flightId
              ? { flight: updatedFlight, fare: fareRows(updatedFlight)[0] }
              : current
          );
        }
      } catch (err) {
        setModalFaresError(err instanceof Error ? err.message : "Unable to load additional fare tiers.");
      } finally {
        setModalFaresLoading(false);
      }
    } else {
      setModalFaresLoading(false);
    }
  };

  return (
    <div className={adminMode ? "-m-4 md:-m-6 bg-muted/30 min-h-[calc(100vh-3.5rem)]" : ""}>
      <SEO
        title={`Flights ${from} to ${to} - Travelian`}
        description={`Compare available ${from} to ${to} flight fares for ${format(departDate, "PPP")}.`}
      />
      {/* Visually-hidden H1 for SEO/a11y, keeps premium look intact */}
      <h1 className="sr-only">Flight search results: {from} to {to}</h1>

      {/* Search summary */}
      <section aria-label="Flight search summary" className={cn("relative isolate bg-sidebar", adminMode ? "gradient-hero py-2" : "py-4")}>
        <div className={adminMode ? "px-4 md:px-6" : "travelian-container"}>
          <div className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/10 px-4 py-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className={cn("flex items-center gap-2 text-primary-foreground text-sm flex-wrap min-w-0")}>
                <Plane className="h-4 w-4 shrink-0" />
                <span className="min-w-0 max-w-[14rem] truncate font-semibold">{routeLabel(from)}</span>
                <button
                  type="button"
                  onClick={() => {
                    const newFrom = to;
                    const newTo = from;
                    setFrom(newFrom);
                    setTo(newTo);
                    setSelectedFlight(null);
                    const next = new URLSearchParams(params);
                    next.set("from", newFrom);
                    next.set("to", newTo);
                    setParams(next, { replace: true });
                  }}
                  aria-label="Swap origin and destination"
                  className={cn("h-6 w-6 rounded-full border border-primary-foreground/30 flex items-center justify-center text-primary-foreground/80 hover:bg-primary-foreground/15 hover:text-primary-foreground transition-colors shrink-0")}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-0 max-w-[14rem] truncate font-semibold">{routeLabel(to)}</span>
                <span className={cn("text-primary-foreground/60 text-xs")}>-</span>
                <span className={cn("text-primary-foreground/80 text-xs whitespace-nowrap")}>{format(departDate, "EEE, MMM d")}</span>
                {tripType === "roundtrip" && returnDate && <span className={cn("text-primary-foreground/80 text-xs whitespace-nowrap")}>to {format(returnDate, "EEE, MMM d")}</span>}
                {tripType === "multicity" && <span className={cn("text-primary-foreground/80 text-xs whitespace-nowrap")}>{segments.length} flights</span>}
                <span className={cn("text-primary-foreground/60 text-xs")}>-</span>
                <span className={cn("text-primary-foreground/80 text-xs whitespace-nowrap")}>{formatTravelers(travelers)}</span>
                <span className={cn("text-primary-foreground/60 text-xs")}>-</span>
                <span className={cn("text-primary-foreground/80 text-xs whitespace-nowrap")}>{currency}</span>
                {apiStatus === "loading" ? (
                  <>
                    <span className={cn("text-primary-foreground/60 text-xs")}>-</span>
                    <span className={cn("text-primary-foreground/80 text-xs whitespace-nowrap")}>Searching live fares</span>
                  </>
                ) : !searchExpired ? (
                  <>
                    <span className={cn("text-primary-foreground/60 text-xs")}>-</span>
                    <span className={cn("text-primary-foreground/80 text-xs whitespace-nowrap")}>{filtered.length} live {filtered.length === 1 ? "fare" : "fares"}</span>
                  </>
                ) : null}
                <Badge role="timer" aria-label="Search expiry" aria-live="off" className={cn("gap-1 rounded-full border-0 whitespace-nowrap tabular-nums", searchExpired ? "bg-destructive/20 text-primary-foreground" : "bg-primary-foreground/15 text-primary-foreground")}>
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {apiStatus === "success" && flights.length > 0
                    ? searchExpired ? "Search expired" : `Expires in ${expiryLabel}`
                    : apiStatus === "error" ? "Expiry unavailable"
                    : apiStatus === "success" ? "No active fares" : "Waiting for fares"}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={openModify}
                className="rounded-lg gap-2"
              >
                <Pencil className="h-3.5 w-3.5" /> Modify Search
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Date flexibility row with centered "See Price" subtitle */}
      <div className="bg-card border-b">
        <div className={cn(adminMode ? "px-4 md:px-6" : "travelian-container")}>
          <div className="flex items-center justify-center gap-1.5 py-3 overflow-x-auto scrollbar-hide">
            {dateFlexDays.map((day, i) => (
              <button
                key={i}
                onClick={() => {
                  tryDate(day.date);
                }}
                className={cn(
                  "flex flex-col items-center px-4 py-2 rounded-xl text-xs font-medium transition-all min-w-[100px] shrink-0",
                  formatDateOnly(day.date) === formatDateOnly(departDate)
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                <span>{format(day.date, "EEE, MMM d")}</span>
                <span className={cn("text-[10px] mt-0.5", formatDateOnly(day.date) === formatDateOnly(departDate) ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {dateFareLabel(day.date)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={cn(adminMode ? "px-4 md:px-6 py-5" : "travelian-container py-6")}>
        {false && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {apiStatus === "loading"
                ? "Searching live fares"
                : searchExpired
                  ? "Search results expired"
                  : `${filtered.length} live ${filtered.length === 1 ? "fare" : "fares"}`}
            </p>
            <p className="text-xs text-muted-foreground">{from} to {to} · {format(departDate, "dd MMM yyyy")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {apiStatus === "success" && flights.length > 0 && (
              <Badge className={cn("gap-1 rounded-full border-0", searchExpired ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success")}>
                <Clock className="h-3 w-3" />
                {searchExpired ? "Search expired" : `Expires in ${expiryLabel}`}
              </Badge>
            )}
            <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => setFareCalculatorOpen(true)}>
              <Calculator className="h-4 w-4" /> Fare Calculator
            </Button>
            <label className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium text-muted-foreground">
              <Checkbox checked={addToQuotations} onCheckedChange={(checked) => setAddToQuotations(Boolean(checked))} />
              Add to quotations
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Sort
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="h-9 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="best">Recommended</option>
                <option value="price-asc">Cheapest first</option>
                <option value="fastest">Fastest first</option>
                <option value="price-desc">Highest price</option>
              </select>
            </label>
          </div>
        </div>}

        {!searchExpired && (activeFilterLabels.length > 0 || hasFilterChanges) && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {activeFilterLabels.map(filter => (
              <button key={filter.key} type="button" onClick={filter.onRemove} className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                {filter.label} x
              </button>
            ))}
            {priceRange[0] > 0 || priceRange[1] < maxPrice ? (
              <span className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                {formatFare(priceRange[0], currency)} - {formatFare(priceRange[1], currency)}
              </span>
            ) : null}
            <Button variant="ghost" size="sm" className="h-7 rounded-full text-xs" onClick={() => { setSelectedAirlines([]); setSelectedStops([]); setSelectedDepartureTimes([]); setPriceRange([0, Math.max(700, Math.ceil(maxPrice / 1000) * 1000)]); setSearch(""); }}>
              Clear all
            </Button>
          </div>
        )}

        {/* Sort Tags */}
        {false && !searchExpired && <div className="flex items-center gap-3 mb-6 overflow-x-auto scrollbar-hide">
          {[
            { id: "best", label: "Best", sub: bestFlight ? formatFare(bestFlight.price, bestFlight.currency) : "" },
            { id: "price-asc", label: "Cheapest", sub: bestFlight ? formatFare(bestFlight.price, bestFlight.currency) : "" },
            { id: "fastest", label: "Fastest", sub: fastestFlight ? getFlightDuration(fastestFlight) : "" },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                sort === s.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground border hover:border-primary/30"
              }`}
            >
              {s.label}
              {s.sub && <span className="text-xs opacity-70">{s.sub}</span>}
            </button>
          ))}
        </div>}

        {apiStatus === "error" && (
          <div className="mb-5 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-warning">
            <span>{apiMessage}</span>
          </div>
        )}

        {searchExpired ? (
          <Card className="mx-auto max-w-3xl rounded-[28px] border-0 shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
            <CardContent className="p-8 text-center sm:p-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-sky-500 text-sky-500">
                <TimerReset className="h-8 w-8" />
              </div>
              <h2 className="mt-7 text-3xl font-black text-slate-800">Search Results Expired</h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                To ensure you have access to the most up-to-date flight information, please start a new search.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button
                  size="lg"
                  className="rounded-full bg-red-500 px-9 text-white hover:bg-red-600"
                  onClick={revalidateSearch}
                >
                  Search Again
                </Button>
                <Button size="lg" variant="outline" className="rounded-full px-8" onClick={openModify}>
                  Modify Search
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
        <div className="flex gap-4 xl:gap-5">
          {/* Sidebar Filters */}
          <aside className="hidden w-48 shrink-0 space-y-4 self-start md:sticky md:top-24 md:block xl:w-52">
            <Card className="shadow-card border-0">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground text-sm mb-3">Stops</h3>
                <div className="space-y-2.5">
                  {stopOptions.map(option => (
                    <label key={option.value} className="flex min-w-0 cursor-pointer items-center gap-2" title={option.label}>
                      <Checkbox checked={selectedStops.includes(option.value)} onCheckedChange={() => toggleStopFilter(option.value)} />
                      <span className="min-w-0 truncate text-xs text-muted-foreground">{option.label}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card border-0">
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Sort By</h3>
                <div className="space-y-2">
                  {sortOptions.map((option) => (
                    <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                      <input
                        type="radio"
                        name="flight-sort"
                        value={option.value}
                        checked={sort === option.value}
                        onChange={() => setSort(option.value)}
                        className="h-3.5 w-3.5 accent-primary"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
            {(!adminMode || flights.length > 0) && <Card className="shadow-card border-0">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground text-sm mb-4">Price Range</h3>
                <Slider value={priceRange} onValueChange={setPriceRange} min={0} max={Math.max(700, Math.ceil(maxPrice / 1000) * 1000)} step={100} className="mb-3" />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <input value={priceRange[0]} onChange={(event) => setPriceRange([Number(event.target.value) || 0, priceRange[1]])} className="h-8 rounded-lg border bg-background px-2" aria-label="Minimum price" />
                  <input value={priceRange[1]} onChange={(event) => setPriceRange([priceRange[0], Number(event.target.value) || priceRange[1]])} className="h-8 rounded-lg border bg-background px-2" aria-label="Maximum price" />
                </div>
              </CardContent>
            </Card>}
            <Card className="shadow-card border-0">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground text-sm mb-3">Departure Time</h3>
                <div className="space-y-2.5">
                  {departureTimeOptions.map(option => (
                    <label key={option.value} className="flex min-w-0 cursor-pointer items-center gap-2" title={option.label}>
                      <Checkbox checked={selectedDepartureTimes.includes(option.value)} onCheckedChange={() => toggleDepartureTimeFilter(option.value)} />
                      <span className="min-w-0 truncate text-xs text-muted-foreground">{limitText(option.label, 15)}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card border-0">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground text-sm mb-3">Airlines</h3>
                <div className="space-y-2.5">
                  {airlineOptions.length === 0 && (
                    <p className="text-xs text-muted-foreground">Airlines appear here after live fares are returned.</p>
                  )}
                  {airlineOptions.map(a => (
                    <label key={a} className="flex min-w-0 cursor-pointer items-center gap-2 group" title={a}>
                      <Checkbox checked={selectedAirlines.some(sel => isSameAirline(sel, a))} onCheckedChange={() => toggleAirline(a)} />
                      <span className="min-w-0 truncate text-xs text-muted-foreground transition-colors group-hover:text-foreground">{a}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Results */}
          <div className="flex-1 space-y-4">
            {apiStatus === "loading" && (
              <>
                <FlightSearchLoader from={from} to={to} />
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={`skel-${i}`} className="border-0 shadow-card animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-xl" />
                          <div className="space-y-2">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                        <div className="hidden flex-1 items-center gap-4 md:flex">
                          <div className="space-y-2 text-right"><Skeleton className="ml-auto h-4 w-16" /><Skeleton className="ml-auto h-3 w-10" /></div>
                          <Skeleton className="h-px flex-1" />
                          <div className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-3 w-10" /></div>
                        </div>
                        <div className="space-y-2 text-right"><Skeleton className="ml-auto h-5 w-24" /><Skeleton className="ml-auto h-9 w-28 rounded-lg" /></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}

            {apiStatus !== "loading" && (
              <>
                {filtered.map((flight) => {
              const isGroup = isGroupTicketingProvider(flight.provider) || flight.fareBrand === "Group Ticket" || flight.flightId.startsWith("group-");
              const hasFareOptions = (flight.fareOptions || []).length > 0;
              const fareOptionsOpen = selectedFlight === flight.flightId;
              const displayFares = fareRows(flight);
              const primaryFare = displayFares[0];
              const visibleFares = fareOptionsOpen ? displayFares : displayFares.slice(0, 1);
              const hiddenFareCount = Math.max(0, displayFares.length - 1);
              const journeyLegs = journeyLegsForCard(flight);
              const showStackedLegs = tripType === "roundtrip" || tripType === "multicity";

              return (
                <Card
                  key={flight.flightId}
                  className={`overflow-hidden transition-all duration-300 border-0 shadow-card hover:shadow-hover ${
                    fareOptionsOpen ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:gap-4">
                      <div className="flex flex-col gap-2 sm:gap-3 md:flex-row md:items-start">
                        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3 md:w-[11rem] md:shrink-0 md:pt-1">
                          <AirlineLogo airline={flight.airline} flightNumber={flight.flightNumber} imageUrl={adminMode ? undefined : flight.airlineImage} className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-xs sm:text-sm font-semibold text-foreground" title={flight.airline}>{flight.airline}</p>
                              {isGroup && (
                                <Users className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-label="Group" />
                              )}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1">
                              {/* Refundable/Non-refundable badge */}
                              {flight.refundable !== undefined && (
                                <Badge variant={flight.refundable ? "outline" : "secondary"} className={cn("rounded-md border-0 text-[9px] sm:text-[10px]", flight.refundable ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                                  {flight.refundable ? "Refundable" : "Non-refundable"}
                                </Badge>
                              )}
                              {flight.status === 'delayed' && <Badge className="bg-warning/10 text-warning border-0 text-[10px] rounded-md">Delayed</Badge>}
                            </div>
                          </div>
                        </div>

                        {/* Desktop: Option A stacked full timelines for return/multicity; one-way stays as today */}
                        <div className="hidden min-w-0 flex-1 md:block">
                          {showStackedLegs && journeyLegs.length > 1 ? (
                            <div className="space-y-3">
                              {journeyLegs.map((leg) => (
                                <LegTimelineDesktop key={leg.key} leg={leg} />
                              ))}
                            </div>
                          ) : (
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="min-w-0 shrink-0 basis-[8.75rem] text-left">
                                <p className="text-xl font-bold leading-none text-foreground">{formatFlightTime(flight.departureTime)}</p>
                                <p className="mt-1 text-[11px] text-muted-foreground">{formatFlightDate(flight.departureTime)}</p>
                                <p className="truncate text-xs text-muted-foreground" title={flightOriginLabel(flight)}>{flightOriginLabel(flight)}</p>
                              </div>
                              <div className="flex min-w-[5rem] flex-1 flex-col items-center px-1">
                                <span className="max-w-full truncate text-[10px] font-medium text-muted-foreground">{getFlightDuration(flight)}</span>
                                <div className="relative my-1.5 h-px w-full bg-border">
                                  <div className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-primary bg-card" />
                                  <div className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-primary" />
                                </div>
                                {stopLabel(flight) && <span className="max-w-full truncate text-[10px] font-medium text-success" title={stopLabel(flight)}>{stopLabel(flight)}</span>}
                              </div>
                              <div className="min-w-0 shrink-0 basis-[8.75rem] text-left">
                                <p className="text-xl font-bold leading-none text-foreground">{formatFlightTime(flight.arrivalTime)}</p>
                                <p className="mt-1 text-[11px] text-muted-foreground">{formatFlightDate(flight.arrivalTime)}</p>
                                <p className="truncate text-xs text-muted-foreground" title={flightDestinationLabel(flight)}>{flightDestinationLabel(flight)}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Mobile: Option B compact rows for return/multicity */}
                        <div className="min-w-0 flex-1 md:hidden">
                          {showStackedLegs && journeyLegs.length > 1 ? (
                            <div className="space-y-2.5">
                              {journeyLegs.map((leg) => (
                                <LegTimelineMobile key={leg.key} leg={leg} />
                              ))}
                            </div>
                          ) : (
                            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                              <div className="min-w-0 shrink-0 basis-[7.5rem] sm:basis-[8.75rem] text-left">
                                <p className="text-lg sm:text-xl font-bold leading-none text-foreground">{formatFlightTime(flight.departureTime)}</p>
                                <p className="mt-1 text-[10px] sm:text-[11px] text-muted-foreground">{formatFlightDate(flight.departureTime)}</p>
                                <p className="truncate text-[11px] sm:text-xs text-muted-foreground" title={flightOriginLabel(flight)}>{flightOriginLabel(flight)}</p>
                              </div>
                              <div className="flex min-w-[4rem] sm:min-w-[5rem] flex-1 flex-col items-center px-1">
                                <span className="max-w-full truncate text-[9px] sm:text-[10px] font-medium text-muted-foreground">{getFlightDuration(flight)}</span>
                                <div className="relative my-1.5 h-px w-full bg-border">
                                  <div className="absolute left-0 top-1/2 h-2 w-2 sm:h-2.5 sm:w-2.5 -translate-y-1/2 rounded-full border-2 border-primary bg-card" />
                                  <div className="absolute right-0 top-1/2 h-2 w-2 sm:h-2.5 sm:w-2.5 -translate-y-1/2 rounded-full bg-primary" />
                                </div>
                                {stopLabel(flight) && <span className="max-w-full truncate text-[9px] sm:text-[10px] font-medium text-success" title={stopLabel(flight)}>{stopLabel(flight)}</span>}
                              </div>
                              <div className="min-w-0 shrink-0 basis-[7.5rem] sm:basis-[8.75rem] text-left">
                                <p className="text-lg sm:text-xl font-bold leading-none text-foreground">{formatFlightTime(flight.arrivalTime)}</p>
                                <p className="mt-1 text-[10px] sm:text-[11px] text-muted-foreground">{formatFlightDate(flight.arrivalTime)}</p>
                                <p className="truncate text-[11px] sm:text-xs text-muted-foreground" title={flightDestinationLabel(flight)}>{flightDestinationLabel(flight)}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {primaryFare && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="ml-auto h-7 sm:h-8 shrink-0 rounded-lg px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold md:mt-1"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void openFlightDetails(flight, primaryFare);
                            }}
                          >
                            Flight Details
                          </Button>
                        )}
                      </div>
                      <div className="overflow-hidden rounded-2xl border">
                        <table className="hidden w-full table-fixed border-collapse md:table">
                          <colgroup>
                            <col className="w-[20%]" />
                            <col className="w-[18%]" />
                            <col className="w-[22%]" />
                            <col className="w-[17%]" />
                            <col className="w-[23%]" />
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
                            {visibleFares.map((fare) => (
                              <tr key={`${flight.flightId}-${fare.tier}-${fare.price.total}`} className="bg-card text-sm">
                                <td className="min-w-0 px-4 py-3 align-middle">
                                  <p className="truncate font-bold text-foreground" title={fare.tier}>{fare.tier}</p>
                                </td>
                                <td className="px-4 py-3 align-middle">
                                  <p className="flex min-w-0 items-center gap-1.5 text-muted-foreground" title={mealLabel(fare, flight)}>
                                    {hasMeal(fare, flight)
                                      ? <Utensils className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                      : <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                                    <span className="truncate">{mealLabel(fare, flight)}</span>
                                  </p>
                                </td>
                                <td className="px-4 py-3 align-middle">
                                  <p className="flex min-w-0 items-center gap-1.5 text-muted-foreground" title={baggageLabel(fare, flight)}>
                                    <Luggage className={cn("h-3.5 w-3.5 shrink-0", hasBaggage(fare, flight) ? "text-emerald-600" : "text-muted-foreground opacity-50")} />
                                    <span className="truncate">{baggageLabel(fare, flight)}</span>
                                  </p>
                                </td>
                                <td className="overflow-hidden px-3 py-3 text-center align-middle">
                                  <span className="block truncate whitespace-nowrap text-base font-black text-foreground" title={formatFare(fare.price.total, fare.price.currency || flight.currency)}>{formatFare(fare.price.total, fare.price.currency || flight.currency)}</span>
                                </td>
                                <td className="overflow-hidden px-3 py-3 text-right align-middle">
                                  <div className="flex min-w-0 flex-col items-stretch gap-2">
                                    <a href={fareWhatsAppHref(flight, fare)} target="_blank" rel="noreferrer" className="min-w-0">
                                      <Button variant="outline" size="sm" className="w-full min-w-0 justify-center gap-2 rounded-xl px-2">
                                        <WhatsAppIcon className="h-4 w-4" /> WhatsApp
                                      </Button>
                                    </a>
                                    {searchExpired ? (
                                      <Button size="sm" className="w-full rounded-xl px-3" onClick={revalidateSearch}>Revalidate</Button>
                                    ) : (
                                      <Link to={bookingHref(flight, fare)} className="min-w-0">
                                        <Button size="sm" className="w-full rounded-xl px-3">Book</Button>
                                      </Link>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="divide-y md:hidden">
                          {visibleFares.map((fare) => (
                            <div key={`${flight.flightId}-${fare.tier}-${fare.price.total}`} className="bg-card px-4 py-4 text-sm space-y-3">
                              {/* Fare name */}
                              <div className="min-w-0">
                                <p className="truncate font-bold text-foreground text-base" title={fare.tier}>{fare.tier}</p>
                              </div>
                              
                              {/* Meal and Baggage in 2-column grid */}
                              <div className="grid grid-cols-2 gap-3">
                                <p className="flex min-w-0 items-center gap-2 text-muted-foreground text-xs" title={mealLabel(fare, flight)}>
                                  {hasMeal(fare, flight)
                                    ? <Utensils className="h-4 w-4 shrink-0 text-emerald-600" />
                                    : <UtensilsCrossed className="h-4 w-4 shrink-0 text-muted-foreground" />}
                                  <span className="truncate">{mealLabel(fare, flight)}</span>
                                </p>
                                <p className="flex min-w-0 items-center gap-2 text-muted-foreground text-xs" title={baggageLabel(fare, flight)}>
                                  <Luggage className={cn("h-4 w-4 shrink-0", hasBaggage(fare, flight) ? "text-emerald-600" : "text-muted-foreground opacity-50")} />
                                  <span className="truncate">{baggageLabel(fare, flight)}</span>
                                </p>
                              </div>
                              
                              {/* Price and fare actions */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                <p className="whitespace-nowrap text-lg font-black text-primary">{formatFare(fare.price.total, fare.price.currency || flight.currency)}</p>
                                <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
                                  <a href={fareWhatsAppHref(flight, fare)} target="_blank" rel="noreferrer" className="min-w-0">
                                    <Button variant="outline" size="sm" className="h-9 w-full min-w-0 whitespace-nowrap rounded-xl gap-2 px-2 font-semibold">
                                      <WhatsAppIcon className="h-4 w-4" /> WhatsApp
                                    </Button>
                                  </a>
                                  {searchExpired ? (
                                    <Button size="sm" className="h-9 w-full rounded-xl px-3 font-semibold" onClick={revalidateSearch}>Revalidate</Button>
                                  ) : (
                                    <Link to={bookingHref(flight, fare)} className="min-w-0">
                                      <Button size="sm" className="h-9 w-full rounded-xl px-3 font-semibold">Book</Button>
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {hiddenFareCount > 0 && (
                          <div className="border-t bg-muted/20 px-3 py-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="mx-auto flex h-8 gap-2 rounded-lg px-4 text-xs font-semibold text-primary hover:text-primary"
                              aria-expanded={fareOptionsOpen}
                              onClick={() => setSelectedFlight((current) => current === flight.flightId ? null : flight.flightId)}
                            >
                              {fareOptionsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              {fareOptionsOpen ? "Hide additional fares" : `Show ${hiddenFareCount} more ${hiddenFareCount === 1 ? "fare" : "fares"}`}
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="hidden">
                        <div className="flex flex-col gap-2">
                          {false && (
                            <>
                              {searchExpired ? (
                                <Button className="rounded-xl h-11 px-5" onClick={revalidateSearch}>Revalidate Fare</Button>
                              ) : (
                                <Link to={bookingHref(flight)}>
                                  <Button className="gradient-primary text-primary-foreground rounded-xl h-11 px-5">{hasFareOptions ? "Book Fare" : "Continue Booking"}</Button>
                                </Link>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full rounded-xl gap-2"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setDetailsFlight(flight);
                                }}
                              >
                                <FileText className="h-4 w-4" /> View Details
                              </Button>
                              {hasFareOptions && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full rounded-xl"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setSelectedFlight((current) => current === flight.flightId ? null : flight.flightId);
                                  }}
                                >
                                  {fareOptionsOpen ? "Hide Fare Options" : "View Fare Options"}
                                </Button>
                              )}
                            </>
                          )}
                          <a href={flightWhatsAppHref(flight)} target="_blank" rel="noreferrer">
                            <Button variant="outline" size="sm" className="w-full rounded-xl gap-2">
                              <WhatsAppIcon className="h-4 w-4" /> WhatsApp Help
                            </Button>
                          </a>
                        </div>
                      </div>
                    </div>

                    {false && hasFareOptions && fareOptionsOpen && (
                      <div className="mt-5 border-t pt-4 animate-fade-in">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground">Fare options</p>
                          <p className="text-xs text-muted-foreground">Choose the fare rule that fits this passenger.</p>
                        </div>
                        <div className="overflow-hidden rounded-xl border">
                          {(flight.fareOptions || []).map((fare) => (
                            <div key={fare.tier} className="border-b bg-card p-4 last:border-b-0 md:grid md:grid-cols-[1.1fr_1fr_1fr_1fr_auto] md:items-center md:gap-3 md:p-3">
                              {/* Fare name - full width on mobile */}
                              <div className="mb-3 flex items-center justify-between gap-2 md:mb-0 md:justify-start">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-foreground text-sm md:text-sm">{fare.tier}</span>
                                  {fare.popular && <Badge className="bg-gold text-gold-foreground border-0 text-[10px]">Popular</Badge>}
                                </div>
                              </div>
                              
                              {/* Mobile: 2-column grid for baggage and meal */}
                              <div className="mb-3 grid grid-cols-2 gap-3 text-xs md:mb-0 md:contents">
                                <span className="flex items-center gap-1.5 text-muted-foreground md:text-sm">
                                  <Luggage className="h-3.5 w-3.5 text-primary shrink-0" /> 
                                  <span className="truncate">{fare.bags || flight.baggage || "Baggage TBA"}</span>
                                </span>
                                <span className="flex items-center gap-1.5 text-muted-foreground md:text-sm">
                                  <Coffee className="h-3.5 w-3.5 text-primary shrink-0" /> 
                                  <span className="truncate">{flight.meal || "Meal info not available"}</span>
                                </span>
                              </div>
                              
                              {/* Refund info - hidden on mobile, shown on desktop */}
                              <span className="hidden text-muted-foreground md:block">{fare.refund || "Refund rule on request"}</span>
                              
                              {/* Price and button - prominent on mobile */}
                              <div className="flex items-center justify-between gap-3 md:justify-end">
                                <span className="whitespace-nowrap text-lg font-black text-primary md:text-base md:text-foreground">{formatFare(fare.price.total, fare.price.currency || flight.currency)}</span>
                                {searchExpired ? (
                                  <Button size="sm" className="rounded-lg h-9 px-4 text-xs font-semibold md:h-8" onClick={revalidateSearch}>Revalidate</Button>
                                ) : (
                                  <Link to={bookingHref(flight, fare)}>
                                    <Button size="sm" className="rounded-lg h-9 px-4 text-xs font-semibold md:h-8">Book Fare</Button>
                                  </Link>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
              </>
            )}

            {apiStatus !== "loading" && filtered.length === 0 && (
              <div className="rounded-3xl border bg-card px-6 py-14 text-center shadow-card">
                <Plane className="mx-auto mb-4 h-14 w-14 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No flights found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  No bookable live fares returned for this exact search. Try nearby travel dates, clear filters, or ask Travelian to check manually.
                </p>
                <div className="mb-5 flex flex-wrap justify-center gap-2">
                  {[1, 2, 3].map((offset) => (
                    <Button key={offset} variant="outline" size="sm" className="rounded-lg" onClick={() => tryDate(addDays(departDate, offset))}>
                      Try {format(addDays(departDate, offset), "MMM d")}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" className="rounded-lg" onClick={() => { setSelectedAirlines([]); setSelectedStops([]); setSelectedDepartureTimes([]); setPriceRange([0, Math.max(700, Math.ceil(maxPrice / 1000) * 1000)]); setSearch(""); }}>
                    Clear All Filters
                  </Button>
                  <a href={whatsappUrl(`Hello Travelian,\n\nPlease check live fares for ${from} to ${to} on ${format(departDate, "MMM dd, yyyy")}.\n\nTravelers: ${formatTravelers(travelers)}\nCurrency: ${currency}`)} target="_blank" rel="noreferrer">
                    <Button className="rounded-lg gap-2"><WhatsAppIcon className="h-4 w-4" /> Ask Travelian</Button>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Modify Search Dialog */}
      <Dialog open={modifyOpen} onOpenChange={setModifyOpen}>
        <DialogContent className="top-[calc(50%+1.75rem)] flex max-h-[calc(100dvh-7rem)] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-8rem)] sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b bg-background px-5 py-4 pr-14">
            <DialogTitle>Modify Search</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="flex flex-wrap gap-2">
              {([
                ["oneway", "One-way"],
                ["roundtrip", "Round-trip"],
                ["multicity", "Multi-city"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEditTripType(value)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                    editTripType === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {editTripType === "multicity" ? (
              <div className="space-y-3">
                {editSegments.map((segment, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <AirportCombobox value={segment.from} onChange={(value) => setEditSegments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, from: value } : item))} placeholder="Origin" />
                    <AirportCombobox value={segment.to} onChange={(value) => setEditSegments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, to: value } : item))} placeholder="Destination" iconVariant="arrival" />
                    <CalendarPopup open={editSegmentDateOpen === index} onOpenChange={(open) => setEditSegmentDateOpen(open ? index : null)}>
                      <CalendarPopupTrigger asChild>
                        <button type="button" className="flex h-11 items-center gap-2 rounded-xl border border-input bg-background px-3 text-left text-sm">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          {segment.date ? format(segment.date, "MMM dd, yyyy") : "Select date"}
                        </button>
                      </CalendarPopupTrigger>
                      <CalendarPopupContent title="Select flight date">
                        <Calendar size="large"
                          mode="single"
                          selected={segment.date}
                          onSelect={(date) => {
                            setEditSegments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, date } : item));
                            if (date) setEditSegmentDateOpen(null);
                          }}
                          initialFocus
                          className="p-3 sm:p-5 pointer-events-auto"
                        />
                      </CalendarPopupContent>
                    </CalendarPopup>
                    <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={editSegments.length <= 2} onClick={() => setEditSegments((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" disabled={editSegments.length >= MAX_MULTI_CITY_FLIGHTS} onClick={() => setEditSegments((current) => current.length < MAX_MULTI_CITY_FLIGHTS ? [...current, { from: "", to: "", date: undefined }] : current)}>Add flight</Button>
              </div>
            ) : (
            <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <div className="min-w-0">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">From</label>
                <AirportCombobox value={editFrom} onChange={setEditFrom} className="h-11" placeholder="Origin" />
              </div>
              <div className="hidden sm:flex items-center justify-center pb-1">
                <button type="button" onClick={swapEdit} aria-label="Swap origin and destination" className="h-9 w-9 rounded-full border-2 border-primary/30 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                  <ArrowLeftRight className="h-4 w-4" />
                </button>
              </div>
              <div className="min-w-0">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">To</label>
                <AirportCombobox value={editTo} onChange={setEditTo} className="h-11" placeholder="Destination" iconVariant="arrival" />
              </div>
            </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Departure Date</label>
              <CalendarPopup open={editDateOpen} onOpenChange={setEditDateOpen}>
                <CalendarPopupTrigger asChild>
                  <button type="button" className="flex items-center gap-2 h-11 w-full bg-background border border-input rounded-xl px-3 text-sm text-left">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    {editDate ? format(editDate, "MMM dd, yyyy") : "Select date"}
                  </button>
                </CalendarPopupTrigger>
                <CalendarPopupContent title="Select departure date">
                  <Calendar size="large"
                    mode="single"
                    selected={editDate}
                    onSelect={(date) => {
                      setEditDate(date);
                      if (date) setEditDateOpen(false);
                    }}
                    initialFocus
                    className="p-3 sm:p-5 pointer-events-auto"
                  />
                </CalendarPopupContent>
              </CalendarPopup>
            </div>
            {editTripType === "roundtrip" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Return Date</label>
                <CalendarPopup open={editReturnDateOpen} onOpenChange={setEditReturnDateOpen}>
                  <CalendarPopupTrigger asChild>
                    <button type="button" className="flex items-center gap-2 h-11 w-full bg-background border border-input rounded-xl px-3 text-sm text-left">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      {editReturnDate ? format(editReturnDate, "MMM dd, yyyy") : "Select return date"}
                    </button>
                  </CalendarPopupTrigger>
                  <CalendarPopupContent title="Select return date">
                    <Calendar size="large"
                      mode="single"
                      selected={editReturnDate}
                      onSelect={(date) => {
                        setEditReturnDate(date);
                        if (date) setEditReturnDateOpen(false);
                      }}
                      initialFocus
                      className="p-3 sm:p-5 pointer-events-auto"
                    />
                  </CalendarPopupContent>
                </CalendarPopup>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Travelers</label>
                <TravelersClassPicker value={editTravelers} onChange={setEditTravelers} mode="travelers" />
              </div>
              <div className="min-w-0">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cabin Class</label>
                <TravelersClassPicker value={editTravelers} onChange={setEditTravelers} mode="cabin" />
              </div>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t bg-background px-5 py-4">
            <Button variant="outline" onClick={() => setModifyOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={applyModify} className="gradient-primary text-primary-foreground rounded-xl">
              <Search className="h-4 w-4 mr-2" /> Search Flights
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={fareCalculatorOpen} onOpenChange={setFareCalculatorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fare Calculator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Use this for quick agent calculations. It does not alter supplier fare, booking price, or wallet balance.
            </p>
            <div className="grid gap-3">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Base fare ({currency})</span>
                <input value={calculatorBase} onChange={(event) => setCalculatorBase(event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm" inputMode="decimal" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Taxes ({currency})</span>
                <input value={calculatorTaxes} onChange={(event) => setCalculatorTaxes(event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm" inputMode="decimal" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Service fee / markup ({currency})</span>
                <input value={calculatorServiceFee} onChange={(event) => setCalculatorServiceFee(event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm" inputMode="decimal" />
              </label>
            </div>
            <div className="rounded-2xl border bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated total</p>
              <p className="mt-1 text-2xl font-black text-primary">{formatFare(calculatorTotal, currency)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCalculatorBase(""); setCalculatorTaxes(""); setCalculatorServiceFee(""); }}>Clear</Button>
            <Button onClick={() => setFareCalculatorOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!fareDetails} onOpenChange={(open) => !open && setFareDetails(null)}>
        <DialogContent className="top-[calc(50%+1.75rem)] flex max-h-[calc(100dvh-7rem)] w-[calc(100vw-1.5rem)] flex-col overflow-hidden border border-primary/10 bg-gradient-to-br from-white via-sky-50/50 to-white p-0 shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:max-h-[calc(100dvh-8rem)] sm:max-w-2xl md:max-w-3xl">
          {fareDetails && (
            <>
              <DialogHeader className="sticky top-0 z-10 shrink-0 border-b border-primary/10 bg-white/95 px-4 py-3 text-left backdrop-blur sm:px-5">
                <div className="flex items-start gap-3 pr-8">
                  <AirlineLogo airline={fareDetails.flight.airline} flightNumber={fareDetails.flight.flightNumber} imageUrl={adminMode ? undefined : fareDetails.flight.airlineImage} className="h-10 w-10 rounded-xl border-slate-200 shadow-sm ring-0" />
                  <div className="min-w-0">
                    <DialogTitle className="sr-only">Flight details</DialogTitle>
                    <p className="truncate text-base font-black text-slate-950" title={`${fareDetails.flight.airline} - ${fareDetails.flight.flightNumber}`}>
                      {fareDetails.flight.airline} <span className="text-slate-400">·</span> {fareDetails.flight.flightNumber}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-primary" title={`${fareDetails.flight.origin} to ${fareDetails.flight.destination} - ${formatFlightTime(fareDetails.flight.departureTime)} - ${formatFlightTime(fareDetails.flight.arrivalTime)} - ${getFlightDuration(fareDetails.flight)} - ${stopLabel(fareDetails.flight) || "Non-stop"}`}>
                      {fareDetails.flight.origin} → {fareDetails.flight.destination} <span className="text-slate-300">·</span> {formatFlightTime(fareDetails.flight.departureTime)} - {formatFlightTime(fareDetails.flight.arrivalTime)} <span className="text-slate-300">·</span> {getFlightDuration(fareDetails.flight)} <span className="text-slate-300">·</span> {stopLabel(fareDetails.flight) || "Non-stop"}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <div className="shrink-0 bg-white/60 px-4 pt-3 sm:px-5">
                <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-xl border border-primary/15 bg-white p-1 text-xs font-bold text-slate-600 shadow-sm sm:grid-cols-4">
                  {([
                    ["options", "Fare Options"],
                    ["flight", "Flight Info"],
                    ["rules", "Fare Rules"],
                    ["baggage", "Baggage"],
                  ] as const).map(([tab, label]) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setFareDetailsTab(tab)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 transition-colors",
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
                {fareDetailsTab === "options" && (
                  <div className="space-y-4">
                    {modalFaresLoading ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="mt-3 text-sm font-bold text-slate-900">Loading live fare options & baggage...</p>
                        <p className="text-xs text-muted-foreground mt-1">Checking available fare families from the airline</p>
                      </div>
                    ) : (
                      <>
                        {modalFaresError && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800">
                            {modalFaresError} Showing default fare.
                          </div>
                        )}
                        <div className="space-y-3">
                          {fareRows(fareDetails.flight).map((fare) => {
                            const isNonRefundable =
                              fareDetails.flight.refundable === false ||
                              /non[- ]?refundable|not refundable|no refund/i.test(fare.cancellation || fare.refund || "");
                            return (
                              <div
                                key={`${fare.tier}-${fare.price.total}`}
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-base font-bold text-slate-950" title={fare.tier}>
                                      {fare.tier}
                                    </p>
                                  </div>
                                  <Badge
                                    variant={isNonRefundable ? "secondary" : "outline"}
                                    className={cn(
                                      "rounded-lg px-2.5 py-1 text-xs font-semibold border-0",
                                      isNonRefundable ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                                    )}
                                  >
                                    {isNonRefundable ? "Non-Refundable" : "Refundable"}
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-3 py-3 sm:grid-cols-3">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Luggage className={cn("h-4 w-4 shrink-0", hasBaggage(fare, fareDetails.flight) ? "text-emerald-600" : "text-slate-400")} />
                                    <span className="truncate font-medium text-slate-700">{baggageLabel(fare, fareDetails.flight)}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {hasMeal(fare, fareDetails.flight) ? (
                                      <Utensils className="h-4 w-4 shrink-0 text-emerald-600" />
                                    ) : (
                                      <UtensilsCrossed className="h-4 w-4 shrink-0 text-slate-400" />
                                    )}
                                    <span className="truncate font-medium text-slate-700">{mealLabel(fare, fareDetails.flight)}</span>
                                  </div>
                                  <div className="col-span-2 sm:col-span-1 flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="h-4 w-4 shrink-0 text-primary" />
                                    <span className="truncate font-medium text-slate-700">
                                      {fare.change && !isUnclearDisplayValue(fare.change) ? fare.change : "Changeable with fee"}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                                  <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Total Fare</span>
                                    <p className="text-xl font-black text-primary">
                                      {formatFare(fare.price.total, fare.price.currency || fareDetails.flight.currency)}
                                    </p>
                                  </div>
                                  <a
                                    href={fareWhatsAppHref(fareDetails.flight, fare)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="shrink-0"
                                  >
                                    <Button size="sm" className="h-9 gap-2 rounded-xl px-4 font-semibold">
                                      <WhatsAppIcon className="h-4 w-4" /> WhatsApp Help
                                    </Button>
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {fareDetailsTab === "flight" && (
                  <JourneyTimeline flight={fareDetails.flight} />
                )}

                {fareDetailsTab === "rules" && (
                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
                    <div className="space-y-2">
                      {fareRows(fareDetails.flight).map((fare, idx) => {
                        const isOpen = expandedFareRule === fare.tier || (expandedFareRule === null && idx === 0);
                        const isNonRefundable =
                          fareDetails.flight.refundable === false ||
                          /non[- ]?refundable|not refundable|no refund/i.test(fare.cancellation || fare.refund || "");
                        const defaultCancellation = isNonRefundable
                          ? "Non-refundable as per airline policy."
                          : "Refundable subject to airline fare conditions and cancellation penalties.";
                        const defaultDateChange = "Permitted subject to airline date change fees and any fare difference.";

                        const cancellation = cleanFareText(fare.cancellation || fare.refund, defaultCancellation);
                        const dateChange = cleanFareText(fare.change, defaultDateChange);
                        return (
                          <div key={`${fare.tier}-${fareDetailsTab}`} className="border-b border-dashed pb-2 last:border-b-0 last:pb-0">
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-3 rounded-xl bg-sky-50/70 px-4 py-3 text-left transition-colors hover:bg-primary/5"
                              onClick={() => setExpandedFareRule(isOpen && expandedFareRule !== null ? null : fare.tier)}
                            >
                              <span className="truncate font-bold text-primary" title={fare.tier}>{fare.tier}</span>
                              <span className="flex shrink-0 items-center gap-3">
                                <span className={cn(
                                  "rounded-lg px-2.5 py-1 text-xs font-semibold",
                                  isNonRefundable ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                                )}>
                                  {isNonRefundable ? "Non-Refundable" : "Refundable"}
                                </span>
                                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </span>
                            </button>
                            {isOpen && (
                              <div className="mx-4 my-3 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                                <div className="rounded-xl border border-red-100 bg-red-50/50 p-3">
                                  <p className="mb-1 text-xs font-bold uppercase tracking-wide text-red-500">Cancellation</p>
                                  <p className="whitespace-pre-line text-sm text-slate-700">{cancellation}</p>
                                </div>
                                <div className="rounded-xl border border-primary/10 bg-primary/5 p-3">
                                  <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">Date Change</p>
                                  <p className="whitespace-pre-line text-sm text-slate-700">{dateChange}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {fareDetailsTab === "baggage" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoBox title="Fare" value={fareDetails.fare.tier} />
                    <InfoBox title="Cabin baggage" value={hasBaggage(fareDetails.fare, fareDetails.flight) ? baggageLabel(fareDetails.fare, fareDetails.flight) : "No Baggage"} />
                    <InfoBox title="Checked baggage" value={hasBaggage(fareDetails.fare, fareDetails.flight) ? baggageLabel(fareDetails.fare, fareDetails.flight) : "No Baggage"} />
                    <InfoBox title="Pieces / weight" value={hasBaggage(fareDetails.fare, fareDetails.flight) ? baggageLabel(fareDetails.fare, fareDetails.flight) : "Baggage details are not available."} />
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailsFlight} onOpenChange={(open) => !open && setDetailsFlight(null)}>
        <DialogContent className="top-[calc(50%+1.75rem)] flex max-h-[calc(100dvh-7rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden sm:max-h-[calc(100dvh-8rem)] sm:max-w-2xl">
          <DialogHeader className="shrink-0 pr-10">
            <DialogTitle>Flight Details & Fare Rules</DialogTitle>
          </DialogHeader>
          {detailsFlight && (
            <div className="min-h-0 space-y-5 overflow-y-auto py-2 pr-1">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/40 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-foreground">{detailsFlight.airline}</p>
                    {(isGroupTicketingProvider(detailsFlight.provider) || detailsFlight.fareBrand === "Group Ticket" || detailsFlight.flightId.startsWith("group-")) && (
                      <Users className="h-4 w-4 shrink-0 text-blue-600" aria-label="Group" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{detailsFlight.flightNumber} · {detailsFlight.origin} to {detailsFlight.destination}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full">{detailsFlight.stops ? `${detailsFlight.stops} stop${detailsFlight.stops === 1 ? "" : "s"}` : "Non-stop"}</Badge>
                </div>
              </div>
              <JourneyTimeline flight={detailsFlight} />

              <div className="grid gap-3 md:grid-cols-3">
                <InfoBox title="Baggage" value={detailsFlight.baggage && !/^nil(?: baggage)?$/i.test(detailsFlight.baggage.trim()) ? detailsFlight.baggage : "7 KG"} />
                <InfoBox title="Meal" value={detailsFlight.meal || "Meal info not available"} />
                <InfoBox title="Fare" value={formatFare(detailsFlight.price, detailsFlight.currency)} />
              </div>
              <div className="rounded-2xl border p-4">
                <p className="font-semibold text-foreground">Rules and conditions</p>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  {fareRows(detailsFlight).length ? fareRows(detailsFlight).map((fare) => (
                    <p key={fare.tier}>
                      <span className="font-semibold text-foreground">{fare.tier}:</span> Refund: {fare.refund || "On request"} · Change: {fare.change || "On request"} · Bags: {fare.bags || detailsFlight.baggage || "TBA"}
                    </p>
                  )) : (
                    <p>Fare rules, cancellation, date change, and supplier remarks are shown when returned by the live API.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
