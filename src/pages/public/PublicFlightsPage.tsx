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
import { ArrowRight, Plane, Search, Wifi, Coffee, ArrowLeftRight, Shield, Luggage, CalendarIcon, Pencil, Calculator, Clock, FileText, TimerReset, Utensils, UtensilsCrossed, ChevronDown, ChevronUp, Check, Users, Loader2, SlidersHorizontal, ArrowUpDown, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { format, addDays, parseISO, startOfDay } from "date-fns";
import { GroupFareCalendar } from "@/components/GroupFareCalendar";
import { useFlightFares } from "@/hooks/use-flight-fares";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { FARE_RULES_FALLBACK, refundStatus } from "@/lib/fare-refund";
import { SEO } from "@/components/SEO";
import { TravelersClassPicker, formatTravelerCount, formatTravelers, type TravelersValue } from "@/components/public/TravelersClassPicker";
import { fetchFlightFares, hydrateSooperFareOptions, searchFlights, type FareOption, type TravelianFlight } from "@/lib/travelian-api";
import { AirportCombobox } from "@/components/public/AirportCombobox";
import { FlightSearchLoader } from "@/components/public/FlightSearchLoader";
import { CURRENCIES, useLocale, type CurrencyCode } from "@/contexts/LocaleContext";
import { AirlineLogo } from "@/components/ui/airline-logo";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { flightHelpMessage } from "@/lib/flight-whatsapp";
import { ResultsSheet } from "@/components/public/ResultsSheet";
import { formatDateOnly, parseDateOnly } from "@/lib/date-only";
import { keepReturnDate, returnDateError, RETURN_CLEARED_MESSAGE } from "@/lib/return-date";
import { firstLegError, legErrors, nextLeg, remainingLegErrors, updateLeg, type Leg, type LegErrors } from "@/lib/multi-city";
import { whatsappUrl } from "@/lib/site-config";
import { airportByCode, loadPublicAirports } from "@/data/airports";
import { isGroupTicketingProvider, groupTicketToFlight } from "@/lib/provider-systems";
import { publicGroupCalendar, searchPublicGroups, GATEWAY_GROUP_PROVIDER } from "@/lib/public-booking";
import { normalizeAirlineName, isSameAirline, extractAllAirlines, getAirlineNameFromCarrier } from "@/lib/airline-normalization";
import { journeyMinutes, minutesText, stayAt, stayBetween, stopLine, stopSummary, type Stay } from "@/lib/flight-stays";
import { activeFilterCount, filtersFromParams, FLIGHT_SORTS, sortShortLabel, withFilterParams, type FlightSort } from "@/lib/flight-result-filters";
import { mealStatus, mealText } from "@/lib/meal";
import { BAGGAGE_UNKNOWN, baggageFilterOptions, baggageText, checkedText, handCarryText, underBaggageLabel, type BaggageText } from "@/lib/baggage";

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
  /** The gateway's id(s) of this fare, sent with Book so the fare booked is the fare shown. */
  gatewayFareIds?: string[];
  price: { currency?: string; total: number; base?: number | null; taxes?: number | null };
  bags?: string | null;
  /** Baggage in full words (#36). */
  bagsDetail?: string | null;
  /** A round trip's baggage per flight (#123). */
  legBags?: { label: string; bags: string; bagsDetail: string }[];
  /** #113: the gateway's total for every traveler searched, and how many travelers it is for. */
  allTravelersTotal?: number;
  travelerCount?: number;
  meal?: string | null;
  refund?: string | null;
  change?: string | null;
  noShow?: string | null;
  cancellation?: string | null;
  conditions?: string | null;
  amenities?: string[];
};
type FareDetailsTab = "flight" | "rules" | "baggage";

/** A fare's baggage as shown (#36): the gateway's short form and full words; never a guessed hand carry. */
const fareBaggage = (fare: { bags?: string | null; bagsDetail?: string | null } | undefined, flight: { baggage?: string | null }): BaggageText =>
  fare?.bags ? baggageText(fare.bags, fare.bagsDetail) : baggageText(flight.baggage);
/** Every fare's baggage on a flight (the Baggage filter matches a flight when any of its fares matches). */
const flightBaggages = (flight: TravelianFlight): BaggageText[] =>
  flight.fareOptions?.length ? flight.fareOptions.map(fare => fareBaggage(fare, flight)) : [fareBaggage(undefined, flight)];
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
  /** Where the passenger stays, e.g. "Abu Dhabi, United Arab Emirates" (#119). */
  stopPlaces?: string;
};
const SEARCH_RESULT_TTL_SECONDS = 900;
/** Sections hidden on purpose (kept for later, not shown): see CLAUDE.md "Do Not Re-add Removed Features". */
const SHOW_HIDDEN_SECTIONS = false;

const sortOptions = FLIGHT_SORTS;

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

/** "Karachi (KHI)" or "KHI" -> "KHI". */
const airportCodeOf = (value: string) => (String(value || "").match(/\(([A-Z]{3})\)/i)?.[1] || String(value || "").trim()).toUpperCase();

/** The group fare calendar in the shape the date strip reads (group fares are known for every day, never "pending"). */
const groupCalendar = (origin: string, destination: string, adults: number, _cabin: string, signal?: AbortSignal) =>
  publicGroupCalendar(origin, destination, adults, signal).then((answer) => ({ pending: false, days: answer.days.map((day) => ({ ...day, checked: true })) }));

