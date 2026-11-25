import { MAX_MULTI_CITY_FLIGHTS } from "@/lib/flight-search-limits";
import { UmrahSearchBar } from "./umrah/UmrahSearchBar";
import { DEFAULT_UMRAH_SEARCH, serializeUmrahSearch } from "@/lib/umrah-search";
import { umrahOffers } from "@/data/services/umrah";
import { ProductTabs } from "./ProductTabs";
import { SearchCard, SearchContent } from "./SearchPageShell";
import { useEffect, useId, useState } from "react";
import { Search, ArrowLeftRight, Plus, CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CalendarPopup, CalendarPopupContent, CalendarPopupTrigger } from "@/components/ui/calendar-popup";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, addDays, parseISO } from "date-fns";
import { GroupFareCalendar } from "@/components/GroupFareCalendar";
import { useFlightFares } from "@/hooks/use-flight-fares";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useOpenSignal } from "@/hooks/use-open-signal";
import { TravelersClassPicker, type TravelersValue } from "@/components/public/TravelersClassPicker";
import { AirportCombobox } from "@/components/public/AirportCombobox";
import { useLocale } from "@/contexts/LocaleContext";
import { formatDateOnly } from "@/lib/date-only";
import { groupResultsPath } from "@/lib/group-ticketing";
import { GroupTicketingSearchBar } from "@/components/public/GroupTicketingSearchBar";
import { HotelSearchBar, type HotelSearchValues } from "@/components/public/HotelSearchBar";
import { keepReturnDate, returnDateError, RETURN_CLEARED_MESSAGE } from "@/lib/return-date";
import { firstLegError, legErrors, nextLeg, remainingLegErrors, updateLeg, type LegErrors } from "@/lib/multi-city";



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

/** fares: the date's fare calendar (#55), loaded by the form in the background once From and To are set.
 *  min / marked (Return, #151): days before `min` can't be picked, and `marked` (the departure) is outlined. */
