import { UmrahSearchBar } from "./umrah/UmrahSearchBar";
import { DEFAULT_UMRAH_SEARCH, serializeUmrahSearch } from "@/lib/umrah-search";
import { umrahOffers } from "@/data/services/umrah";
import { ProductTabs } from "./ProductTabs";
import { SearchCard, SearchContent } from "./SearchPageShell";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Search, ArrowLeftRight, Plus, CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { TravelersClassPicker, type TravelersValue } from "@/components/public/TravelersClassPicker";
import { AirportCombobox } from "@/components/public/AirportCombobox";
import { useLocale } from "@/contexts/LocaleContext";
import { formatDateOnly } from "@/lib/date-only";
import { buildGroupTicketSearchParams } from "@/lib/group-ticketing";
import { GroupTicketingSearchBar } from "@/components/public/GroupTicketingSearchBar";
import { HotelSearchBar, type HotelSearchValues } from "@/components/public/HotelSearchBar";



const tripTypes = [
  { id: "oneway", label: "One-way" },
  { id: "roundtrip", label: "Round-trip" },
  { id: "multicity", label: "Multi-city" },
];



interface MultiCitySegment {
  from: string;
  to: string;
  date: Date | undefined;
}

function DatePickerField({ id, date, onSelect, placeholder }: { id?: string; date: Date | undefined; onSelect: (d: Date | undefined) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const [isMobileCalendar, setIsMobileCalendar] = useState(false);
  const today = startOfDay(new Date());
  const selectDate = (nextDate: Date | undefined) => {
    onSelect(nextDate);
    if (nextDate) setOpen(false);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsMobileCalendar(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const calendar = (
    <Calendar
      mode="single"
      selected={date}
      onSelect={selectDate}
      disabled={(day) => startOfDay(day) < today}
      initialFocus
      className="p-3 pointer-events-auto"
    />
  );

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button id={id} type="button" className={cn(
            "flex items-center gap-2 w-full h-12 bg-muted/30 border border-muted rounded-xl px-3 text-sm text-left transition-colors hover:border-primary/30",
            !date && "text-muted-foreground"
          )}>
            <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="min-w-0 truncate sm:hidden">{date ? format(date, "dd MMM yy") : placeholder}</span>
            <span className="hidden min-w-0 truncate sm:block">{date ? format(date, "MMM dd, yyyy") : placeholder}</span>
          </button>
        </PopoverTrigger>
        {!isMobileCalendar && (
          <PopoverContent
            className="z-[1120] max-h-[min(var(--radix-popover-content-available-height),24rem)] w-[var(--radix-popover-trigger-width)] min-w-[18rem] max-w-[calc(100vw-2rem)] overflow-hidden p-0"
            align="start"
            side="bottom"
            sideOffset={8}
            avoidCollisions
            collisionPadding={16}
          >
            {calendar}
          </PopoverContent>
        )}
      </Popover>
      {open && isMobileCalendar && typeof document !== "undefined" && createPortal(
        <>
          <button
            type="button"
            className="fixed inset-0 z-[1110] bg-slate-950/35"
            aria-label="Close date picker"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-3 bottom-3 z-[1120] max-h-[85vh] overflow-y-auto rounded-2xl border bg-popover p-0 text-popover-foreground shadow-elevated">
            {calendar}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

type SearchTabsProps = {
  initialTab?: string;
  showProductNavigation?: boolean;
  flightResultsPath?: string;
  groupInitialValues?: Parameters<typeof GroupTicketingSearchBar>[0]["initialValues"];
  onGroupSearch?: Parameters<typeof GroupTicketingSearchBar>[0]["onSearch"];
};



export function SearchTabs({
  initialTab = "flights",
  showProductNavigation = true,
  flightResultsPath = "/flights-search",
  groupInitialValues,
  onGroupSearch,
}: SearchTabsProps = {}) {
  const fieldId = useId();
  const { currency } = useLocale();
  const activeTab = initialTab;
  const [tripType, setTripType] = useState("oneway"); // default One-way
  const [travelers, setTravelers] = useState<TravelersValue>({ adults: 1, children: 0, infants: 0, cabin: "Economy" });
  const [departDate, setDepartDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [hotelValues, setHotelValues] = useState<HotelSearchValues>(() => ({
    location: "",
    checkIn: formatDateOnly(addDays(new Date(), 7)),
    checkOut: formatDateOnly(addDays(new Date(), 10)),
    adults: 2,
    children: 0,
    rooms: 1,
  }));
  const [umrahValues, setUmrahValues] = useState(DEFAULT_UMRAH_SEARCH);
  const [fromValue, setFromValue] = useState("");
  const [toValue, setToValue] = useState("");
  const [errors, setErrors] = useState<{ from?: string; to?: string; depart?: string; return?: string }>({});
  const [multiCitySegments, setMultiCitySegments] = useState<MultiCitySegment[]>([
    { from: "", to: "", date: undefined },
    { from: "", to: "", date: undefined },
  ]);
  const navigate = useNavigate();

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const validateFlights = (): boolean => {
    const next: typeof errors = {};
    if (!/^[A-Z]{3}$/.test(fromValue)) next.from = "Select a valid origin airport";
    if (!/^[A-Z]{3}$/.test(toValue)) next.to = "Select a valid destination airport";
    if (fromValue && toValue && fromValue === toValue) {
      next.to = "Destination must differ from origin";
    }
    if (!departDate) next.depart = "Departure date is required";
    else if (departDate < today) next.depart = "Departure cannot be in the past";
    if (tripType === "roundtrip") {
      if (!returnDate) next.return = "Return date is required";
      else if (departDate && returnDate < departDate) next.return = "Return must be after departure";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const flightsValid =
    /^[A-Z]{3}$/.test(fromValue) &&
    /^[A-Z]{3}$/.test(toValue) &&
    fromValue !== toValue &&
    !!departDate && departDate >= today &&
    (tripType !== "roundtrip" || (!!returnDate && !!departDate && returnDate >= departDate));

  const handleSearch = () => {
    if (activeTab === "flights") {
      if (tripType === "multicity") {
        const validSegments = multiCitySegments.every((segment) =>
          /^[A-Z]{3}$/.test(segment.from) &&
          /^[A-Z]{3}$/.test(segment.to) &&
          segment.from !== segment.to &&
          !!segment.date &&
          segment.date >= today
        );
        if (!validSegments) {
          setErrors({ depart: "Complete each multi-city flight with different airports and a valid date" });
          return;
        }
        const segments = multiCitySegments.map((segment) => ({
          from: segment.from,
          to: segment.to,
          date: formatDateOnly(segment.date!),
        }));
        const first = segments[0];
        const params = new URLSearchParams({
          from: first.from,
          to: first.to,
          depart: first.date,
          segments: JSON.stringify(segments),
          adults: String(travelers.adults),
          children: String(travelers.children),
          infants: String(travelers.infants),
          cabin: travelers.cabin,
          trip: tripType,
          currency,
        });
        navigate(`${flightResultsPath}?${params.toString()}`);
        return;
      }
      if (!validateFlights()) return;
      const params = new URLSearchParams({
        from: fromValue, to: toValue,
        depart: departDate ? formatDateOnly(departDate) : "",
        ...(tripType === "roundtrip" && returnDate ? { return: formatDateOnly(returnDate) } : {}),
        adults: String(travelers.adults), children: String(travelers.children), infants: String(travelers.infants),
        cabin: travelers.cabin, trip: tripType, currency,
      });
      navigate(`${flightResultsPath}?${params.toString()}`);
      return;
    }
    if (activeTab === "hotels") {
      const params = new URLSearchParams({
        location: hotelValues.location,
        checkIn: hotelValues.checkIn,
        checkOut: hotelValues.checkOut,
        adults: String(hotelValues.adults),
        children: String(hotelValues.children),
        rooms: String(hotelValues.rooms),
        currency,
      });
      navigate(`/hotels-search?${params.toString()}`);
      return;
    }
    else navigate("/");
  };

  const addMultiCitySegment = () => {
    if (multiCitySegments.length < 6) {
      setMultiCitySegments([...multiCitySegments, { from: "", to: "", date: undefined }]);
    }
  };

  const updateSegment = (index: number, field: keyof MultiCitySegment, value: string | Date | undefined) => {
    const updated = [...multiCitySegments];
    (updated[index] as any)[field] = value;
    setMultiCitySegments(updated);
  };

  const removeSegment = (index: number) => {
    if (multiCitySegments.length > 2) {
      setMultiCitySegments(multiCitySegments.filter((_, i) => i !== index));
    }
  };

  return (
    <SearchCard>
      {showProductNavigation && <ProductTabs active={activeTab} />}

      <SearchContent stable={showProductNavigation}>
        {/* Flight-specific controls */}
        {activeTab === "flights" && (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center bg-muted/40 rounded-lg p-0.5">
                {tripTypes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTripType(t.id)}
                    className={`whitespace-nowrap px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      tripType === t.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5">
                <TravelersClassPicker value={travelers} onChange={setTravelers} variant="segmented" mode="travelers" className="w-auto" />
                <TravelersClassPicker value={travelers} onChange={setTravelers} variant="segmented" mode="cabin" className="w-auto" />
              </div>
            </div>

            {/* Multi-city layout */}
            {tripType === "multicity" ? (
              <div className="space-y-3">
                {multiCitySegments.map((seg, idx) => (
                  <div key={idx} className="unified-search-segment-grid grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
                    <div className="relative">
                      {idx === 0 && <label className="text-xs font-medium text-muted-foreground mb-1 block">From</label>}
                      <div className="relative">
                        <AirportCombobox value={String(seg.from || "")} onChange={code => updateSegment(idx, "from", code)} placeholder="From airport" />
                      </div>
                    </div>
                    <div className="relative">
                      {idx === 0 && <label className="text-xs font-medium text-muted-foreground mb-1 block">To</label>}
                      <div className="relative">
                        <AirportCombobox value={String(seg.to || "")} onChange={code => updateSegment(idx, "to", code)} placeholder="To airport" iconVariant="arrival" />
                      </div>
                    </div>
                    <div>
                      {idx === 0 && <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>}
                      <DatePickerField date={seg.date} onSelect={d => updateSegment(idx, "date", d)} placeholder="Select date" />
                    </div>
                    <div className="flex items-center h-12">
                      {multiCitySegments.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeSegment(idx)}
                          className="h-9 w-9 rounded-full border border-destructive/30 text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                          aria-label="Remove segment"
                        ><X className="h-4 w-4" /></button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 pt-1">
                  {errors.depart && <p className="text-xs text-destructive">{errors.depart}</p>}
                  <button
                    type="button"
                    onClick={addMultiCitySegment}
                    className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Add Flight
                  </button>
                  <Button onClick={handleSearch} className="unified-search-submit h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl">
                    <Search className="h-4 w-4 mr-2" /> Search Flights
                  </Button>
                </div>
              </div>
            ) : tripType === "oneway" ? (
              /* One-way: From | swap | To | Date | Search (compact, balanced) */
              <div>
                <div className="unified-search-flight-grid grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_1fr_auto] gap-3 items-end">
                  <div className="relative">
                    <label htmlFor={`${fieldId}-from`} className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
                    <AirportCombobox id={`${fieldId}-from`} value={fromValue} onChange={code => { setFromValue(code); if (errors.from) setErrors(p => ({ ...p, from: undefined })); }} placeholder="From" invalid={!!errors.from} />
                  </div>
                  <div className="hidden md:flex items-center justify-center pb-1.5">
                    <button
                      type="button"
                      onClick={() => { const a = fromValue; setFromValue(toValue); setToValue(a); }}
                      aria-label="Swap origin and destination"
                      className="h-9 w-9 rounded-full border-2 border-primary/30 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="relative">
                    <label htmlFor={`${fieldId}-to`} className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
                    <AirportCombobox id={`${fieldId}-to`} value={toValue} onChange={code => { setToValue(code); if (errors.to) setErrors(p => ({ ...p, to: undefined })); }} placeholder="To" invalid={!!errors.to} iconVariant="arrival" />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor={`${fieldId}-depart`} className="mb-1 block text-xs font-medium text-muted-foreground">Departure Date</label>
                    <DatePickerField id={`${fieldId}-depart`} date={departDate} onSelect={(d) => { setDepartDate(d); if (errors.depart) setErrors(p => ({ ...p, depart: undefined })); }} placeholder="Departure date" />
                  </div>
                  <Button
                    onClick={handleSearch}
                    disabled={!flightsValid}
                    className="unified-search-submit h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl whitespace-nowrap disabled:opacity-50"
                  >
                    <Search className="h-4 w-4 mr-2" /> Search
                  </Button>
                </div>
                {(errors.from || errors.to || errors.depart) && (
                  <div className="unified-search-feedback mt-2 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_1fr_auto] gap-1 text-xs text-destructive">
                    <p>{errors.from || ""}</p><span className="hidden md:block" /><p>{errors.to || ""}</p><p>{errors.depart || ""}</p><span className="hidden md:block" />
                  </div>
                )}
              </div>
            ) : (
              /* Round-trip: adds return date */
              <div>
                <div className="unified-search-flight-grid grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_1fr_1fr_auto] gap-3 items-end">
                  <div className="relative">
                    <label htmlFor={`${fieldId}-from`} className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
                    <AirportCombobox id={`${fieldId}-from`} value={fromValue} onChange={code => { setFromValue(code); if (errors.from) setErrors(p => ({ ...p, from: undefined })); }} placeholder="From" invalid={!!errors.from} />
                  </div>
                  <div className="hidden md:flex items-center justify-center pb-1.5">
                    <button
                      type="button"
                      onClick={() => { const a = fromValue; setFromValue(toValue); setToValue(a); }}
                      aria-label="Swap origin and destination"
                      className="h-9 w-9 rounded-full border-2 border-primary/30 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="relative">
                    <label htmlFor={`${fieldId}-to`} className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
                    <AirportCombobox id={`${fieldId}-to`} value={toValue} onChange={code => { setToValue(code); if (errors.to) setErrors(p => ({ ...p, to: undefined })); }} placeholder="To" invalid={!!errors.to} iconVariant="arrival" />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor={`${fieldId}-depart`} className="mb-1 block text-xs font-medium text-muted-foreground">Departure Date</label>
                    <DatePickerField id={`${fieldId}-depart`} date={departDate} onSelect={(d) => { setDepartDate(d); if (errors.depart) setErrors(p => ({ ...p, depart: undefined })); }} placeholder="Departure date" />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor={`${fieldId}-return`} className="mb-1 block text-xs font-medium text-muted-foreground">Return Date</label>
                    <DatePickerField id={`${fieldId}-return`} date={returnDate} onSelect={(d) => { setReturnDate(d); if (errors.return) setErrors(p => ({ ...p, return: undefined })); }} placeholder="Return date" />
                  </div>
                  <Button
                    onClick={handleSearch}
                    disabled={!flightsValid}
                    aria-label="Search flights"
                    className="unified-search-submit h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl whitespace-nowrap disabled:opacity-50"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {(errors.from || errors.to || errors.depart || errors.return) && (
                  <p className="unified-search-feedback mt-2 text-xs text-destructive">
                    {[errors.from, errors.to, errors.depart, errors.return].filter(Boolean).join(" • ")}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === "hotels" && (
          <HotelSearchBar
            initialValues={hotelValues}
            loading={false}
            onSearch={(values) => {
              setHotelValues(values);
              const params = new URLSearchParams({
                location: values.location,
                checkIn: values.checkIn,
                checkOut: values.checkOut,
                adults: String(values.adults),
                children: String(values.children),
                rooms: String(values.rooms),
                currency,
              });
              navigate(`/hotels-search?${params.toString()}`);
            }}
          />
        )}




        {activeTab === "umrah" && <UmrahSearchBar offers={umrahOffers} value={umrahValues} onChange={setUmrahValues} onSearch={value => navigate(`/umrah-packages?${serializeUmrahSearch(value).toString()}`)} />}

        {activeTab === "group-ticketing" && (
          <GroupTicketingSearchBar
            initialValues={groupInitialValues}
            showLabels
            onSearch={(values) => {
              if (onGroupSearch) {
                onGroupSearch(values);
                return;
              }
              const params = buildGroupTicketSearchParams(values);
              const query = params.toString();
              navigate(query ? `/group-ticketing?${query}` : "/group-ticketing");
            }}
          />
        )}


      </SearchContent>
    </SearchCard>
  );
}
