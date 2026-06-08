import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plane, Search, Wifi, Coffee, ArrowLeftRight, Shield, Luggage, CalendarIcon, Pencil, Calculator, Clock, FileText, TimerReset } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { SEO } from "@/components/SEO";
import { TravelersClassPicker, formatTravelers, type TravelersValue } from "@/components/public/TravelersClassPicker";
import { searchFlights, type TravelianFlight } from "@/lib/travelian-api";
import { AirportCombobox } from "@/components/public/AirportCombobox";
import { FlightSearchLoader } from "@/components/public/FlightSearchLoader";
import { CURRENCIES, useLocale, type CurrencyCode } from "@/contexts/LocaleContext";
import { AirlineLogo } from "@/components/public/AirlineLogo";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { formatDateOnly, parseDateOnly } from "@/lib/date-only";

type FlightTripType = "oneway" | "roundtrip" | "multicity";
type FlightSegment = { from: string; to: string; date: Date | undefined };

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

export default function PublicFlightsPage({ bookingPath = "/booking", adminMode = false }: { bookingPath?: string; adminMode?: boolean } = {}) {
  const { currency: selectedCurrency, setCurrency } = useLocale();
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
  const [priceRange, setPriceRange] = useState([0, 700]);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [sort, setSort] = useState("best");
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
  const [fareCalculatorOpen, setFareCalculatorOpen] = useState(false);
  const [addToQuotations, setAddToQuotations] = useState(false);
  const [detailsFlight, setDetailsFlight] = useState<TravelianFlight | null>(null);
  const [calculatorBase, setCalculatorBase] = useState("");
  const [calculatorTaxes, setCalculatorTaxes] = useState("");
  const [calculatorServiceFee, setCalculatorServiceFee] = useState("");
  const [searchRefreshKey, setSearchRefreshKey] = useState(0);

  // Modal-local edit state
  const [editFrom, setEditFrom] = useState(from);
  const [editTo, setEditTo] = useState(to);
  const [editDate, setEditDate] = useState<Date | undefined>(departDate);
  const [editReturnDate, setEditReturnDate] = useState<Date | undefined>(returnDate);
  const [editTripType, setEditTripType] = useState<FlightTripType>(tripType);
  const [editSegments, setEditSegments] = useState<FlightSegment[]>(segments);
  const [editTravelers, setEditTravelers] = useState<TravelersValue>(travelers);
  const [editCurrency, setEditCurrency] = useState<CurrencyCode>(currency);

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
    setEditCurrency(currency);
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
    setSearchCurrency(editCurrency);
    setCurrency(editCurrency);
    setSelectedAirlines([]);
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
      currency: editCurrency,
    }), { replace: true });
    setModifyOpen(false);
  };

  const swapEdit = () => {
    setEditFrom(editTo);
    setEditTo(editFrom);
  };

  const toggleAirline = (a: string) => setSelectedAirlines(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  useEffect(() => {
    const controller = new AbortController();
    setApiStatus("loading");
    setApiMessage("Searching live providers...");

    searchFlights({
      from,
      to,
      tripType,
      departureDate: formatDateOnly(departDate),
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
    }, controller.signal)
      .then(result => {
        setApiFlights(result.flights);
        const liveMaxPrice = Math.max(700, ...result.flights.map(f => f.price));
        setPriceRange([0, Math.ceil(liveMaxPrice / 1000) * 1000]);
        setApiStatus("success");
        setApiMessage(result.flights.length ? "" : "No live bookable fares returned for this search.");
        setExpirySeconds(result.flights.length ? 900 : 0);
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        setApiFlights([]);
        setPriceRange([0, 700]);
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

  const flights = apiFlights;
  const maxPrice = Math.max(700, ...flights.map(f => f.price));

  let filtered = flights.filter(f => {
    if (search && !f.origin.toLowerCase().includes(search.toLowerCase()) && !f.destination.toLowerCase().includes(search.toLowerCase()) && !f.airline.toLowerCase().includes(search.toLowerCase())) return false;
    if (f.price < priceRange[0] || f.price > priceRange[1]) return false;
    if (selectedAirlines.length > 0 && !selectedAirlines.includes(f.airline)) return false;
    return true;
  });

  const durationMs = (flight: TravelianFlight) => new Date(flight.arrivalTime).getTime() - new Date(flight.departureTime).getTime();
  if (sort === "price-asc") filtered.sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") filtered.sort((a, b) => b.price - a.price);
  else if (sort === "fastest") filtered.sort((a, b) => {
    const aDuration = durationMs(a);
    const bDuration = durationMs(b);
    if (!Number.isFinite(aDuration)) return 1;
    if (!Number.isFinite(bDuration)) return -1;
    return aDuration - bDuration;
  });

  const getDuration = (dep: string, arr: string) => {
    const ms = new Date(arr).getTime() - new Date(dep).getTime();
    if (!Number.isFinite(ms) || ms < 0) return "Duration TBA";
    return `${Math.floor(ms / 3600000)}h ${Math.round((ms % 3600000) / 60000)}m`;
  };

  const formatFare = (price: number, currency = "PKR") => {
    return `${currency || "PKR"} ${Math.round(price).toLocaleString()}`;
  };

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
    return `https://wa.me/923244440014?text=${encodeURIComponent(message)}`;
  };

  const bookingHref = (flight: TravelianFlight, fare?: { tier: string; price: { base?: number | null; taxes?: number | null; total: number; currency?: string }; amenities?: string[] }) => {
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
    const fDur = new Date(f.arrivalTime).getTime() - new Date(f.departureTime).getTime();
    const fastDur = new Date(fast.arrivalTime).getTime() - new Date(fast.departureTime).getTime();
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

  const airlineOptions = useMemo(() => Array.from(new Set(flights.map(f => f.airline).filter(Boolean))).sort(), [flights]);
  const activeFilterLabels = [
    ...selectedAirlines.map((airline) => ({ key: `airline-${airline}`, label: airline, onRemove: () => toggleAirline(airline) })),
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
  const revalidateSearch = () => {
    setSelectedFlight(null);
    setSearchRefreshKey((value) => value + 1);
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
      <section className={cn("gradient-hero z-30 shadow-md", adminMode ? "py-2" : "py-4")}>
        <div className={cn(adminMode ? "px-4 md:px-6" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8")}>
          <div className="bg-card/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-primary-foreground/10">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-primary-foreground text-sm flex-wrap min-w-0">
                <Plane className="h-4 w-4 shrink-0" />
                <span className="font-semibold truncate">{from}</span>
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
                  className="h-6 w-6 rounded-full border border-primary-foreground/30 flex items-center justify-center text-primary-foreground/80 hover:bg-primary-foreground/15 hover:text-primary-foreground transition-colors shrink-0"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                </button>
                <span className="font-semibold truncate">{to}</span>
                <span className="text-primary-foreground/60 text-xs">-</span>
                <span className="text-primary-foreground/80 text-xs whitespace-nowrap">{format(departDate, "EEE, MMM d")}</span>
                {tripType === "roundtrip" && returnDate && <span className="text-primary-foreground/80 text-xs whitespace-nowrap">to {format(returnDate, "EEE, MMM d")}</span>}
                {tripType === "multicity" && <span className="text-primary-foreground/80 text-xs whitespace-nowrap">{segments.length} flights</span>}
                <span className="text-primary-foreground/60 text-xs">-</span>
                <span className="text-primary-foreground/80 text-xs whitespace-nowrap">{formatTravelers(travelers)}</span>
                <span className="text-primary-foreground/60 text-xs">-</span>
                <span className="text-primary-foreground/80 text-xs whitespace-nowrap">{currency}</span>
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
        <div className={cn(adminMode ? "px-4 md:px-6" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8")}>
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
                  {formatDateOnly(day.date) === formatDateOnly(departDate) && bestFlight ? formatFare(bestFlight.price, bestFlight.currency) : "-"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={cn(adminMode ? "px-4 md:px-6 py-5" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6")}>
        <nav className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <span>Flights</span>
          <span>/</span>
          <span className="text-foreground">{from} to {to}</span>
        </nav>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {apiStatus === "loading" ? "Searching live fares" : `${filtered.length} live ${filtered.length === 1 ? "fare" : "fares"}`}
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
        </div>

        {searchExpired && (
          <Card className="mb-4 border-amber-200 bg-amber-50 shadow-sm">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <TimerReset className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <p className="font-semibold text-amber-950">These fares need revalidation</p>
                  <p className="text-sm text-amber-800">Airline prices and seats can change quickly. Search again before booking or issuing a ticket.</p>
                </div>
              </div>
              <Button className="rounded-xl" onClick={revalidateSearch}>Search Again</Button>
            </CardContent>
          </Card>
        )}

        {(activeFilterLabels.length > 0 || hasFilterChanges) && (
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
            <Button variant="ghost" size="sm" className="h-7 rounded-full text-xs" onClick={() => { setSelectedAirlines([]); setPriceRange([0, Math.max(700, Math.ceil(maxPrice / 1000) * 1000)]); setSearch(""); }}>
              Clear all
            </Button>
          </div>
        )}

        {/* Sort Tags */}
        <div className="flex items-center gap-3 mb-6 overflow-x-auto scrollbar-hide">
          {[
            { id: "best", label: "Best", sub: bestFlight ? formatFare(bestFlight.price, bestFlight.currency) : "" },
            { id: "price-asc", label: "Cheapest", sub: bestFlight ? formatFare(bestFlight.price, bestFlight.currency) : "" },
            { id: "fastest", label: "Fastest", sub: fastestFlight ? getDuration(fastestFlight.departureTime, fastestFlight.arrivalTime) : "" },
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
        </div>

        {apiStatus === "error" && (
          <div className="mb-5 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-warning">
            <span>{apiMessage}</span>
          </div>
        )}

        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <aside className="hidden md:block w-56 xl:w-64 shrink-0 space-y-5 sticky top-24 self-start">
            <Card className="shadow-card border-0">
              <CardContent className="p-5">
                <h3 className="font-semibold text-foreground text-sm mb-4">Price Range</h3>
                <Slider value={priceRange} onValueChange={setPriceRange} min={0} max={Math.max(700, Math.ceil(maxPrice / 1000) * 1000)} step={100} className="mb-3" />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <input value={priceRange[0]} onChange={(event) => setPriceRange([Number(event.target.value) || 0, priceRange[1]])} className="h-8 rounded-lg border bg-background px-2" aria-label="Minimum price" />
                  <input value={priceRange[1]} onChange={(event) => setPriceRange([priceRange[0], Number(event.target.value) || priceRange[1]])} className="h-8 rounded-lg border bg-background px-2" aria-label="Maximum price" />
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card border-0">
              <CardContent className="p-5">
                <h3 className="font-semibold text-foreground text-sm mb-3">Airlines</h3>
                <div className="space-y-2.5">
                  {airlineOptions.length === 0 && (
                    <p className="text-xs text-muted-foreground">Airlines appear here after live fares are returned.</p>
                  )}
                  {airlineOptions.map(a => (
                    <label key={a} className="flex items-center gap-2 cursor-pointer group">
                      <Checkbox checked={selectedAirlines.includes(a)} onCheckedChange={() => toggleAirline(a)} />
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{a}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card border-0">
              <CardContent className="p-5">
                <h3 className="font-semibold text-foreground text-sm mb-3">Stops</h3>
                <div className="space-y-2.5">
                  {["Non-stop", "1 Stop", "2+ Stops"].map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox /><span className="text-xs text-muted-foreground">{s}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card border-0">
              <CardContent className="p-5">
                <h3 className="font-semibold text-foreground text-sm mb-3">Departure Time</h3>
                <div className="space-y-2.5">
                  {["Early Morning (00-06)", "Morning (06-12)", "Afternoon (12-18)", "Evening (18-24)"].map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox /><span className="text-xs text-muted-foreground">{s}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Results */}
          <div className="flex-1 space-y-4">
            {apiStatus === "loading" && <FlightSearchLoader from={from} to={to} />}

            {apiStatus !== "loading" && filtered.map((flight, idx) => {
              const isBest = bestFlight?.flightId === flight.flightId;
              const isCheapest = sort === "price-asc" && idx === 0;
              const isFastest = fastestFlight?.flightId === flight.flightId;
              const hasFareOptions = (flight.fareOptions || []).length > 0;
              const fareOptionsOpen = selectedFlight === flight.flightId;

              return (
                <Card
                  key={flight.flightId}
                  className={`overflow-hidden transition-all duration-300 border-0 shadow-card hover:shadow-hover ${hasFareOptions ? "cursor-pointer" : ""} ${
                    fareOptionsOpen ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => hasFareOptions && setSelectedFlight((current) => current === flight.flightId ? null : flight.flightId)}
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <AirlineLogo airline={flight.airline} flightNumber={flight.flightNumber} imageUrl={flight.airlineImage} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-sm font-semibold text-foreground">{flight.airline}</p>
                            <Badge variant="secondary" className="text-[10px] rounded-md">{flight.flightNumber}</Badge>
                            <Badge variant="outline" className="text-[10px] capitalize rounded-md">{flight.class}</Badge>
                            {isBest && <Badge className="bg-gold text-gold-foreground border-0 text-[10px] rounded-md">Best</Badge>}
                            {isCheapest && <Badge className="bg-success/10 text-success border-0 text-[10px] rounded-md">Cheapest</Badge>}
                            {isFastest && <Badge className="bg-info/10 text-info border-0 text-[10px] rounded-md">Fastest</Badge>}
                            {flight.status === 'delayed' && <Badge className="bg-warning/10 text-warning border-0 text-[10px] rounded-md">Delayed</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-3">
                            <div className="text-center">
                              <p className="text-xl font-bold text-foreground">{flight.departureTime.split(' ')[1] || "TBA"}</p>
                              <p className="text-xs text-muted-foreground">{flight.origin}</p>
                            </div>
                            <div className="flex-1 flex flex-col items-center px-2">
                              <span className="text-[10px] text-muted-foreground font-medium">{flight.duration || getDuration(flight.departureTime, flight.arrivalTime)}</span>
                              <div className="w-full h-px bg-border my-1.5 relative">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border-2 border-primary bg-card" />
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-primary" />
                              </div>
                              <span className="text-[10px] text-success font-medium">{flight.stops ? `${flight.stops} stop${flight.stops === 1 ? "" : "s"}` : "Non-stop"}</span>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold text-foreground">{flight.arrivalTime.split(' ')[1] || "TBA"}</p>
                              <p className="text-xs text-muted-foreground">{flight.destination}</p>
                            </div>
                          </div>
                          {tripType === "roundtrip" && flight.returnDepartureTime && flight.returnArrivalTime && (
                            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
                              <Badge variant="outline" className="rounded-md text-[10px]">Return</Badge>
                              <span className="font-medium text-foreground">{flight.destination} to {flight.origin}</span>
                              <span>{flight.returnDepartureTime}</span>
                              <span>to</span>
                              <span>{flight.returnArrivalTime}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 md:border-l md:pl-5">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-foreground">{formatFare(flight.price, flight.currency)}</p>
                          <p className="text-[10px] text-muted-foreground">per person, incl. tax</p>
                          <div className="mt-2 space-y-1 text-[10px] text-muted-foreground">
                            <p className="flex items-center justify-end gap-1"><Luggage className="h-3 w-3" /> {flight.baggage || "Baggage info not available"}</p>
                            <p className="flex items-center justify-end gap-1"><Coffee className="h-3 w-3" /> {flight.meal || "Meal info not available"}</p>
                            <p className="flex items-center justify-end gap-1"><Wifi className="h-3 w-3" /> Amenities subject to airline</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
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
                          <a href={flightWhatsAppHref(flight)} target="_blank" rel="noreferrer">
                            <Button variant="outline" size="sm" className="w-full rounded-xl gap-2">
                              <WhatsAppIcon className="h-4 w-4" /> WhatsApp Help
                            </Button>
                          </a>
                        </div>
                      </div>
                    </div>

                    {hasFareOptions && fareOptionsOpen && (
                      <div className="mt-5 border-t pt-4 animate-fade-in">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground">Fare options</p>
                          <p className="text-xs text-muted-foreground">Choose the fare rule that fits this passenger.</p>
                        </div>
                        <div className="overflow-hidden rounded-xl border">
                          {(flight.fareOptions || []).map((fare) => (
                            <div key={fare.tier} className="grid gap-3 border-b bg-card p-3 text-sm last:border-b-0 md:grid-cols-[1.1fr_1fr_1fr_1fr_auto] md:items-center">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground">{fare.tier}</span>
                                {fare.popular && <Badge className="bg-gold text-gold-foreground border-0 text-[10px]">Popular</Badge>}
                              </div>
                              <span className="flex items-center gap-1.5 text-muted-foreground"><Luggage className="h-3.5 w-3.5 text-primary" /> {fare.bags || flight.baggage || "Baggage TBA"}</span>
                              <span className="flex items-center gap-1.5 text-muted-foreground"><Coffee className="h-3.5 w-3.5 text-primary" /> {flight.meal || "Meal info not available"}</span>
                              <span className="text-muted-foreground">{fare.refund || "Refund rule on request"}</span>
                              <div className="flex items-center justify-between gap-3 md:justify-end">
                                <span className="whitespace-nowrap text-base font-black text-foreground">{formatFare(fare.price.total, fare.price.currency || flight.currency)}</span>
                                {searchExpired ? (
                                  <Button size="sm" className="rounded-lg" onClick={revalidateSearch}>Revalidate</Button>
                                ) : (
                                  <Link to={bookingHref(flight, fare)}>
                                    <Button size="sm" className="rounded-lg">Book Fare</Button>
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
                  <Button variant="outline" className="rounded-lg" onClick={() => { setSelectedAirlines([]); setPriceRange([0, Math.max(700, Math.ceil(maxPrice / 1000) * 1000)]); setSearch(""); }}>
                    Clear All Filters
                  </Button>
                  <a href={`https://wa.me/923244440014?text=${encodeURIComponent(`Hello Travelian,\n\nPlease check live fares for ${from} to ${to} on ${format(departDate, "MMM dd, yyyy")}.\n\nTravelers: ${formatTravelers(travelers)}\nCurrency: ${currency}`)}`} target="_blank" rel="noreferrer">
                    <Button className="rounded-lg gap-2"><WhatsAppIcon className="h-4 w-4" /> Ask Travelian</Button>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modify Search Dialog */}
      <Dialog open={modifyOpen} onOpenChange={setModifyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modify Search</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                    <AirportCombobox value={segment.from} onChange={(value) => setEditSegments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, from: value } : item))} placeholder="From airport" />
                    <AirportCombobox value={segment.to} onChange={(value) => setEditSegments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, to: value } : item))} placeholder="To airport" />
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="flex h-11 items-center gap-2 rounded-xl border border-input bg-background px-3 text-left text-sm">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          {segment.date ? format(segment.date, "MMM dd, yyyy") : "Select date"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[300]" align="start">
                        <Calendar mode="single" selected={segment.date} onSelect={(date) => setEditSegments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, date } : item))} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <Button type="button" variant="outline" size="sm" disabled={editSegments.length <= 2} onClick={() => setEditSegments((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setEditSegments((current) => [...current, { from: "", to: "", date: undefined }])}>Add flight</Button>
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">From</label>
                <AirportCombobox value={editFrom} onChange={setEditFrom} className="h-11" placeholder="From airport" />
              </div>
              <div className="hidden sm:flex items-center justify-center pb-1">
                <button type="button" onClick={swapEdit} aria-label="Swap origin and destination" className="h-9 w-9 rounded-full border-2 border-primary/30 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                  <ArrowLeftRight className="h-4 w-4" />
                </button>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">To</label>
                <AirportCombobox value={editTo} onChange={setEditTo} className="h-11" placeholder="To airport" />
              </div>
            </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Departure Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="flex items-center gap-2 h-11 w-full bg-background border border-input rounded-xl px-3 text-sm text-left">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    {editDate ? format(editDate, "MMM dd, yyyy") : "Select date"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[300]" align="start" side="bottom" sideOffset={8} avoidCollisions={false}>
                  <Calendar mode="single" selected={editDate} onSelect={setEditDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            {editTripType === "roundtrip" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Return Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="flex items-center gap-2 h-11 w-full bg-background border border-input rounded-xl px-3 text-sm text-left">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      {editReturnDate ? format(editReturnDate, "MMM dd, yyyy") : "Select return date"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[300]" align="start" side="bottom" sideOffset={8} avoidCollisions={false}>
                    <Calendar mode="single" selected={editReturnDate} onSelect={setEditReturnDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Travelers & Class</label>
              <TravelersClassPicker value={editTravelers} onChange={setEditTravelers} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Currency</label>
              <select
                value={editCurrency}
                onChange={(event) => setEditCurrency(event.target.value as CurrencyCode)}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                {CURRENCIES.map(option => (
                  <option key={option.code} value={option.code}>{option.code} - {option.label}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
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

      <Dialog open={!!detailsFlight} onOpenChange={(open) => !open && setDetailsFlight(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Flight Details & Fare Rules</DialogTitle>
          </DialogHeader>
          {detailsFlight && (
            <div className="space-y-5 py-2">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/40 p-4">
                <div>
                  <p className="text-lg font-bold text-foreground">{detailsFlight.airline}</p>
                  <p className="text-sm text-muted-foreground">{detailsFlight.flightNumber} · {detailsFlight.origin} to {detailsFlight.destination}</p>
                </div>
                <Badge className="rounded-full">{detailsFlight.stops ? `${detailsFlight.stops} stop${detailsFlight.stops === 1 ? "" : "s"}` : "Non-stop"}</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {(detailsFlight.segments?.length ? detailsFlight.segments : [{
                  carrier: detailsFlight.airline,
                  flightNumber: detailsFlight.flightNumber,
                  origin: detailsFlight.origin,
                  destination: detailsFlight.destination,
                  departureTime: detailsFlight.departureTime,
                  arrivalTime: detailsFlight.arrivalTime,
                  duration: detailsFlight.duration,
                }]).map((segment, index) => (
                  <div key={`${segment.flightNumber}-${index}`} className="rounded-2xl border p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">Segment {index + 1}</p>
                    <p className="mt-2 font-semibold text-foreground">{segment.flightNumber || detailsFlight.flightNumber}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{segment.origin} to {segment.destination}</p>
                    <p className="mt-3 text-sm">{segment.departureTime || "Departure TBA"} to {segment.arrivalTime || "Arrival TBA"}</p>
                    {segment.duration && <p className="mt-1 text-xs text-muted-foreground">Duration: {segment.duration}</p>}
                  </div>
                ))}
              </div>
              {detailsFlight.layovers?.length ? (
                <div className="rounded-2xl border p-4">
                  <p className="font-semibold text-foreground">Layovers</p>
                  <div className="mt-3 space-y-2">
                    {detailsFlight.layovers.map((layover, index) => (
                      <p key={`${layover.location || "layover"}-${index}`} className="text-sm text-muted-foreground">
                        {layover.location || "Connection"}: arrives {layover.arrivalTime || "TBA"}, flies again {layover.departureTime || "TBA"} · Layover {layover.duration || "TBA"}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="grid gap-3 md:grid-cols-3">
                <InfoBox title="Baggage" value={detailsFlight.baggage || "Baggage info not available"} />
                <InfoBox title="Meal" value={detailsFlight.meal || "Meal info not available"} />
                <InfoBox title="Fare" value={formatFare(detailsFlight.price, detailsFlight.currency)} />
              </div>
              <div className="rounded-2xl border p-4">
                <p className="font-semibold text-foreground">Rules and conditions</p>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  {(detailsFlight.fareOptions || []).length ? detailsFlight.fareOptions?.map((fare) => (
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