function DatePickerField({ id, date, onSelect, placeholder, fares, openSignal, min, marked, invalid, describedBy }: {
  id?: string; date: Date | undefined; onSelect: (d: Date | undefined) => void; placeholder: string; fares?: ReturnType<typeof useFlightFares>;
  openSignal?: number; min?: Date; marked?: Date; invalid?: boolean; describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  // #192: phones show one month (two stacked months were too tall); wider screens keep two.
  const calendarMonths = useIsMobile() ? 1 : 2;
  // Phones: choosing the destination opens this calendar next (#148); round-trip: picking the departure opens the return (#151).
  useOpenSignal(openSignal, () => setOpen(true));
  const today = startOfDay(new Date());
  const floor = min && startOfDay(min) > today ? startOfDay(min) : today;
  const selectDate = (nextDate: Date | undefined) => {
    onSelect(nextDate);
    if (nextDate) setOpen(false);
  };


  const calendar = (
    <Calendar
      size="large"
      numberOfMonths={calendarMonths}
      mode="single"
      selected={date}
      onSelect={selectDate}
      disabled={(day) => startOfDay(day) < floor}
      defaultMonth={date ?? (min ? floor : undefined)}
      modifiers={marked ? { departure: marked } : undefined}
      modifiersClassNames={marked ? { departure: "ring-2 ring-inset ring-primary" } : undefined}
      initialFocus
      className="p-3 sm:p-5 pointer-events-auto"
    />
  );

  return (
    <>
      <CalendarPopup open={open} onOpenChange={setOpen}>
        <CalendarPopupTrigger asChild>
          <button id={id} type="button" aria-invalid={invalid || undefined} aria-describedby={describedBy} className={cn(
            "flex items-center gap-2 w-full h-12 bg-muted/30 border border-muted rounded-xl px-3 text-sm text-left transition-colors hover:border-primary/30",
            !date && "text-muted-foreground", invalid && "border-destructive"
          )}>
            <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="min-w-0 truncate sm:hidden">{date ? format(date, "EEE, dd MMM yy") : placeholder}</span>
            <span className="hidden min-w-0 truncate sm:block">{date ? format(date, "EEE, MMM dd, yyyy") : placeholder}</span>
          </button>
        </CalendarPopupTrigger>
        <CalendarPopupContent title={placeholder === "Select date" ? "Select flight date" : `Select ${placeholder.toLowerCase()}`}>
          {fares?.ready ? (
            <div className="w-[min(46rem,calc(100vw-2.5rem))] overflow-y-auto p-3 sm:p-5">
              <GroupFareCalendar days={fares.days} anyDate checking={fares.checking} selected={date ? format(date, "yyyy-MM-dd") : undefined}
                min={min ? format(min, "yyyy-MM-dd") : undefined} marked={marked ? format(marked, "yyyy-MM-dd") : undefined}
                status={fares.status === "loading" || fares.status === "error" ? fares.status : "ready"}
                onPick={(picked) => selectDate(parseISO(picked))} />
            </div>
          ) : calendar}
        </CalendarPopupContent>
      </CalendarPopup>

    </>
  );
}

/** Messages under the fields they belong to (one per grid column; null for a column without a field, e.g. swap).
 *  Phones show the first message only: every field to fix also has a red border (#151). */
function FieldFeedback({ columns, messages }: { columns: string; messages: (string | null | undefined)[] }) {
  const first = messages.find(Boolean);
  if (!first) return null;
  return (
    <div role="alert" className="unified-search-feedback mt-2 text-xs text-destructive">
      <p className="truncate md:hidden">{first}</p>
      <div className={cn("hidden gap-3 md:grid", columns)}>
        {messages.map((message, index) => <p key={index} className="min-w-0 truncate" title={message || undefined}>{message || ""}</p>)}
      </div>
    </div>
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
  // #160: each multi-city leg's messages, shown under its fields.
  const [legErrs, setLegErrs] = useState<LegErrors[]>([]);
  const navigate = useNavigate();
  // Phones (#148): choosing From opens To, choosing To opens the departure date. `key` names the field to open next.
  const [advance, setAdvance] = useState({ key: "", n: 0 });
  const advanceTo = (key: string) => setAdvance(current => ({ key, n: current.n + 1 }));
  const signal = (key: string) => (advance.key === key ? advance.n : 0);
  // #55: the Departure date's fares load in the background as soon as From and To are both set (kept here, in the
  // form, so switching One-way / Round-trip doesn't ask again for the same route).
  const departFares = useFlightFares(activeTab === "flights" && tripType !== "multicity",
    { from: fromValue, to: toValue, adults: travelers.adults, cabin: travelers.cabin.toLowerCase().replace(/\s+/g, "_") });

  // #151: the Return date uses the same fare calendar, for the way back (To → From) from the departure date on.
  const returnFares = useFlightFares(activeTab === "flights" && tripType === "roundtrip" && !!departDate,
    { from: toValue, to: fromValue, adults: travelers.adults, cabin: travelers.cabin.toLowerCase().replace(/\s+/g, "_"),
      start: departDate ? formatDateOnly(departDate) : undefined });

  const today = new Date(); today.setHours(0, 0, 0, 0);

  // #151: a new departure after the return clears the return (with a note at the field); in round-trip the return
  // calendar opens next.
  const pickDeparture = (d: Date | undefined) => {
    setDepartDate(d);
    const kept = keepReturnDate(d, returnDate);
    const cleared = Boolean(returnDate && !kept);
    if (cleared) setReturnDate(undefined);
    setErrors(p => ({ ...p, depart: undefined, return: cleared ? RETURN_CLEARED_MESSAGE : p.return }));
    if (d && tripType === "roundtrip") advanceTo("return");
  };

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
      const message = returnDateError(departDate, returnDate);
      if (message) next.return = message;
    }
    setErrors(next);
    // Search stays enabled (#151): the message is at the field, and the first field to fix takes the focus.
    const first = (["from", "to", "depart", "return"] as const).find(key => next[key]);
    if (first) document.getElementById(`${fieldId}-${first}`)?.focus();
    return !first;
  };

  const handleSearch = () => {
    if (activeTab === "flights") {
      if (tripType === "multicity") {
        // #160: a message under each field to fix, and the first one takes the focus.
        const found = legErrors(multiCitySegments, today);
        setLegErrs(found);
        const toFix = firstLegError(found);
        if (toFix) {
          document.getElementById(`${fieldId}-leg${toFix[0]}-${toFix[1]}`)?.focus();
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

  // #160: a new leg starts where the last one lands, on its date.
  const addMultiCitySegment = () => {
    setMultiCitySegments(current => current.length < MAX_MULTI_CITY_FLIGHTS ? [...current, nextLeg(current)] : current);
  };

  const updateSegment = (index: number, field: keyof MultiCitySegment, value: string | Date | undefined) => {
    const next = updateLeg(multiCitySegments, index, { [field]: value });
    setMultiCitySegments(next);
    setLegErrs(current => remainingLegErrors(current, next, today));
  };

  const removeSegment = (index: number) => {
    if (multiCitySegments.length > 2) {
      const next = multiCitySegments.filter((_, i) => i !== index);
      setMultiCitySegments(next);
      setLegErrs(current => remainingLegErrors(current.filter((_, i) => i !== index), next, today));
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
                    className={`whitespace-nowrap px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-medium rounded-md transition-all ${
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
              {/* 640–767px only, where this row has room for it; phones have the swap button between From and To (#148). */}
              {tripType !== "multicity" && (
                <button
                  type="button"
                  onClick={() => { const a = fromValue; setFromValue(toValue); setToValue(a); }}
                  aria-label="Swap origin and destination"
                  className="ml-auto hidden h-9 w-9 items-center justify-center rounded-lg border border-primary/25 bg-card text-primary transition-colors hover:bg-primary hover:text-primary-foreground sm:inline-flex md:hidden"
                >
                  <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Multi-city layout */}
            {tripType === "multicity" ? (
              <div className="space-y-3">
                {multiCitySegments.map((seg, idx) => {
                  const legId = `${fieldId}-leg${idx}`;
                  const legError = legErrs[idx] ?? {};
                  // Labels: every leg on phones; on wider screens only the first row (the others keep them for screen readers).
                  const labelClass = cn("mb-1 block text-xs font-medium text-muted-foreground", idx > 0 && "md:sr-only");
                  const message = (key: keyof LegErrors) => legError[key]
                    ? <p id={`${legId}-${key}-error`} className="mt-1 text-xs text-destructive">{legError[key]}</p> : null;
                  return (
                  <section key={idx} aria-labelledby={`${legId}-title`} className="rounded-xl border border-border/70 bg-muted/20 p-3 md:border-0 md:bg-transparent md:p-0">
                    <div className="mb-2 flex min-h-8 items-center justify-between gap-2 md:mb-1">
                      <h3 id={`${legId}-title`} className="text-xs font-semibold text-foreground">Flight {idx + 1}</h3>
                      {multiCitySegments.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeSegment(idx)}
                          className="-my-1.5 flex h-11 w-11 items-center justify-center rounded-full text-destructive transition-colors hover:bg-destructive/10 md:h-8 md:w-8"
                          aria-label={`Remove Flight ${idx + 1}`}
                        ><X className="h-4 w-4" aria-hidden="true" /></button>
                      )}
                    </div>
                  <div className="unified-search-segment-grid grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                    <div className="relative min-w-0">
                      <label htmlFor={`${legId}-from`} className={labelClass}>From</label>
                      <AirportCombobox id={`${legId}-from`} value={String(seg.from || "")} onChange={code => updateSegment(idx, "from", code)} placeholder="Origin"
                        invalid={!!legError.from} onAdvance={() => advanceTo(`to-${idx}`)} />
                      {message("from")}
                    </div>
                    <div className="relative min-w-0">
                      <label htmlFor={`${legId}-to`} className={labelClass}>To</label>
                      <AirportCombobox id={`${legId}-to`} value={String(seg.to || "")} onChange={code => updateSegment(idx, "to", code)} placeholder="Destination" iconVariant="arrival"
                        invalid={!!legError.to} openSignal={signal(`to-${idx}`)} onAdvance={() => advanceTo(`date-${idx}`)} />
                      {message("to")}
                    </div>
                    <div className="min-w-0">
                      <label htmlFor={`${legId}-date`} className={labelClass}>Date</label>
                      <DatePickerField id={`${legId}-date`} date={seg.date} onSelect={d => updateSegment(idx, "date", d)} placeholder="Select date" openSignal={signal(`date-${idx}`)}
                        min={idx > 0 ? multiCitySegments[idx - 1].date : undefined} invalid={!!legError.date} describedBy={legError.date ? `${legId}-date-error` : undefined} />
                      {message("date")}
                    </div>
                  </div>
                  </section>
                  );
                })}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={addMultiCitySegment}
                    disabled={multiCitySegments.length >= MAX_MULTI_CITY_FLIGHTS}
                    className="disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary transition-colors"
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
                    <AirportCombobox id={`${fieldId}-from`} value={fromValue} onChange={code => { setFromValue(code); if (errors.from) setErrors(p => ({ ...p, from: undefined })); }} placeholder="Origin" invalid={!!errors.from}
                      onAdvance={() => advanceTo("to")} />
                  </div>
                  {/* Phones: a round button on the line between the stacked From and To (index.css, #148). */}
                  <div className="unified-search-swap hidden md:flex items-center justify-center pb-0.5">
                    <button
                      type="button"
                      onClick={() => { const a = fromValue; setFromValue(toValue); setToValue(a); }}
                      aria-label="Swap origin and destination"
                      className="h-11 w-11 rounded-full border-2 border-primary/30 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="relative">
                    <label htmlFor={`${fieldId}-to`} className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
                    <AirportCombobox id={`${fieldId}-to`} value={toValue} onChange={code => { setToValue(code); if (errors.to) setErrors(p => ({ ...p, to: undefined })); }} placeholder="Destination" invalid={!!errors.to} iconVariant="arrival"
                      openSignal={signal("to")} onAdvance={() => advanceTo("depart")} />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor={`${fieldId}-depart`} className="mb-1 block text-xs font-medium text-muted-foreground">Departure Date</label>
                    <DatePickerField id={`${fieldId}-depart`} date={departDate} onSelect={pickDeparture} placeholder="Departure date" fares={departFares} openSignal={signal("depart")} invalid={!!errors.depart} />
                  </div>
                  <Button
                    onClick={handleSearch}
                    className="unified-search-submit h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl whitespace-nowrap disabled:opacity-50"
                  >
                    <Search className="h-4 w-4 mr-2" /> Search
                  </Button>
                </div>
                <FieldFeedback columns="md:grid-cols-[1fr_auto_1fr_1fr_auto]" messages={[errors.from, null, errors.to, errors.depart, null]} />
              </div>
            ) : (
              /* Round-trip: adds return date */
              <div>
                <div className="unified-search-flight-grid grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 items-end">
                  <div className="relative">
                    <label htmlFor={`${fieldId}-from`} className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
                    <AirportCombobox id={`${fieldId}-from`} value={fromValue} onChange={code => { setFromValue(code); if (errors.from) setErrors(p => ({ ...p, from: undefined })); }} placeholder="Origin" invalid={!!errors.from}
                      onAdvance={() => advanceTo("to")} />
                  </div>
                  {/* Phones: a round button on the line between the stacked From and To (index.css, #148). */}
                  <div className="unified-search-swap hidden md:flex items-center justify-center pb-0.5">
                    <button
                      type="button"
                      onClick={() => { const a = fromValue; setFromValue(toValue); setToValue(a); }}
                      aria-label="Swap origin and destination"
                      className="h-11 w-11 rounded-full border-2 border-primary/30 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="relative">
                    <label htmlFor={`${fieldId}-to`} className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
                    <AirportCombobox id={`${fieldId}-to`} value={toValue} onChange={code => { setToValue(code); if (errors.to) setErrors(p => ({ ...p, to: undefined })); }} placeholder="Destination" invalid={!!errors.to} iconVariant="arrival"
                      openSignal={signal("to")} onAdvance={() => advanceTo("depart")} />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor={`${fieldId}-depart`} className="mb-1 block text-xs font-medium text-muted-foreground">Departure Date</label>
                    <DatePickerField id={`${fieldId}-depart`} date={departDate} onSelect={pickDeparture} placeholder="Departure date" fares={departFares} openSignal={signal("depart")} invalid={!!errors.depart} />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor={`${fieldId}-return`} className="mb-1 block text-xs font-medium text-muted-foreground">Return Date</label>
                    <DatePickerField id={`${fieldId}-return`} date={returnDate} onSelect={(d) => { setReturnDate(d); if (errors.return) setErrors(p => ({ ...p, return: undefined })); }} placeholder="Return date"
                      min={departDate} marked={departDate} fares={departDate ? returnFares : undefined} openSignal={signal("return")} invalid={!!errors.return} />
                  </div>
                  <Button
                    onClick={handleSearch}
                    className="unified-search-submit h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl whitespace-nowrap disabled:opacity-50"
                  >
                    <Search className="h-4 w-4 mr-2" /> Search flights
                  </Button>
                </div>
                <FieldFeedback columns="md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]" messages={[errors.from, null, errors.to, errors.depart, errors.return, null]} />
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
            // The public website's look (as the Flights tab); the admin search (no product navigation) keeps its own.
            premium={showProductNavigation}
            onSearch={(values) => {
              if (onGroupSearch) {
                onGroupSearch(values);
                return;
              }
              // The group results are the Flights results page with group fares only (same list, cards and Book).
              navigate(values.from || values.to ? groupResultsPath(values) : "/group-ticketing");
            }}
          />
        )}


      </SearchContent>
    </SearchCard>
  );
}