/** `groupsOnly`: the Group Ticketing results (the same list, cards, filters and Book as Flights, group fares only). */
export default function PublicFlightsPage({ bookingPath = "/booking", adminMode = false, groupsOnly = false }: { bookingPath?: string; adminMode?: boolean; groupsOnly?: boolean } = {}) {
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
  // Group Ticketing searches can leave the date out: every upcoming group fare on the route.
  const anyDate = groupsOnly && !(params.get("depart") || params.get("date"));
  const initReturnDate = parseDateOnly(initReturnDateStr);
  const initSegments = segmentsFromParam(params.get("segments"));
  // #150: filters and sort come from the URL, so a reload or a shared link keeps them.
  const [initFilters] = useState(() => filtersFromParams(params));
  const urlPrice = useRef<[number, number] | null>(initFilters.price);

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(initFrom);
  const [to, setTo] = useState(initTo);
  const [currency, setSearchCurrency] = useState<CurrencyCode>(initCurrency);
  const [travelers, setTravelers] = useState<TravelersValue>({
    adults: initAdults, children: initChildren, infants: initInfants, cabin: initCabin,
  });
  // No price range until results arrive, then the full range of the results (avoids misleading 0–700 placeholder before fares load).
  const [priceRangeState, setPriceRange] = useState<number[] | null>(null);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>(initFilters.airlines);
  // Stop city and country names come from the shared airport list: show them as soon as it has loaded (#119).
  const [, setAirportsLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    void loadPublicAirports().then(() => { if (active) setAirportsLoaded(true); }, () => undefined);
    return () => { active = false; };
  }, []);
  const [selectedStops, setSelectedStops] = useState<string[]>(initFilters.stops);
  const [selectedDepartureTimes, setSelectedDepartureTimes] = useState<string[]>(initFilters.departureTimes);
  const [selectedBaggage, setSelectedBaggage] = useState<string[]>(initFilters.baggage);
  const [sort, setSort] = useState<FlightSort>(initFilters.sort);
  // Phones (#150): the Filters and Sort sheets.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const phoneBarPlace = useRef<HTMLDivElement>(null);
  const [phoneBarPinned, setPhoneBarPinned] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
  // Public cards: the fare picked on each flight (flight id → fare key); the card's single Book follows it.
  const [pickedFares, setPickedFares] = useState<Record<string, string>>({});
  // Cards whose long airline name is shown in full (tapped open), issue #90.
  const [expandedAirlines, setExpandedAirlines] = useState<ReadonlySet<string>>(() => new Set());
  const toggleAirlineName = (flightId: string) => setExpandedAirlines(current => {
    const next = new Set(current);
    if (!next.delete(flightId)) next.add(flightId);
    return next;
  });
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
  // #55: while Modify Search is open, its fares load in the background once From and To are set.
  // #192: phones show one month in the date pickers (two stacked months were too tall); wider screens keep two.
  const calendarMonths = useIsMobile() ? 1 : 2;
  const editFares = useFlightFares(modifyOpen && !groupsOnly, {
    from: airportCodeOf(editFrom), to: airportCodeOf(editTo), adults: editTravelers.adults,
    cabin: editTravelers.cabin.toLowerCase().replace(/\s+/g, "_"),
  });
  const [editReturnDateOpen, setEditReturnDateOpen] = useState(false);
  // #151: the Return date uses the same fare calendar, for the way back from the departure date on; its message
  // shows at the field.
  const editReturnFares = useFlightFares(modifyOpen && !groupsOnly && editTripType === "roundtrip" && !!editDate, {
    from: airportCodeOf(editTo), to: airportCodeOf(editFrom), adults: editTravelers.adults,
    cabin: editTravelers.cabin.toLowerCase().replace(/\s+/g, "_"), start: editDate ? formatDateOnly(editDate) : undefined,
  });
  const [editReturnError, setEditReturnError] = useState<string>();
  const editReturnRef = useRef<HTMLButtonElement>(null);
  const pickEditDeparture = (date: Date | undefined) => {
    setEditDate(date);
    if (!date) return;
    setEditDateOpen(false);
    const kept = keepReturnDate(date, editReturnDate);
    if (editReturnDate && !kept) { setEditReturnDate(undefined); setEditReturnError(RETURN_CLEARED_MESSAGE); }
    if (editTripType === "roundtrip") setEditReturnDateOpen(true);
  };
  const [editSegmentDateOpen, setEditSegmentDateOpen] = useState<number | null>(null);
  // #160: each multi-city leg's messages, under its fields; a new leg starts where the last one lands.
  const [editLegErrors, setEditLegErrors] = useState<LegErrors[]>([]);
  const changeEditLeg = (index: number, patch: Partial<Leg>) => {
    const next = updateLeg(editSegments, index, patch);
    setEditSegments(next);
    setEditLegErrors(current => remainingLegErrors(current, next));
  };
  const removeEditLeg = (index: number) => {
    const next = editSegments.filter((_, at) => at !== index);
    setEditSegments(next);
    setEditLegErrors(current => remainingLegErrors(current.filter((_, at) => at !== index), next));
  };
  // Phones (#148): choosing From opens To (`key`), choosing To opens the departure date.
  const [editAdvance, setEditAdvance] = useState({ key: "", n: 0 });
  const editSignal = (key: string) => (editAdvance.key === key ? editAdvance.n : 0);

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
    setEditReturnError(undefined);
    setEditLegErrors([]);
    setModifyOpen(true);
  };

  const applyModify = () => {
    const effectiveSegments = editTripType === "multicity" ? editSegments : [];
    if (editTripType === "roundtrip") {
      const message = returnDateError(editDate, editReturnDate);
      if (message) {
        setEditReturnError(message);
        editReturnRef.current?.focus();
        return;
      }
    }
    if (editTripType === "multicity") {
      const found = legErrors(effectiveSegments);
      setEditLegErrors(found);
      const toFix = firstLegError(found);
      if (toFix) {
        document.getElementById(`modify-leg${toFix[0]}-${toFix[1]}`)?.focus();
        return;
      }
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
    setSelectedBaggage([]);
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
  const toggleBaggageFilter = (value: string) => setSelectedBaggage(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]);

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
      groupsOnly ? Promise.resolve({ flights: [] as TravelianFlight[] }) : searchFlights({
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
      }, controller.signal, { signedIn: adminMode }),
      (isAdultsOnly
        ? searchPublicGroups({ origin: originAirport, destination: destAirport, departureDate: anyDate ? undefined : departDateStr, adults: adultsCount }, controller.signal)
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
        // A price range from the URL (#150) applies to the first results; later searches start from the full range.
        const fullRange: [number, number] = [0, Math.ceil(liveMaxPrice / 1000) * 1000];
        const fromUrl = urlPrice.current;
        urlPrice.current = null;
        setPriceRange(fromUrl ? [Math.min(fromUrl[0], fullRange[1]), Math.min(fromUrl[1], fullRange[1])] : adminMode ? null : fullRange);
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
  }, [from, to, departDate, returnDate, tripType, segments, travelers, currency, searchRefreshKey, anyDate, groupsOnly]);

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

  const filtered = flights.filter(f => {
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
    if (selectedBaggage.length > 0 && !flightBaggages(f).some(baggage => selectedBaggage.includes(baggage.short))) return false;
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

  // #113: with several travelers a fare shows the gateway's total for all of them, and the per-adult price below it.
  // Without a gateway total (a passenger type the supplier didn't price) it shows the per-adult price, labelled so.
  const searchedTravelers = Number(travelers.adults || 0) + Number(travelers.children || 0) + Number(travelers.infants || 0);
  const farePrice = (fare: DisplayFare, flight: TravelianFlight) => {
    const currency = fare.price.currency || flight.currency;
    const perAdult = formatFare(fare.price.total, currency);
    if (searchedTravelers <= 1) return { main: perAdult, note: "", secondary: "" };
    if (fare.allTravelersTotal && fare.allTravelersTotal > 0) {
      const count = fare.travelerCount || searchedTravelers;
      return { main: formatFare(fare.allTravelersTotal, currency), note: `total for ${count} travelers`, secondary: `${perAdult} per adult` };
    }
    return { main: perAdult, note: "per adult", secondary: "" };
  };
  const FarePriceText = ({ fare, flight, className, align = "left" }: { fare: DisplayFare; flight: TravelianFlight; className: string; align?: "left" | "center" }) => {
    const price = farePrice(fare, flight);
    const label = [price.main, price.note, price.secondary && `(${price.secondary})`].filter(Boolean).join(" ");
    return (
      <span className={cn("flex min-w-0 flex-col", align === "center" ? "items-center text-center" : "items-start text-left")} title={label}>
        <span className={cn("block max-w-full truncate whitespace-nowrap", className)}>{price.main}</span>
        {price.note && <span className="block max-w-full truncate text-xs font-medium text-muted-foreground">{price.note}</span>}
        {price.secondary && <span className="block max-w-full truncate text-xs text-muted-foreground">{price.secondary}</span>}
      </span>
    );
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

  // #198: "Meal" when the fare says a meal is served; otherwise, missing data included, "No Meal".
  const mealLabel = (fare: DisplayFare, flight: TravelianFlight) => mealText(fare.meal || flight.meal);
  /** Meal served: green fork and knife; otherwise crossed out, matching the "No Meal" label. */
  const MealIcon = ({ fare, flight, className }: { fare: DisplayFare; flight: TravelianFlight; className: string }) => {
    const status = mealStatus(fare.meal || flight.meal);
    if (status !== "included") return <UtensilsCrossed aria-hidden="true" className={cn(className, "shrink-0 text-muted-foreground")} />;
    return <Utensils aria-hidden="true" className={cn(className, "shrink-0 text-emerald-600")} />;
  };

  // Shown under a "Baggage" heading: "Check with airline" rather than repeating "Baggage:".
  const baggageLabel = (fare: DisplayFare, flight: TravelianFlight) => underBaggageLabel(fareBaggage(fare, flight).short);
  const baggageWords = (fare: DisplayFare, flight: TravelianFlight) => fareBaggage(fare, flight).detail;

  const hasBaggage = (fare: DisplayFare, flight: TravelianFlight) => fareBaggage(fare, flight).known;

  const fareRows = (flight: TravelianFlight): DisplayFare[] => {
    if (flight.fareOptions?.length) {
      return flight.fareOptions.map((fare) => ({
        tier: cleanFareTier(fare.tier, flight.fareBrand || "Fare option", flight),
        price: fare.price,
        bags: fare.bags,
        bagsDetail: fare.bagsDetail,
        legBags: fare.legBags,
        allTravelersTotal: fare.allTravelersTotal,
        travelerCount: fare.travelerCount,
        meal: fare.meal || flight.meal,
        refund: fare.refund,
        change: fare.change,
        noShow: (fare as DisplayFare).noShow,
        cancellation: (fare as DisplayFare).cancellation || fare.refund,
        conditions: (fare as DisplayFare).conditions,
        amenities: fare.amenities,
        gatewayFareIds: fare.gatewayFareIds,
      })).sort((a, b) => a.price.total - b.price.total);
    }
    // #149: refundable only when the flight data says so; unknown falls back to the airline's fare rules.
    const refundText = flight.refundable === false ? "Non-refundable as per airline policy."
      : flight.refundable === true ? "Refundable subject to airline fare conditions." : `${FARE_RULES_FALLBACK}.`;
    return [{
      tier: cleanFareTier(flight.fareBrand, "Fare option", flight),
      price: { currency: flight.currency, total: flight.price },
      bags: flight.baggage,
      meal: flight.meal,
      refund: refundText,
      change: "Permitted subject to airline date change fees and fare difference.",
      noShow: "",
      cancellation: refundText,
      conditions: "",
      amenities: [],
    }];
  };

  /** One fare on a card, for the picked-fare state. */
  const fareKey = (fare: DisplayFare) => `${fare.tier}|${fare.price.total}`;

  /** Public cards: the fares as selectable tiles (a swipe row below lg, columns from lg) and one Book for the picked fare. */
  const renderFareChooser = (flight: TravelianFlight, fares: DisplayFare[], picked: DisplayFare | undefined) => {
    if (!picked) return null;
    const several = fares.length > 1;
    const pickedPrice = farePrice(picked, flight);
    return (
      <div className="-mx-4 -mb-4 border-t sm:-mx-5 sm:-mb-5">
        {several ? (
          <div className="pt-3">
            <div className="flex items-baseline justify-between gap-3 px-4 sm:px-5">
              <p className="text-sm font-bold text-foreground">Choose your fare</p>
              <p className="text-xs text-muted-foreground">{fares.length} options<span className="sm:hidden"> · swipe</span></p>
            </div>
            <div
              role="group"
              aria-label={`Fares for ${flight.airline} ${flight.flightNumber}`}
              className="mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-4 px-4 pb-3 pt-0.5 [scrollbar-width:none] sm:scroll-px-5 sm:px-5 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] lg:overflow-visible [&::-webkit-scrollbar]:hidden"
            >
              {fares.map((fare) => {
                const on = fareKey(fare) === fareKey(picked);
                return (
                  <button
                    key={fareKey(fare)}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPickedFares((current) => ({ ...current, [flight.flightId]: fareKey(fare) }))}
                    className={cn(
                      "flex w-[9rem] shrink-0 snap-start flex-col justify-between gap-2 rounded-xl border bg-card p-3 text-left transition-colors duration-150 motion-reduce:transition-none lg:w-auto",
                      "hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:bg-primary/5",
                      on ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border",
                    )}
                  >
                    <span className="flex min-w-0 items-start justify-between gap-1.5">
                      <span className="line-clamp-2 break-words text-sm font-bold leading-snug text-foreground" title={fare.tier}>{fare.tier}</span>
                      <span aria-hidden="true" className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px]", on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/60 bg-card")}>
                        {on && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
                      <span className="flex min-w-0 items-start gap-1.5" title={mealLabel(fare, flight)}>
                        <MealIcon fare={fare} flight={flight} className="h-3.5 w-3.5" />
                        <span className="line-clamp-2 break-words">{mealLabel(fare, flight)}</span>
                      </span>
                      <span className="flex min-w-0 items-start gap-1.5" title={baggageWords(fare, flight)}>
                        <Luggage aria-hidden="true" className={cn("h-3.5 w-3.5 shrink-0", hasBaggage(fare, flight) ? "text-emerald-600" : "text-muted-foreground opacity-50")} />
                        <span className="line-clamp-2 break-words" aria-hidden="true">{baggageLabel(fare, flight)}</span>
                        <span className="sr-only">{baggageWords(fare, flight)}</span>
                      </span>
                    </span>
                    <span className="break-words text-sm font-black text-foreground">{farePrice(fare, flight).main}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5 px-4 pt-3 text-xs text-muted-foreground sm:px-5">
            <span className="min-w-0 break-words text-sm font-bold text-foreground" title={picked.tier}>{picked.tier}</span>
            <span className="flex min-w-0 items-center gap-1.5" title={mealLabel(picked, flight)}>
              <MealIcon fare={picked} flight={flight} className="h-3.5 w-3.5" />
              <span className="break-words">{mealLabel(picked, flight)}</span>
            </span>
            <span className="flex min-w-0 items-center gap-1.5" title={baggageWords(picked, flight)}>
              <Luggage aria-hidden="true" className={cn("h-3.5 w-3.5 shrink-0", hasBaggage(picked, flight) ? "text-emerald-600" : "text-muted-foreground opacity-50")} />
              <span className="break-words" aria-hidden="true">{baggageLabel(picked, flight)}</span>
              <span className="sr-only">{baggageWords(picked, flight)}</span>
            </span>
          </div>
        )}
        <div className={cn("flex items-center justify-between gap-3 px-4 py-3 sm:px-5", several ? "border-t bg-muted/30" : "")}>
          <div className="min-w-0" aria-live="polite">
            {several && <p className="line-clamp-2 break-words text-xs text-muted-foreground" title={picked.tier}>{picked.tier}</p>}
            <p className="break-words text-lg font-black leading-tight text-primary sm:text-xl" title={[pickedPrice.main, pickedPrice.note].filter(Boolean).join(" ")}>{pickedPrice.main}</p>
            {(pickedPrice.note || pickedPrice.secondary) && (
              <p className="break-words text-xs text-muted-foreground">{[pickedPrice.note, pickedPrice.secondary && `(${pickedPrice.secondary})`].filter(Boolean).join(" ")}</p>
            )}
          </div>
          <div className="w-36 shrink-0 sm:w-40">
            {searchExpired ? (
              <Button className="h-11 w-full rounded-xl px-4 font-semibold" onClick={revalidateSearch}>Revalidate</Button>
            ) : (
              <Link to={bookingHref(flight, picked)} className="block min-w-0">
                <Button className="h-11 w-full rounded-xl px-4 font-semibold">Book</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Stop airports of the (outbound) trip: the gateway's stays, else the airports between this flight's own segments.
  const stopCodes = (flight: TravelianFlight) => {
    const fromLayovers = (flight.layovers || []).map((layover) => String(layover.location || "").trim().toUpperCase()).filter(Boolean);
    if (fromLayovers.length || tripType !== "oneway") return fromLayovers;
    return (flight.segments || []).slice(0, -1).map((segment) => String(segment.destination || "").trim().toUpperCase()).filter(Boolean);
  };
  /** "1 Stop · Abu Dhabi, United Arab Emirates" ("" for a non-stop flight; callers show "Non-stop"). */
  const stopLabel = (flight: TravelianFlight) => (flight.stops ? stopLine(flight.stops, stopCodes(flight)) : "");
  /** Under the duration on a card (#119, #120): the stop count ("Non-stop", "1 Stop") and, below it, where the passenger stays. */
  // #194: oneLine keeps the stop cities on one line (ellipsis) in the narrow phone time row; the full list is in the title
  // and in Flight Details.
  const stopsUnderDuration = (count: string, places?: string, oneLine = false) => (
    <span className="flex max-w-full flex-col items-center text-center" title={places ? `${count} · ${places}` : count}>
      <span className="max-w-full truncate text-xs font-medium text-success">{count}</span>
      {places && <span data-testid="stop-places" className={cn("max-w-full text-xs text-muted-foreground", oneLine ? "truncate" : "line-clamp-2 break-words")}>{places}</span>}
    </span>
  );

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
  /** The expiry badge's words: the time left (bold), or why there is none. */
  /** Flight Details on the public site shows Flight Info only. */
  const shownDetailsTab = adminMode ? fareDetailsTab : "flight";
  const expiryContent = apiStatus === "success" && flights.length > 0
    ? searchExpired ? "Search expired" : <>Expires in <span className="font-extrabold">{expiryLabel}</span></>
    : apiStatus === "error" ? "Expiry unavailable"
    : apiStatus === "success" ? "No active fares" : "Waiting for fares";
  const calculatorTotal = (Number(calculatorBase) || 0) + (Number(calculatorTaxes) || 0) + (Number(calculatorServiceFee) || 0);

  /** #53: one WhatsApp link per flight: each journey's flight numbers, route and date, the cabin, and the lowest price
   *  shown on the card (lowestFare: the card's first fare row, as the gateway priced it). */
  const flightWhatsAppHref = (flight: TravelianFlight, lowestFare?: DisplayFare) => {
    const groups = journeyGroups(flight);
    const labels = isTwoWay(flight) ? ["Outbound", "Return"] : groups.map((_, index) => (groups.length > 1 ? `Flight ${index + 1}` : ""));
    const journeys = groups.map((group, index) => ({
      label: labels[index] || "",
      flightNumbers: [...new Set(group.map((segment) => String(segment.flightNumber || "").trim()).filter(Boolean))],
      origin: airportCode(group[0]?.origin) || flight.origin,
      destination: airportCode(group[group.length - 1]?.destination) || flight.destination,
      date: formatFlightDate(group[0]?.departureTime || flight.departureTime).replace(/^(\d{2}) (\w{3}) (\d{4})$/, "$2 $1, $3"),
    }));
    const price = lowestFare ? formatFare(lowestFare.price.total, lowestFare.price.currency || flight.currency) : formatFare(flight.price, flight.currency);
    return whatsappUrl(flightHelpMessage({ airline: flight.airline, journeys, cabin: travelers.cabin || flight.class, lowestPrice: price }));
  };

  const bookingHref = (flight: TravelianFlight, fare?: { allTravelersTotal?: number; tier: string; price: { base?: number | null; taxes?: number | null; total: number; currency?: string }; amenities?: string[]; gatewayFareIds?: string[]; refund?: string | null; cancellation?: string | null }) => {
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
    // A group fare flies on its own date (a group search can be for any date, or show nearby dates).
    const groupDay = flight.provider === GATEWAY_GROUP_PROVIDER ? parseDateOnly(String(flight.departureTime || "").slice(0, 10)) : undefined;
    const query = new URLSearchParams({
      type: "flight",
      flightId: flight.flightId,
      airline: flight.airline,
      flightNo: flight.flightNumber,
      from: flight.origin,
      to: flight.destination,
      date: format(groupDay ?? departDate, "MMM dd, yyyy"),
      cabin: flight.class,
      trip: tripType,
      adults: String(travelers.adults),
      children: String(travelers.children),
      infants: String(travelers.infants),
      price: String(fare?.price.total ?? flight.price),
      currency: fare?.price.currency || flight.currency || "PKR",
    });
    // #113: the gateway's total for all travelers, so checkout shows it instead of the per-adult price x travelers.
    const allTravelers = fare && "allTravelersTotal" in fare ? fare.allTravelersTotal : flight.fareOptions?.[0]?.allTravelersTotal;
    if (allTravelers && allTravelers > 0) query.set("total", String(allTravelers));
    if (fare?.tier) query.set("fare", fare.tier);
    // A group fare from the Travelian gateway: booked and priced by the gateway (the price here is for display only).
    if (flight.provider === GATEWAY_GROUP_PROVIDER && flight.offerId) query.set("groupTicketId", String(flight.offerId));
    // A live flight fare from the gateway: checkout sends a booking request by these ids; the gateway reprices it (B19).
    const fareIds = fare?.gatewayFareIds ?? flight.fareOptions?.[0]?.gatewayFareIds;
    if (flight.gatewaySearchId && fareIds?.length) {
      query.set("searchId", flight.gatewaySearchId);
      query.set("fareIds", fareIds.join(","));
    }
    if (Number.isFinite(Number(fare?.price.base))) query.set("baseFare", String(fare?.price.base));
    if (Number.isFinite(Number(fare?.price.taxes))) query.set("taxes", String(fare?.price.taxes));
    if (fare?.amenities?.length) query.set("farePerks", fare.amenities.join("|"));
    // #149: checkout shows Refundable / Non-refundable only when the fare data says so (same rule as fare details).
    const refund = refundStatus(flight.refundable, fare ? fare.cancellation || fare.refund : flight.fareOptions?.[0]?.refund);
    if (refund) query.set("refund", refund);
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

  // B24 / D46: the date strip reads the gateway's fare calendar (one call, asked again while the gateway checks the
  // missing dates itself) instead of running a live search per date, which used up the public search limit (429s).
  // The calendar is one-way, so a round trip shows the dates without prices.
  const stripFares = useFlightFares(tripType === "oneway" || groupsOnly, {
    from: airportCodeOf(from), to: airportCodeOf(to), adults: travelers.adults,
    cabin: travelers.cabin.toLowerCase().replace(/\s+/g, "_"), start: formatDateOnly(dateFlexDays[0].date),
  }, groupsOnly ? groupCalendar : undefined);
  const dateFareMap = useMemo<Record<string, { price: number; currency: string } | null>>(() => Object.fromEntries(
    stripFares.days.filter((day) => day.available && day.lowest_price)
      .map((day) => [day.date, { price: day.lowest_price!.amount_minor / 100, currency: day.lowest_price!.currency }]),
  ), [stripFares.days]);

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
  const baggageOptions = baggageFilterOptions(flights.flatMap(flightBaggages));
  const activeFilterLabels = [
    ...selectedAirlines.map((airline) => ({ key: `airline-${airline}`, label: airline, onRemove: () => toggleAirline(airline) })),
    ...selectedStops.map((value) => ({ key: `stop-${value}`, label: stopOptions.find((option) => option.value === value)?.label || value, onRemove: () => toggleStopFilter(value) })),
    ...selectedDepartureTimes.map((value) => ({ key: `departure-${value}`, label: departureTimeOptions.find((option) => option.value === value)?.label || value, onRemove: () => toggleDepartureTimeFilter(value) })),
    ...selectedBaggage.map((value) => ({ key: `baggage-${value}`, label: value === BAGGAGE_UNKNOWN ? value : `Baggage ${baggageOptions.find((option) => option.value === value)?.label || value}`, onRemove: () => toggleBaggageFilter(value) })),
    ...(search ? [{ key: "search", label: `Search: ${search}`, onRemove: () => setSearch("") }] : []),
  ];
  const hasFilterChanges = activeFilterLabels.length > 0 || priceRange[0] > 0 || priceRange[1] < maxPrice;
  const fullPriceMax = Math.max(700, Math.ceil(maxPrice / 1000) * 1000);
  const clearAllFilters = () => {
    setSelectedAirlines([]);
    setSelectedStops([]);
    setSelectedDepartureTimes([]);
    setSelectedBaggage([]);
    setPriceRange([0, fullPriceMax]);
    setSearch("");
  };
  // #150: filters and sort in the URL. A price range is written only when narrowed; until results arrive the URL's own
  // range is kept (it is applied to the first results).
  const priceNarrowed = priceRange[0] > 0 || priceRange[1] < fullPriceMax;
  const priceFilter: [number, number] | null = apiStatus !== "success" ? urlPrice.current : priceNarrowed ? [priceRange[0], priceRange[1]] : null;
  const urlFilters = { stops: selectedStops, departureTimes: selectedDepartureTimes, baggage: selectedBaggage, airlines: selectedAirlines, sort, price: priceFilter };
  const urlFiltersKey = JSON.stringify(urlFilters);
  useEffect(() => {
    if (withFilterParams(params, urlFilters).toString() === params.toString()) return;
    setParams((current) => withFilterParams(current, urlFilters), { replace: true });
  }, [urlFiltersKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const mobileFilterCount = activeFilterCount(urlFilters);
  const showPhoneBar = !searchExpired && apiStatus === "success" && flights.length > 0;
  useEffect(() => {
    const place = phoneBarPlace.current;
    if (!showPhoneBar || !place) return;
    const headerHeight = adminMode ? 64 : 57;
    const update = () => setPhoneBarPinned(place.getBoundingClientRect().top < headerHeight);
    update();
    document.addEventListener("scroll", update, { capture: true, passive: true });
    window.addEventListener("resize", update);
    return () => {
      document.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
    };
  }, [showPhoneBar, adminMode]);
  const flightCountText = `${filtered.length} ${filtered.length === 1 ? "flight" : "flights"}`;
  const tryDate = (date: Date) => {
    const safeDate = clampToToday(date);
    setDepartDate(safeDate);
    setSelectedAirlines([]);
    setSearch("");
    const next = new URLSearchParams(params);
    next.set("depart", formatDateOnly(safeDate));
    next.delete("airline");
    setParams(next, { replace: true });
  };
  /** The summary's city under an airport code ("Lahore"); the code when the airport isn't known. */
  const summaryCity = (code: string) => {
    const clean = airportCodeOf(code);
    return (airportByCode(clean) || popularAirportByCode.get(clean))?.city || clean;
  };
  const summaryDates = tripType === "multicity" && segments.length
    ? [segments[0].date, segments[segments.length - 1].date].filter((date): date is Date => Boolean(date)).map((date) => format(date, "EEE, d MMM")).filter((text, index, all) => all.indexOf(text) === index).join(" – ") + ` · ${segments.length} flights`
    : anyDate ? "Any date"
    : tripType === "roundtrip" && returnDate ? `${format(departDate, "EEE, d MMM")} – ${format(returnDate, "EEE, d MMM")}` : format(departDate, "EEE, d MMM");
  const swapRoute = () => {
    const newFrom = to;
    const newTo = from;
    setFrom(newFrom);
    setTo(newTo);
    setSelectedFlight(null);
    const next = new URLSearchParams(params);
    next.set("from", newFrom);
    next.set("to", newTo);
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
  const stopTextForSegments = (group: ItinerarySegment[]) =>
    stopSummary(Math.max(group.length - 1, 0), group.slice(0, -1).map((segment) => airportCode(segment.destination)));
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
      duration: minutesText(journeyMinutes(group)) || getDuration(first.departureTimestamp || first.departureTime || "", last.arrivalTimestamp || last.arrivalTime || ""),
      stopText: stopTextForSegments(group).count,
      stopPlaces: stopTextForSegments(group).places,
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
  const flightStopText = (flight: TravelianFlight) => {
    const { count, places } = stopSummary(flight.stops || 0, stopCodes(flight));
    return { stopText: count, stopPlaces: places };
  };
  /** #175: a group return fare (on any search) is an outbound and a return journey, by each flight's own direction. */
  const hasReturnLegs = (flight: TravelianFlight) => Boolean(flight.segments?.some((segment) => segment.direction === "return"));
  const directionGroups = (flight: TravelianFlight): ItinerarySegment[][] | null => {
    if (!hasReturnLegs(flight)) return null;
    const segs = itinerarySegments(flight);
    return [segs.filter((segment) => segment.direction !== "return"), segs.filter((segment) => segment.direction === "return")].filter((group) => group.length);
  };
  const isTwoWay = (flight: TravelianFlight) => tripType === "roundtrip" || hasReturnLegs(flight);
  const journeyLegsForCard = (flight: TravelianFlight): DisplayJourneyLeg[] => {
    const byDirection = directionGroups(flight);
    if (byDirection) {
      return byDirection
        .map((group, index) => legFromSegments(group, index === 0 ? "Outbound" : "Return", `${flight.flightId}-${index === 0 ? "out" : "ret"}`))
        .filter((leg): leg is DisplayJourneyLeg => Boolean(leg));
    }
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
          ...flightStopText(flight),
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
            stopText: "Non-stop",
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
      ...flightStopText(flight),
    }];
  };
  const LegTimelineDesktop = ({ leg }: { leg: DisplayJourneyLeg }) => (
    <div className="min-w-0 space-y-1.5">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">{leg.label}</p>
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0 shrink-0 basis-[8.75rem] text-left">
          <p className="text-xl font-bold leading-none text-foreground">{formatFlightTime(leg.departureTime)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatFlightDate(leg.departureTime)}</p>
          <p className="truncate text-xs text-muted-foreground" title={routeLabel(leg.origin, leg.originAirport)}>{routeLabel(leg.origin, leg.originAirport)}</p>
        </div>
        <div className="flex min-w-[5rem] flex-1 flex-col items-center px-1">
          <span className="max-w-full truncate text-xs font-medium text-muted-foreground">{leg.duration || getDuration(leg.departureTime, leg.arrivalTime)}</span>
          <div className="relative my-1.5 h-px w-full bg-border">
            <div className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-primary bg-card" />
            <div className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-primary" />
          </div>
          {stopsUnderDuration(leg.stopText || "Non-stop", leg.stopPlaces)}
        </div>
        <div className="min-w-0 shrink-0 basis-[8.75rem] text-left">
          <p className="text-xl font-bold leading-none text-foreground">{formatFlightTime(leg.arrivalTime)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatFlightDate(leg.arrivalTime)}</p>
          <p className="truncate text-xs text-muted-foreground" title={routeLabel(leg.destination, leg.destinationAirport)}>{routeLabel(leg.destination, leg.destinationAirport)}</p>
        </div>
      </div>
    </div>
  );
  const LegTimelineMobile = ({ leg }: { leg: DisplayJourneyLeg }) => (
    <div className="min-w-0 rounded-xl bg-muted/40 px-3 py-2">
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">{leg.label}</p>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="font-bold text-foreground">{formatFlightTime(leg.departureTime)}</span>
        <span className="font-semibold text-foreground">{airportCode(leg.origin)}</span>
        <span aria-hidden="true">──</span>
        <span className="truncate">{leg.duration || getDuration(leg.departureTime, leg.arrivalTime)}</span>
        <span aria-hidden="true">──</span>
        <span className="font-bold text-foreground">{formatFlightTime(leg.arrivalTime)}</span>
        <span className="font-semibold text-foreground">{airportCode(leg.destination)}</span>
        <span>·</span>
        <span className="min-w-0 max-w-full truncate text-success" title={leg.stopPlaces ? `${leg.stopText} · ${leg.stopPlaces}` : leg.stopText}>
          {leg.stopText || "Non-stop"}{leg.stopPlaces ? ` · ${leg.stopPlaces}` : ""}
        </span>
        <span>·</span>
        <span className="truncate">{formatFlightDate(leg.departureTime)}</span>
      </div>
    </div>
  );
  // The flights of each journey (one-way: one; round trip: outbound and return; multi-city: one per searched flight).
  // A stay is only between two flights of the same journey, never between the outbound and the return.
  const journeyGroups = (flight: TravelianFlight): ItinerarySegment[][] => {
    const segs = itinerarySegments(flight);
    const byDirection = directionGroups(flight);
    if (byDirection) return byDirection;
    if (tripType === "roundtrip") {
      const { outbound, inbound } = splitRoundtripSegments(flight);
      return [outbound, inbound].filter((group) => group.length);
    }
    if (tripType === "multicity") {
      const groups = splitMulticitySegments(flight);
      if (groups.length >= 2 && groups.reduce((total, group) => total + group.length, 0) === segs.length) return groups;
    }
    return [segs];
  };
  /** The stays of each journey on a card (the same stays Flight Details lists), so the card can show them in full. */
  const cardStays = (flight: TravelianFlight): { label: string; stays: Stay[] }[] => {
    const groups = journeyGroups(flight);
    const layovers = flight.layovers || [];
    const layoverAt = (code: string) => layovers.find((layover) => String(layover.location || "").trim().toUpperCase() === code);
    const labels = isTwoWay(flight) ? ["Outbound", "Return"] : groups.map((_, index) => (groups.length > 1 ? `Flight ${index + 1}` : ""));
    return groups.map((group, groupIndex) => {
      const stays = group.length === 1
        ? (groupIndex === 0 && (flight.stops || 0) > 0 ? layovers.filter((layover) => String(layover.location || "").trim()).map((layover) => stayAt(layover)) : [])
        : group.slice(0, -1).map((segment, index) => {
          const next = group[index + 1];
          return stayBetween(segment, next, layoverAt(String(next.origin || segment.destination || "").trim().toUpperCase()));
        });
      return { label: labels[groupIndex] || "", stays: stays.filter((stay) => stay.code || stay.place) };
    }).filter((journey) => journey.stays.length);
  };
  /** Under the card's times: every stop in full (how long, city, country, airport), wrapping instead of cut off. */
  const renderCardStays = (journeys: { label: string; stays: Stay[] }[]) => (
    <ul aria-label="Stops" className="flex min-w-0 flex-col gap-1.5">
      {journeys.flatMap((journey) => journey.stays.map((stay, index) => (
        <li key={`${journey.label}-${stay.code}-${index}`} data-testid="card-stay" className="flex min-w-0 items-start gap-2 rounded-lg bg-primary/5 px-3 py-1.5 text-xs text-foreground">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <p className="min-w-0 break-words">
            {journey.label && <span className="font-bold uppercase tracking-wide text-primary">{journey.label} · </span>}
            <span className="font-semibold">{stay.duration ? `${stay.duration} layover` : "Layover"}</span>
            <span aria-hidden="true"> · </span>
            <span>{stay.city ? `${stay.city} (${stay.code})` : stay.place}</span>
            {stay.country && stay.country.toLowerCase() !== stay.city.toLowerCase() && <span className="text-muted-foreground">, {stay.country}</span>}
          </p>
        </li>
      )))}
    </ul>
  );
  // #163: the itinerary the owner asked for: per journey a date / duration / stops line, then each flight on a vertical
  // line (time and date, airport, airline and flight number) and a layover line between flights. #83, #84, #122: the
  // stay shows how long, the city and its country; never a flight name or number.
  const longDate = (value?: string | null) => {
    const date = new Date(String(value || ""));
    if (!Number.isNaN(date.getTime())) return format(date, "EEE, MMM dd, yyyy");
    const parsed = parseDateOnly(String(value || "").split(" ")[0]);
    return parsed ? format(parsed, "EEE, MMM dd, yyyy") : "";
  };
  const shortDate = (value?: string | null) => {
    const date = new Date(String(value || ""));
    return Number.isNaN(date.getTime()) ? "" : format(date, "dd MMM");
  };
  const placeLine = (code?: string | null) => {
    const clean = airportCode(code);
    const airport = airportByCode(clean) || popularAirportByCode.get(clean);
    const city = airport?.city || "";
    const name = airport && "name" in airport ? String(airport.name || "") : "";
    return { head: city ? `${city} (${clean})` : clean, name: name && name !== city ? name : "" };
  };
  const StayLine = ({ stay }: { stay: Stay }) => (
    <section aria-label={`Stop at ${stay.place}`} className="my-3 ml-[4.75rem] flex min-w-0 items-start gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm text-foreground">
      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="min-w-0 break-words">
        <span className="font-semibold">{stay.duration ? `${stay.duration} layover` : "Layover"}</span>
        <span aria-hidden="true"> • </span>
        <span>{stay.city ? `${stay.city} (${stay.code})` : stay.code}</span>
        {stay.country && <span className="text-muted-foreground">, {stay.country}</span>}
      </p>
    </section>
  );
  const PointRow = ({ time, date, code, last }: { time?: string | null; date?: string | null; code?: string | null; last?: boolean }) => {
    const place = placeLine(code);
    return (
      <div className="grid grid-cols-[3.5rem_1rem_minmax(0,1fr)] gap-x-3">
        <div>
          <p className="text-base font-bold leading-tight text-foreground">{formatFlightTime(time)}</p>
          {shortDate(date) && <p className="text-xs text-muted-foreground">{shortDate(date)}</p>}
        </div>
        <div className="flex justify-center pt-1.5">
          <span className={cn("relative z-10 h-3 w-3 rounded-full border-2 border-foreground/70 bg-card", last && "bg-foreground/70")} aria-hidden="true" />
        </div>
        <p className="min-w-0 break-words text-sm text-foreground">
          <span className="font-semibold">{place.head}</span>
          {place.name && <span className="text-muted-foreground"> • {place.name}</span>}
        </p>
      </div>
    );
  };
  /** "Lahore – Dubai" (the cities, else the codes) for the Flight Details title. */
  const detailsRouteTitle = (flight: TravelianFlight) => {
    const city = (code: string) => placeLine(code).head.replace(/ \([A-Z]{3}\)$/, "") || code;
    return `${city(flight.origin)} – ${city(flight.destination)}`;
  };
  const JourneyTimeline = ({ flight }: { flight: TravelianFlight }) => {
    const groups = journeyGroups(flight);
    const layovers = flight.layovers || [];
    const layoverAt = (code: string) => layovers.find((layover) => String(layover.location || "").trim().toUpperCase() === code);
    const labels = isTwoWay(flight) ? ["Outbound", "Return"] : groups.map((_, index) => (groups.length > 1 ? `Flight ${index + 1}` : ""));
    const cabin = travelers.cabin || flight.class;

    return (
      <div className="space-y-4">
        {groups.map((group, groupIndex) => {
          // The supplier sent the stop airports but not each flight: the stays sit inside the one flight.
          const innerStays = group.length === 1 && groupIndex === 0 && (flight.stops || 0) > 0
            ? layovers.filter((layover) => String(layover.location || "").trim()).map((layover) => stayAt(layover))
            : [];
          const stops = group.length > 1 ? group.length - 1 : innerStays.length;
          const total = minutesText(journeyMinutes(group)) || (group.length === 1 ? segmentDuration(group[0]) : "");
          const summary = [total && total !== "Duration TBA" ? total : "", stops ? `${stops} ${stops === 1 ? "stop" : "stops"}` : "Non-stop"].filter(Boolean).join(" · ");
          const label = labels[groupIndex] || "";
          return (
            <section key={`journey-${groupIndex}`} aria-label={label || "Itinerary"} className="overflow-hidden rounded-2xl border bg-card">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b bg-muted/50 px-4 py-3">
                {label && <span className="text-xs font-bold uppercase tracking-wide text-primary">{label}</span>}
                <span className="font-display text-base font-bold text-foreground">{longDate(group[0]?.departureTime || flight.departureTime)}</span>
                <span className="text-sm text-muted-foreground">{summary}</span>
              </div>
              <div className="px-4 py-4">
                {group.map((segment, index) => {
                  const nextSegment = group[index + 1];
                  const stay = nextSegment ? stayBetween(segment, nextSegment, layoverAt(String(nextSegment.origin || segment.destination || "").trim().toUpperCase())) : undefined;
                  const flightNumber = segment.flightNumber || flight.flightNumber;
                  const segmentAirline = segment.airline || getAirlineNameFromCarrier(segment.carrier) || segment.carrier || flight.airline;
                  const isSameAsParent = isSameAirline(segmentAirline, flight.airline);
                  const duration = segmentDuration(segment);
                  return (
                    <div key={`${flightNumber}-${groupIndex}-${index}`}>
                      <div className="relative" data-testid="itinerary-flight">
                        <span className="absolute bottom-3 left-[calc(3.5rem+0.75rem+0.5rem-0.5px)] top-3 w-px bg-border" aria-hidden="true" />
                        <PointRow time={segment.departureTime} date={segment.departureTime} code={segment.origin} />
                        <div className="grid grid-cols-[3.5rem_1rem_minmax(0,1fr)] gap-x-3 py-3">
                          <p className="self-center text-xs text-muted-foreground">{duration !== "Duration TBA" ? duration : ""}</p>
                          <span aria-hidden="true" />
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                              <AirlineLogo airline={segmentAirline} flightNumber={flightNumber} imageUrl={isSameAsParent && !adminMode ? flight.airlineImage : undefined} className="h-6 w-6 shrink-0 rounded-md border-0 shadow-none ring-0" />
                              <span className="truncate" title={segmentAirline}>{segmentAirline}</span>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground" title={[cabin, flightNumber].filter(Boolean).join(" • ")}>
                              {[cabin, flightNumber].filter(Boolean).join(" • ")}
                            </p>
                          </div>
                        </div>
                        <PointRow time={segment.arrivalTime} date={segment.arrivalTime} code={segment.destination} last />
                      </div>
                      {innerStays.map((inner, stayIndex) => <StayLine key={`${inner.code}-${stayIndex}`} stay={inner} />)}
                      {stay && <StayLine stay={stay} />}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    );
  };
  const dateFareLabel = (date: Date) => {
    const dateKey = formatDateOnly(date);
    if (!anyDate && dateKey === formatDateOnly(departDate) && bestFlight) return formatFare(bestFlight.price, bestFlight.currency);
    const fare = dateFareMap[dateKey];
    return fare ? formatFare(fare.price, fare.currency) : "-";
  };
  const revalidateSearch = () => {
    setSelectedFlight(null);
    setModalFaresCache({});
    setSearchRefreshKey((value) => value + 1);
  };

  const openFlightDetails = async (flight: TravelianFlight, primaryFare: DisplayFare) => {
    setFareDetailsTab("flight");
    setExpandedFareRule(primaryFare.tier);
    setFareDetails({ flight, fare: primaryFare });
    setModalFaresError(null);

    const cachedOptions = modalFaresCache[flight.flightId] || (flight.fareOptions && flight.fareOptions.length > 1 ? flight.fareOptions : null);
    if (cachedOptions) {
      setModalFaresLoading(false);
      return;
    }

    // Admin screens never call the legacy API (#130): their fares come with the signed-in gateway search.
    if (!adminMode && flight.provider === "sooperfare" && flight.rawRef?.faresPayload) {
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

  // The filter groups (#150): the desktop sidebar, and on phones the Filters sheet (Sort has its own sheet there).
  const filterGroups = (phone: boolean) => (
    <>
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
      {!phone && (
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
      )}
      {flights.length > 0 && <Card className="shadow-card border-0">
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground text-sm mb-4">Price Range ({currency})</h3>
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
                <span className="min-w-0 truncate text-xs text-muted-foreground">{option.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
      {baggageOptions.length > 0 && <Card className="shadow-card border-0">
        <CardContent className="p-4">
          <h3 id="baggage-filter" className="font-semibold text-foreground text-sm mb-3">Baggage</h3>
          {/* #36: built from the fares in these results, in the short form, lightest first. */}
          <div role="group" aria-labelledby="baggage-filter" className="space-y-2.5">
            {baggageOptions.map(option => (
              <label key={option.value} className="flex min-w-0 cursor-pointer items-center gap-2" title={option.label}>
                <Checkbox checked={selectedBaggage.includes(option.value)} onCheckedChange={() => toggleBaggageFilter(option.value)} aria-label={underBaggageLabel(option.label)} />
                <span className="min-w-0 truncate text-xs text-muted-foreground">{underBaggageLabel(option.label)}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>}
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
    </>
  );

  return (
    <div className={adminMode ? "-m-4 md:-m-6 bg-muted/30 min-h-[calc(100vh-3.5rem)]" : ""}>
      <SEO
        title={groupsOnly ? `Group fares ${from} to ${to} - Travelian` : `Flights ${from} to ${to} - Travelian`}
        description={groupsOnly ? `Book available ${from} to ${to} group ticket fares with Travelian.` : `Compare available ${from} to ${to} flight fares for ${format(departDate, "PPP")}.`}
        {...(groupsOnly ? { breadcrumbs: [{ name: "Group Ticketing", path: "/group-ticketing" }] } : {})}
      />
      {/* Visually-hidden H1 for SEO/a11y, keeps premium look intact */}
      <h1 className="sr-only">{groupsOnly ? "Group fare results" : "Flight search results"}: {from} to {to}</h1>

      {/* Search summary */}
      <section aria-label="Flight search summary" className={cn("relative isolate bg-sidebar", adminMode ? "gradient-hero py-2" : "py-3 sm:py-4")}>
        <div className={adminMode ? "px-4 md:px-6" : "travelian-container"}>
          {adminMode ? (
            <div className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/10 px-4 py-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className={cn("flex items-center gap-2 text-primary-foreground text-sm flex-wrap min-w-0")}>
                  <Plane className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 max-w-[14rem] truncate font-semibold">{routeLabel(from)}</span>
                  <button
                    type="button"
                    onClick={swapRoute}
                    aria-label="Swap origin and destination"
                    className={cn("relative h-6 w-6 rounded-full border border-primary-foreground/30 flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground transition-colors shrink-0 before:absolute before:-inset-3 before:content-[''] sm:before:hidden")}
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-0 max-w-[14rem] truncate font-semibold">{routeLabel(to)}</span>
                  <span className={cn("text-primary-foreground text-xs")}>-</span>
                  <span className={cn("text-primary-foreground text-xs whitespace-nowrap")}>{format(departDate, "EEE, MMM d")}</span>
                  {tripType === "roundtrip" && returnDate && <span className={cn("text-primary-foreground text-xs whitespace-nowrap")}>to {format(returnDate, "EEE, MMM d")}</span>}
                  {tripType === "multicity" && <span className={cn("text-primary-foreground text-xs whitespace-nowrap")}>{segments.length} flights</span>}
                  <span className={cn("text-primary-foreground text-xs")}>-</span>
                  <span className={cn("text-primary-foreground text-xs whitespace-nowrap")}>{formatTravelers(travelers)}</span>
                  <span className={cn("text-primary-foreground text-xs")}>-</span>
                  <span className={cn("text-primary-foreground text-xs whitespace-nowrap")}>{currency}</span>
                  {apiStatus === "loading" ? (
                    <>
                      <span className={cn("text-primary-foreground text-xs")}>-</span>
                      <span className={cn("text-primary-foreground text-xs whitespace-nowrap")}>Searching live fares</span>
                    </>
                  ) : !searchExpired ? (
                    <>
                      <span className={cn("text-primary-foreground text-xs")}>-</span>
                      <span className={cn("text-primary-foreground text-xs whitespace-nowrap")}>{filtered.length} live {filtered.length === 1 ? "fare" : "fares"}</span>
                    </>
                  ) : null}
                  <Badge role="timer" aria-label="Search expiry" aria-live="off" className={cn("gap-1 rounded-full border-0 whitespace-nowrap tabular-nums", searchExpired ? "bg-destructive/20 text-primary-foreground" : "bg-primary-foreground/15 text-primary-foreground")}>
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {expiryContent}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={openModify}
                  className="h-11 rounded-lg gap-2 sm:h-9"
                >
                  <Pencil className="h-3.5 w-3.5" /> Modify Search
                </Button>
              </div>
            </div>
          ) : (
            /* Public: the route (codes and cities, swap between), the trip as chips, then fares, expiry and Modify Search. */
            <div className="flex flex-col gap-3 rounded-2xl border border-primary-foreground/10 bg-primary-foreground/[0.07] px-3.5 py-3.5 text-primary-foreground sm:px-5 lg:flex-row lg:items-center lg:gap-6 lg:py-3.5">
              {tripType === "multicity" && segments.length ? (
                <ol aria-label="Route" className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 lg:shrink-0">
                  {[segments[0].from, ...segments.map((segment) => segment.to)].map((code, index) => (
                    <li key={`${code}-${index}`} className="flex min-w-0 items-center gap-2">
                      {index > 0 && <ArrowRight className="h-4 w-4 shrink-0 text-primary-foreground/70" aria-hidden="true" />}
                      <span className="flex min-w-0 flex-col">
                        <span className="font-display text-xl font-bold leading-none sm:text-2xl">{airportCodeOf(code)}</span>
                        <span className="mt-1 truncate text-xs text-primary-foreground/80 sm:text-sm">{summaryCity(code)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 lg:flex lg:shrink-0 lg:gap-3.5">
                  <div className="min-w-0">
                    <p className="font-display text-2xl font-bold leading-none">{airportCodeOf(from)}</p>
                    <p className="mt-1 truncate text-sm text-primary-foreground/80" title={summaryCity(from)}>{summaryCity(from)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={swapRoute}
                    aria-label="Swap origin and destination"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary-foreground/25 bg-primary-foreground/5 text-primary-foreground transition-colors duration-150 hover:bg-primary-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground active:bg-primary-foreground/25 motion-reduce:transition-none lg:h-9 lg:w-9"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 text-right lg:text-left">
                    <p className="font-display text-2xl font-bold leading-none">{airportCodeOf(to)}</p>
                    <p className="mt-1 truncate text-sm text-primary-foreground/80" title={summaryCity(to)}>{summaryCity(to)}</p>
                  </div>
                </div>
              )}
              <div aria-hidden="true" className="hidden w-px self-stretch bg-primary-foreground/15 lg:block" />
              <ul aria-label="Trip" className="flex min-w-0 flex-wrap gap-1.5 lg:flex-1 lg:gap-2">
                <li className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-primary-foreground/10 px-2.5 py-1 text-xs font-medium sm:text-sm">
                  <CalendarIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {summaryDates}
                </li>
                <li className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-primary-foreground/10 px-2.5 py-1 text-xs font-medium sm:text-sm">
                  <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {formatTravelerCount(travelers)} · {travelers.cabin}
                </li>
              </ul>
              <div className="flex items-center justify-between gap-3 border-t border-primary-foreground/10 pt-3 lg:shrink-0 lg:border-0 lg:pt-0">
                <div className="flex min-w-0 flex-col gap-1 lg:items-end">
                  <span className="text-xs text-primary-foreground/80 sm:text-sm">
                    {apiStatus === "loading" ? "Searching live fares" : !searchExpired ? `${filtered.length} live ${filtered.length === 1 ? "fare" : "fares"}` : null}
                    {apiStatus === "loading" || !searchExpired ? " · " : ""}{currency}
                  </span>
                  <span
                    role="timer"
                    aria-label="Search expiry"
                    aria-live="off"
                    className={cn(
                      "inline-flex w-fit items-center gap-1.5 whitespace-nowrap text-xs tabular-nums sm:text-sm",
                      searchExpired ? "rounded-full bg-destructive/25 px-2 py-0.5 font-bold text-red-100"
                        : apiStatus === "success" && flights.length > 0 ? "text-amber-300" : "text-primary-foreground/80",
                    )}
                  >
                    <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {expiryContent}
                  </span>
                </div>
                <Button onClick={openModify} className="h-11 shrink-0 gap-2 rounded-xl bg-card px-4 font-bold text-primary hover:bg-card/90 active:bg-card/80">
                  <Pencil className="h-4 w-4" aria-hidden="true" /> Modify Search
                </Button>
              </div>
            </div>
          )}
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
                  !anyDate && formatDateOnly(day.date) === formatDateOnly(departDate)
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                <span>{format(day.date, "EEE, MMM d")}</span>
                <span className={cn("text-xs mt-0.5", !anyDate && formatDateOnly(day.date) === formatDateOnly(departDate) ? "text-primary-foreground" : "text-muted-foreground")}>
                  {dateFareLabel(day.date)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Phones (#150): Filters and Sort stay at the top while scrolling; the sidebar filters show from md. */}
      {showPhoneBar && (
        // The page sits in a container that clips sideways, where position: sticky does not work: the bar is pinned
        // under the header (fixed) once its place scrolls past it; the wrapper keeps its height so nothing jumps.
        <div ref={phoneBarPlace} className="min-h-[61px] md:hidden">
        <section aria-label="Filter and sort results" className={cn("z-20 border-b bg-card/95 backdrop-blur",
          phoneBarPinned ? cn("fixed inset-x-0 shadow-sm", adminMode ? "top-16" : "top-[57px]") : "relative")}>
          <div className={cn("flex items-center gap-2 py-2", adminMode ? "px-4" : "travelian-container")}>
            <p className="shrink-0 text-xs font-semibold text-muted-foreground" aria-live="polite">{flightCountText}</p>
            <Button type="button" variant="outline" aria-haspopup="dialog" aria-label={mobileFilterCount ? `Filters, ${mobileFilterCount} selected` : "Filters"}
              className="h-11 min-w-0 flex-1 gap-2 rounded-xl px-3 font-semibold" onClick={() => setMobileFiltersOpen(true)}>
              <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Filters</span>
              {mobileFilterCount > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold leading-none text-primary-foreground">{mobileFilterCount}</span>}
            </Button>
            <Button type="button" variant="outline" aria-haspopup="dialog" className="h-11 min-w-0 flex-1 gap-2 rounded-xl px-3 font-semibold" onClick={() => setMobileSortOpen(true)}>
              <ArrowUpDown className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate"><span className="sr-only">Sort: </span>{sortShortLabel(sort)}</span>
            </Button>
          </div>
        </section>
        </div>
      )}
      <ResultsSheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen} title="Filters" description="Narrow the flight results" full
        footer={(
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" className="h-11 rounded-xl font-semibold" onClick={clearAllFilters}>Clear all</Button>
            <Button type="button" className="h-11 rounded-xl font-semibold" onClick={() => setMobileFiltersOpen(false)}>Show {flightCountText}</Button>
          </div>
        )}>
        <div className="space-y-3 bg-muted/30 p-4 [&_label]:min-h-11 [&_label>span]:text-sm [&_input]:h-11">{filterGroups(true)}</div>
      </ResultsSheet>
      <ResultsSheet open={mobileSortOpen} onOpenChange={setMobileSortOpen} title="Sort by" description="Choose how the flights are ordered">
        <div role="radiogroup" aria-label="Sort by" className="p-2">
          {sortOptions.map((option) => (
            <button key={option.value} type="button" role="radio" aria-checked={sort === option.value}
              onClick={() => { setSort(option.value); setMobileSortOpen(false); }}
              className={cn("flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm",
                sort === option.value ? "bg-primary/10 font-semibold text-primary" : "text-foreground hover:bg-muted")}>
              <span>{option.label}</span>
              {sort === option.value && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </ResultsSheet>

      <div className={cn(adminMode ? "px-4 md:px-6 py-5" : "travelian-container py-6")}>
        {SHOW_HIDDEN_SECTIONS && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm">
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
                {searchExpired ? "Search expired" : <>Expires in <span className="font-extrabold">{expiryLabel}</span></>}
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
                onChange={(event) => setSort(event.target.value as FlightSort)}
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
            <Button variant="ghost" size="sm" className="h-7 rounded-full text-xs" onClick={clearAllFilters}>
              Clear all
            </Button>
          </div>
        )}

        {/* Sort Tags */}
        {SHOW_HIDDEN_SECTIONS && !searchExpired && <div className="flex items-center gap-3 mb-6 overflow-x-auto scrollbar-hide">
          {[
            { id: "best", label: "Best", sub: bestFlight ? formatFare(bestFlight.price, bestFlight.currency) : "" },
            { id: "price-asc", label: "Cheapest", sub: bestFlight ? formatFare(bestFlight.price, bestFlight.currency) : "" },
            { id: "fastest", label: "Fastest", sub: fastestFlight ? getFlightDuration(fastestFlight) : "" },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setSort(s.id as FlightSort)}
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
            <h2 className="sr-only">Filter results</h2>
            {filterGroups(false)}
          </aside>

          {/* Results (min-w-0: cards shrink beside the filters instead of pushing Book off-screen, issue #90) */}
          <div className="min-w-0 flex-1 space-y-4">
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
              const allFares = fareRows(flight);
              const matchingFares = selectedBaggage.length ? allFares.filter(fare => selectedBaggage.includes(fareBaggage(fare, flight).short)) : allFares;
              const displayFares = matchingFares.length ? matchingFares : allFares;
              const primaryFare = displayFares[0];
              // Public cards: the picked fare, else the cheapest (also when a filter hides the picked one).
              const pickedFare = displayFares.find((fare) => fareKey(fare) === pickedFares[flight.flightId]) || primaryFare;
              const visibleFares = fareOptionsOpen ? displayFares : displayFares.slice(0, 1);
              const hiddenFareCount = Math.max(0, displayFares.length - 1);
              // Public cards: every stop in full under the times; the timeline then keeps just the stop count.
              const stayJourneys = adminMode ? [] : cardStays(flight);
              const staysShown = stayJourneys.length > 0;
              const legsForCard = journeyLegsForCard(flight);
              const legHasStays = (label: string) => stayJourneys.some((journey) => journey.label === label || (!journey.label && legsForCard.length === 1));
              const journeyLegs = legsForCard.map((leg) => (legHasStays(leg.label) ? { ...leg, stopPlaces: undefined } : leg));
              const showStackedLegs = tripType === "roundtrip" || tripType === "multicity" || hasReturnLegs(flight);

              return (
                <Card
                  key={flight.flightId}
                  className={`overflow-hidden transition-all duration-300 border-0 shadow-card hover:shadow-hover ${
                    fareOptionsOpen ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:gap-4">
                      {/* Issue #90: the one-line card header needs the room beside the filters that only lg has; below
                          that it stacks (airline, timeline, Flight Details), so nothing is pushed off-screen. */}
                      <div className="flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-start">
                        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3 lg:w-[11rem] lg:shrink-0 lg:pt-1">
                          <AirlineLogo airline={flight.airline} flightNumber={flight.flightNumber} imageUrl={adminMode ? undefined : flight.airlineImage} className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {/* Long names: one line with an ellipsis; tap to read the full name (issue #90). */}
                              <button type="button" title={flight.airline} aria-expanded={expandedAirlines.has(flight.flightId)}
                                onClick={() => toggleAirlineName(flight.flightId)}
                                className={cn("min-w-0 text-left text-xs sm:text-sm font-semibold text-foreground", "relative before:absolute before:-inset-x-3 before:-inset-y-3.5 before:content-[''] sm:before:hidden",
                                  expandedAirlines.has(flight.flightId) ? "whitespace-normal break-words" : "truncate")}>
                                {flight.airline}
                              </button>
                              {isGroup && (
                                <Users className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-label="Group" />
                              )}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1">
                              {/* Refundable/Non-refundable badge */}
                              {flight.refundable !== undefined && (
                                <Badge variant={flight.refundable ? "outline" : "secondary"} className={cn("rounded-md border-0 text-xs sm:text-xs", flight.refundable ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                                  {flight.refundable ? "Refundable" : "Non-refundable"}
                                </Badge>
                              )}
                              {flight.status === 'delayed' && <Badge className="bg-warning/10 text-warning border-0 text-xs rounded-md">Delayed</Badge>}
                            </div>
                          </div>
                        </div>

                        {/* Desktop: Option A stacked full timelines for return/multicity; one-way stays as today */}
                        <div className="hidden min-w-0 flex-1 lg:block">
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
                                <p className="mt-1 text-xs text-muted-foreground">{formatFlightDate(flight.departureTime)}</p>
                                <p className="truncate text-xs text-muted-foreground" title={flightOriginLabel(flight)}>{flightOriginLabel(flight)}</p>
                              </div>
                              <div className="flex min-w-[5rem] flex-1 flex-col items-center px-1">
                                <span className="max-w-full truncate text-xs font-medium text-muted-foreground">{getFlightDuration(flight)}</span>
                                <div className="relative my-1.5 h-px w-full bg-border">
                                  <div className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-primary bg-card" />
                                  <div className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-primary" />
                                </div>
                                {stopsUnderDuration(flightStopText(flight).stopText, staysShown ? undefined : flightStopText(flight).stopPlaces)}
                              </div>
                              <div className="min-w-0 shrink-0 basis-[8.75rem] text-left">
                                <p className="text-xl font-bold leading-none text-foreground">{formatFlightTime(flight.arrivalTime)}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{formatFlightDate(flight.arrivalTime)}</p>
                                <p className="truncate text-xs text-muted-foreground" title={flightDestinationLabel(flight)}>{flightDestinationLabel(flight)}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Mobile and tablet: Option B compact rows for return/multicity */}
                        <div className="min-w-0 flex-1 lg:hidden">
                          {showStackedLegs && journeyLegs.length > 1 ? (
                            <div className="space-y-2.5">
                              {journeyLegs.map((leg) => (
                                <LegTimelineMobile key={leg.key} leg={leg} />
                              ))}
                            </div>
                          ) : (
                            /* #194: three balanced columns: departure and arrival take their own width (capped, with an
                               ellipsis), arrival is right-aligned to the card edge, and the line between gets the rest. */
                            <div data-testid="flight-time-row" className="grid min-w-0 grid-cols-[auto_minmax(4rem,1fr)_auto] items-center gap-2.5 sm:gap-3">
                              <div className="min-w-0 max-w-[7.5rem] sm:max-w-[8.75rem] text-left">
                                <p className="text-lg sm:text-xl font-bold leading-none text-foreground">{formatFlightTime(flight.departureTime)}</p>
                                <p className="mt-1 text-xs sm:text-xs text-muted-foreground">{formatFlightDate(flight.departureTime)}</p>
                                <p className="truncate text-xs sm:text-xs text-muted-foreground" title={flightOriginLabel(flight)}>{flightOriginLabel(flight)}</p>
                              </div>
                              <div className="flex min-w-0 flex-col items-center px-1">
                                <span className="max-w-full truncate text-xs sm:text-xs font-medium text-muted-foreground">{getFlightDuration(flight)}</span>
                                <div className="relative my-1.5 h-px w-full bg-border">
                                  <div className="absolute left-0 top-1/2 h-2 w-2 sm:h-2.5 sm:w-2.5 -translate-y-1/2 rounded-full border-2 border-primary bg-card" />
                                  <div className="absolute right-0 top-1/2 h-2 w-2 sm:h-2.5 sm:w-2.5 -translate-y-1/2 rounded-full bg-primary" />
                                </div>
                                {stopsUnderDuration(flightStopText(flight).stopText, staysShown ? undefined : flightStopText(flight).stopPlaces, true)}
                              </div>
                              <div className="min-w-0 max-w-[7.5rem] sm:max-w-[8.75rem] text-right">
                                <p className="text-lg sm:text-xl font-bold leading-none text-foreground">{formatFlightTime(flight.arrivalTime)}</p>
                                <p className="mt-1 text-xs sm:text-xs text-muted-foreground">{formatFlightDate(flight.arrivalTime)}</p>
                                <p className="truncate text-xs sm:text-xs text-muted-foreground" title={flightDestinationLabel(flight)}>{flightDestinationLabel(flight)}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {primaryFare && (
                          <div className="ml-auto flex shrink-0 items-center gap-2 lg:mt-1">
                          {/* #53 / #163: one WhatsApp per flight, next to Flight Details; Book stays the main action on each fare. */}
                          <Button asChild variant="outline" size="sm" className="h-11 sm:h-8 shrink-0 gap-1.5 rounded-lg px-3 text-xs font-semibold">
                            <a href={flightWhatsAppHref(flight, primaryFare)} target="_blank" rel="noreferrer" aria-label={`Ask about ${flight.airline} ${flight.flightNumber} on WhatsApp`}>
                              <WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp
                            </a>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-11 sm:h-8 shrink-0 rounded-lg px-3 text-xs sm:text-xs font-semibold"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void openFlightDetails(flight, adminMode ? primaryFare : pickedFare);
                            }}
                          >
                            Flight Details
                          </Button>
                          </div>
                        )}
                      </div>
                      {staysShown && renderCardStays(stayJourneys)}
                      {!adminMode && renderFareChooser(flight, displayFares, pickedFare)}
                      {adminMode && (
                      <div className="overflow-hidden rounded-2xl border">
                        <table className="hidden w-full table-fixed border-collapse lg:table">
                          <colgroup>
                            <col className="w-[20%]" />
                            <col className="w-[18%]" />
                            <col className="w-[22%]" />
                            <col className="w-[17%]" />
                            <col className="w-[23%]" />
                          </colgroup>
                          <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                                    <MealIcon fare={fare} flight={flight} className="h-3.5 w-3.5" />
                                    <span className="line-clamp-2 break-words">{mealLabel(fare, flight)}</span>
                                  </p>
                                </td>
                                <td className="px-4 py-3 align-middle">
                                  <p className="flex min-w-0 items-center gap-1.5 text-muted-foreground" title={baggageWords(fare, flight)}>
                                    <Luggage aria-hidden="true" className={cn("h-3.5 w-3.5 shrink-0", hasBaggage(fare, flight) ? "text-emerald-600" : "text-muted-foreground opacity-50")} />
                                    <span className="truncate" aria-hidden="true">{baggageLabel(fare, flight)}</span>
                                    <span className="sr-only">{baggageWords(fare, flight)}</span>
                                  </p>
                                </td>
                                <td className="overflow-hidden px-3 py-3 text-center align-middle">
                                  <FarePriceText fare={fare} flight={flight} align="center" className="text-base font-black text-foreground" />
                                </td>
                                <td className="overflow-hidden px-3 py-3 text-right align-middle">
                                  <div className="flex min-w-0 flex-col items-stretch gap-2">
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
                        <div className="divide-y lg:hidden">
                          {visibleFares.map((fare) => (
                            <div key={`${flight.flightId}-${fare.tier}-${fare.price.total}`} className="bg-card px-4 py-4 text-sm space-y-3">
                              {/* Fare name */}
                              <div className="min-w-0">
                                <p className="truncate font-bold text-foreground text-base" title={fare.tier}>{fare.tier}</p>
                              </div>
                              
                              {/* Meal and Baggage in 2-column grid */}
                              <div className="grid grid-cols-2 gap-3">
                                <p className="flex min-w-0 items-center gap-2 text-muted-foreground text-xs" title={mealLabel(fare, flight)}>
                                  <MealIcon fare={fare} flight={flight} className="h-4 w-4" />
                                  <span className="line-clamp-2 break-words">{mealLabel(fare, flight)}</span>
                                </p>
                                <p className="flex min-w-0 items-center gap-2 text-muted-foreground text-xs" title={baggageWords(fare, flight)}>
                                  <Luggage aria-hidden="true" className={cn("h-4 w-4 shrink-0", hasBaggage(fare, flight) ? "text-emerald-600" : "text-muted-foreground opacity-50")} />
                                  <span className="truncate" aria-hidden="true">{baggageLabel(fare, flight)}</span>
                                  <span className="sr-only">{baggageWords(fare, flight)}</span>
                                </p>
                              </div>
                              
                              {/* Price and fare actions */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                <FarePriceText fare={fare} flight={flight} className="text-lg font-black text-primary" />
                                <div className="w-36 max-w-[50%] shrink-0">
                                  {searchExpired ? (
                                    <Button size="sm" className="h-11 w-full rounded-xl px-3 font-semibold sm:h-9" onClick={revalidateSearch}>Revalidate</Button>
                                  ) : (
                                    <Link to={bookingHref(flight, fare)} className="min-w-0">
                                      <Button size="sm" className="h-11 w-full rounded-xl px-3 font-semibold sm:h-9">Book</Button>
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
                              className="mx-auto flex h-11 gap-2 rounded-lg px-4 text-xs font-semibold text-primary hover:text-primary sm:h-8"
                              aria-expanded={fareOptionsOpen}
                              onClick={() => setSelectedFlight((current) => current === flight.flightId ? null : flight.flightId)}
                            >
                              {fareOptionsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              {fareOptionsOpen ? "Hide additional fares" : `Show ${hiddenFareCount} more ${hiddenFareCount === 1 ? "fare" : "fares"}`}
                            </Button>
                          </div>
                        )}
                      </div>
                      )}
                      <div className="hidden">
                        <div className="flex flex-col gap-2">
                          {SHOW_HIDDEN_SECTIONS && (
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
                          <a href={flightWhatsAppHref(flight, primaryFare)} target="_blank" rel="noreferrer">
                            <Button variant="outline" size="sm" className="w-full rounded-xl gap-2">
                              <WhatsAppIcon className="h-4 w-4" /> WhatsApp Help
                            </Button>
                          </a>
                        </div>
                      </div>
                    </div>

                    {SHOW_HIDDEN_SECTIONS && hasFareOptions && fareOptionsOpen && (
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
                                  {fare.popular && <Badge className="bg-gold text-gold-foreground border-0 text-xs">Popular</Badge>}
                                </div>
                              </div>
                              
                              {/* Mobile: 2-column grid for baggage and meal */}
                              <div className="mb-3 grid grid-cols-2 gap-3 text-xs md:mb-0 md:contents">
                                <span className="flex items-center gap-1.5 text-muted-foreground md:text-sm">
                                  <Luggage className="h-3.5 w-3.5 text-primary shrink-0" /> 
                                  <span className="truncate" title={fareBaggage(fare, flight).detail}>{baggageLabel(fare, flight)}</span>
                                </span>
                                <span className="flex items-center gap-1.5 text-muted-foreground md:text-sm">
                                  <Coffee className="h-3.5 w-3.5 text-primary shrink-0" /> 
                                  <span className="truncate">{mealText(flight.meal)}</span>
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
                  <Button variant="outline" className="rounded-lg" onClick={clearAllFilters}>
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
                {editSegments.map((segment, index) => {
                  const legError = editLegErrors[index] ?? {};
                  const legId = `modify-leg${index}`;
                  const previousDate = index > 0 ? editSegments[index - 1].date : undefined;
                  const message = (key: keyof LegErrors) => legError[key]
                    ? <p id={`${legId}-${key}-error`} className="mt-1 text-xs text-destructive">{legError[key]}</p> : null;
                  return (
                  <section key={index} aria-labelledby={`${legId}-title`} className="rounded-xl border border-border/70 bg-muted/20 p-3">
                    <div className="mb-2 flex min-h-8 items-center justify-between gap-2">
                      <h3 id={`${legId}-title`} className="text-xs font-semibold text-foreground">Flight {index + 1}</h3>
                      {editSegments.length > 2 && (
                        <button type="button" onClick={() => removeEditLeg(index)} aria-label={`Remove Flight ${index + 1}`}
                          className="-my-1.5 flex h-11 w-11 items-center justify-center rounded-full text-destructive transition-colors hover:bg-destructive/10 sm:h-8 sm:w-8">
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    <div className="grid items-start gap-2 sm:grid-cols-3">
                      <div className="min-w-0">
                        <label htmlFor={`${legId}-from`} className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
                        <AirportCombobox id={`${legId}-from`} value={segment.from} onChange={(value) => changeEditLeg(index, { from: value })} placeholder="Origin" invalid={!!legError.from}
                          onAdvance={() => setEditAdvance(current => ({ key: `to-${index}`, n: current.n + 1 }))} />
                        {message("from")}
                      </div>
                      <div className="min-w-0">
                        <label htmlFor={`${legId}-to`} className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
                        <AirportCombobox id={`${legId}-to`} value={segment.to} onChange={(value) => changeEditLeg(index, { to: value })} placeholder="Destination" iconVariant="arrival" invalid={!!legError.to}
                          openSignal={editSignal(`to-${index}`)} onAdvance={() => setEditSegmentDateOpen(index)} />
                        {message("to")}
                      </div>
                      <div className="min-w-0">
                        <label htmlFor={`${legId}-date`} className="mb-1 block text-xs font-medium text-muted-foreground">Date</label>
                        <CalendarPopup open={editSegmentDateOpen === index} onOpenChange={(open) => setEditSegmentDateOpen(open ? index : null)}>
                          <CalendarPopupTrigger asChild>
                            <button id={`${legId}-date`} type="button" aria-invalid={legError.date ? true : undefined} aria-describedby={legError.date ? `${legId}-date-error` : undefined}
                              className={cn("flex h-11 w-full items-center gap-2 rounded-xl border border-input bg-background px-3 text-left text-sm", legError.date && "border-destructive")}>
                              <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="truncate">{segment.date ? format(segment.date, "MMM dd, yyyy") : "Select date"}</span>
                            </button>
                          </CalendarPopupTrigger>
                          <CalendarPopupContent title="Select flight date">
                            <Calendar size="large" numberOfMonths={calendarMonths}
                              mode="single"
                              selected={segment.date}
                              onSelect={(date) => {
                                changeEditLeg(index, { date });
                                if (date) setEditSegmentDateOpen(null);
                              }}
                              disabled={previousDate ? { before: startOfDay(previousDate) } : undefined}
                              defaultMonth={segment.date ?? previousDate}
                              initialFocus
                              className="p-3 sm:p-5 pointer-events-auto"
                            />
                          </CalendarPopupContent>
                        </CalendarPopup>
                        {message("date")}
                      </div>
                    </div>
                  </section>
                  );
                })}
                <Button type="button" variant="outline" size="sm" disabled={editSegments.length >= MAX_MULTI_CITY_FLIGHTS} onClick={() => setEditSegments((current) => current.length < MAX_MULTI_CITY_FLIGHTS ? [...current, nextLeg(current)] : current)}>Add flight</Button>
              </div>
            ) : (
            <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <div className="min-w-0">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">From</label>
                <AirportCombobox value={editFrom} onChange={setEditFrom} className="h-11" placeholder="Origin"
                  onAdvance={() => setEditAdvance(current => ({ key: "to", n: current.n + 1 }))} />
              </div>
              <div className="hidden sm:flex items-center justify-center pb-1">
                <button type="button" onClick={swapEdit} aria-label="Swap origin and destination" className="h-9 w-9 rounded-full border-2 border-primary/30 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                  <ArrowLeftRight className="h-4 w-4" />
                </button>
              </div>
              <div className="min-w-0">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">To</label>
                <AirportCombobox value={editTo} onChange={setEditTo} className="h-11" placeholder="Destination" iconVariant="arrival"
                  openSignal={editSignal("to")} onAdvance={() => setEditDateOpen(true)} />
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
                  {editFares.ready ? (
                    <div className="w-[min(46rem,calc(100vw-2.5rem))] overflow-y-auto p-3 sm:p-5">
                      <GroupFareCalendar days={editFares.days} anyDate checking={editFares.checking}
                        status={editFares.status === "loading" || editFares.status === "error" ? editFares.status : "ready"}
                        selected={editDate ? format(editDate, "yyyy-MM-dd") : undefined}
                        onPick={(picked) => pickEditDeparture(parseISO(picked))} />
                    </div>
                  ) : (
                  <Calendar size="large" numberOfMonths={calendarMonths}
                    mode="single"
                    selected={editDate}
                    onSelect={pickEditDeparture}
                    initialFocus
                    className="p-3 sm:p-5 pointer-events-auto"
                  />
                  )}
                </CalendarPopupContent>
              </CalendarPopup>
            </div>
            {editTripType === "roundtrip" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Return Date</label>
                <CalendarPopup open={editReturnDateOpen} onOpenChange={setEditReturnDateOpen}>
                  <CalendarPopupTrigger asChild>
                    <button ref={editReturnRef} type="button" aria-invalid={editReturnError ? true : undefined} aria-describedby={editReturnError ? "modify-return-error" : undefined}
                      className={cn("flex items-center gap-2 h-11 w-full bg-background border border-input rounded-xl px-3 text-sm text-left", editReturnError && "border-destructive")}>
                      <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      {editReturnDate ? format(editReturnDate, "MMM dd, yyyy") : "Select return date"}
                    </button>
                  </CalendarPopupTrigger>
                  <CalendarPopupContent title="Select return date">
                    {editDate && editReturnFares.ready ? (
                      <div className="w-[min(46rem,calc(100vw-2.5rem))] overflow-y-auto p-3 sm:p-5">
                        <GroupFareCalendar days={editReturnFares.days} anyDate checking={editReturnFares.checking}
                          status={editReturnFares.status === "loading" || editReturnFares.status === "error" ? editReturnFares.status : "ready"}
                          selected={editReturnDate ? format(editReturnDate, "yyyy-MM-dd") : undefined}
                          min={format(editDate, "yyyy-MM-dd")} marked={format(editDate, "yyyy-MM-dd")}
                          onPick={(picked) => { setEditReturnDate(parseISO(picked)); setEditReturnError(undefined); setEditReturnDateOpen(false); }} />
                      </div>
                    ) : (
                    <Calendar size="large" numberOfMonths={calendarMonths}
                      mode="single"
                      selected={editReturnDate}
                      onSelect={(date) => {
                        setEditReturnDate(date);
                        if (date) { setEditReturnError(undefined); setEditReturnDateOpen(false); }
                      }}
                      disabled={editDate ? { before: startOfDay(editDate) } : undefined}
                      defaultMonth={editReturnDate ?? editDate}
                      modifiers={editDate ? { departure: editDate } : undefined}
                      modifiersClassNames={editDate ? { departure: "ring-2 ring-inset ring-primary" } : undefined}
                      initialFocus
                      className="p-3 sm:p-5 pointer-events-auto"
                    />
                    )}
                  </CalendarPopupContent>
                </CalendarPopup>
                {editReturnError && <p id="modify-return-error" role="alert" className="mt-1 text-xs text-destructive">{editReturnError}</p>}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Travelers</label>
                <TravelersClassPicker value={editTravelers} onChange={setEditTravelers} mode="travelers" fit />
              </div>
              <div className="min-w-0">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cabin Class</label>
                <TravelersClassPicker value={editTravelers} onChange={setEditTravelers} mode="cabin" fit />
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
              <DialogHeader className="sticky top-0 z-10 shrink-0 border-b bg-card px-4 py-3 pr-14 text-left sm:px-5">
                <p className="text-sm text-muted-foreground">Flight Details</p>
                <DialogTitle className="truncate font-display text-xl font-bold text-foreground" title={detailsRouteTitle(fareDetails.flight)}>
                  {detailsRouteTitle(fareDetails.flight)}
                </DialogTitle>
              </DialogHeader>

              {/* Public: Flight Info only (fare and baggage are on the card already); the admin keeps all three tabs. */}
              {adminMode && (
              <div className="shrink-0 bg-white/60 px-4 pt-3 sm:px-5">
                <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-xl border border-primary/15 bg-white p-1 text-xs font-bold text-slate-600 shadow-sm">
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
                        "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 transition-colors",
                        fareDetailsTab === tab ? "bg-primary text-primary-foreground shadow-sm" : "bg-transparent hover:bg-primary/5 hover:text-primary",
                      )}
                    >
                      {fareDetailsTab === tab && <Check className="hidden h-3.5 w-3.5 sm:block" aria-hidden="true" />}
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                {shownDetailsTab === "flight" && (
                  <JourneyTimeline flight={fareDetails.flight} />
                )}

                {shownDetailsTab === "rules" && (
                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
                    <div className="space-y-2">
                      {fareRows(fareDetails.flight).map((fare, idx) => {
                        const isOpen = expandedFareRule === fare.tier || (expandedFareRule === null && idx === 0);
                        const refund = refundStatus(fareDetails.flight.refundable, fare.cancellation || fare.refund);
                        const isNonRefundable = refund === "non_refundable";
                        const defaultCancellation = isNonRefundable
                          ? "Non-refundable as per airline policy."
                          : refund === "refundable" ? "Refundable subject to airline fare conditions and cancellation penalties." : `${FARE_RULES_FALLBACK}.`;
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
                                {refund && (
                                <span className={cn(
                                  "rounded-lg px-2.5 py-1 text-xs font-semibold",
                                  isNonRefundable ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                                )}>
                                  {isNonRefundable ? "Non-Refundable" : "Refundable"}
                                </span>
                                )}
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

                {shownDetailsTab === "baggage" && (
                  // #123: every fare's baggage (hand carry and checked), not only the fare shown first; a round trip
                  // shows each flight's own allowance.
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" role="table" aria-label="Baggage by fare">
                    <div role="row" className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      <span role="columnheader">Fare</span>
                      <span role="columnheader">Hand carry</span>
                      <span role="columnheader">Checked baggage</span>
                    </div>
                    {fareRows(fareDetails.flight).flatMap((fare, fareIndex) => {
                      const legs = fare.legBags?.length
                        ? fare.legBags.map((leg) => ({ label: leg.label, baggage: baggageText(leg.bags, leg.bagsDetail) }))
                        : [{ label: "", baggage: fareBaggage(fare, fareDetails.flight) }];
                      return legs.map((leg, legIndex) => (
                        <div
                          key={`${fare.tier}-${fareIndex}-${legIndex}`}
                          role="row"
                          aria-label={leg.label ? `${fare.tier}, ${leg.label}` : fare.tier}
                          className={cn("grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] items-start gap-3 px-4 py-3 text-sm", legIndex === 0 && fareIndex > 0 && "border-t")}
                        >
                          <div role="cell" className="min-w-0">
                            {legIndex === 0 && <p className="truncate font-bold text-slate-950" title={fare.tier}>{fare.tier}</p>}
                            {leg.label && <p className="text-xs font-bold uppercase tracking-wide text-primary">{leg.label}</p>}
                            <p className="mt-0.5 text-xs text-muted-foreground">{leg.baggage.detail}</p>
                          </div>
                          <p role="cell" className="min-w-0 break-words font-semibold text-slate-900">{handCarryText(leg.baggage)}</p>
                          <p role="cell" className="min-w-0 break-words font-semibold text-slate-900">{checkedText(leg.baggage)}</p>
                        </div>
                      ));
                    })}
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
                <InfoBox title="Baggage" value={underBaggageLabel(fareBaggage(fareRows(detailsFlight)[0], detailsFlight).detail)} />
                <InfoBox title="Meal" value={mealText(detailsFlight.meal)} />
                <InfoBox title="Fare" value={formatFare(detailsFlight.price, detailsFlight.currency)} />
              </div>
              <div className="rounded-2xl border p-4">
                <p className="font-semibold text-foreground">Rules and conditions</p>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  {fareRows(detailsFlight).length ? fareRows(detailsFlight).map((fare) => (
                    <p key={fare.tier}>
                      <span className="font-semibold text-foreground">{fare.tier}:</span> Refund: {fare.refund || "On request"} · Change: {fare.change || "On request"} · Baggage: {underBaggageLabel(fareBaggage(fare, detailsFlight).short)}
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
