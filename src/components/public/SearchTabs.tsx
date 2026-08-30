import { useState } from "react";
import { Hotel, Plane, Car, Search, MapPin, Users, ArrowLeftRight, Plus, CalendarIcon, X, Tickets, FileCheck2, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { TravelersClassPicker, type TravelersValue } from "@/components/public/TravelersClassPicker";
import { AirportCombobox } from "@/components/public/AirportCombobox";
import { useLocale } from "@/contexts/LocaleContext";
import { formatDateOnly } from "@/lib/date-only";
import { buildGroupTicketSearchParams } from "@/lib/group-ticketing";
import { GroupTicketingSearchBar } from "@/components/public/GroupTicketingSearchBar";

const tabs = [
  { id: "flights", label: "Flights", icon: Plane },
  { id: "group-ticketing", label: "Group Ticketing", icon: Tickets },
  { id: "hotels", label: "Hotels", icon: Hotel },
  { id: "umrah", label: "Umrah", icon: MapPin },
  { id: "visas", label: "Visas", icon: FileCheck2 },
  { id: "tours", label: "Tours", icon: Map },
  { id: "transfers", label: "Transfers", icon: Car },
];

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

function DatePickerField({ date, onSelect, placeholder }: { date: Date | undefined; onSelect: (d: Date | undefined) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const today = startOfDay(new Date());
  const selectDate = (nextDate: Date | undefined) => {
    onSelect(nextDate);
    if (nextDate) setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(
          "flex items-center gap-2 w-full h-12 bg-muted/30 border border-muted rounded-xl px-3 text-sm text-left transition-colors hover:border-primary/30",
          !date && "text-muted-foreground"
        )}>
          <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          {date ? format(date, "MMM dd, yyyy") : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="top" sideOffset={10} collisionPadding={16}>
        <Calendar
          mode="single"
          selected={date}
          onSelect={selectDate}
          disabled={(day) => startOfDay(day) < today}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

type SearchTabsProps = {
  initialTab?: string;
  visibleTabIds?: string[];
  flightResultsPath?: string;
  groupInitialValues?: Parameters<typeof GroupTicketingSearchBar>[0]["initialValues"];
  onGroupSearch?: Parameters<typeof GroupTicketingSearchBar>[0]["onSearch"];
};

export function SearchTabs({ initialTab = "flights", visibleTabIds, flightResultsPath = "/flights-search", groupInitialValues, onGroupSearch }: SearchTabsProps = {}) {
  const { currency } = useLocale();
  const visibleTabs = visibleTabIds?.length ? tabs.filter((tab) => visibleTabIds.includes(tab.id)) : tabs;
  const [activeTab, setActiveTab] = useState(visibleTabs.some((tab) => tab.id === initialTab) ? initialTab : visibleTabs[0]?.id || "flights");
  const [tripType, setTripType] = useState("oneway"); // default One-way
  const [travelers, setTravelers] = useState<TravelersValue>({ adults: 1, children: 0, infants: 0, cabin: "Economy" });
  const [departDate, setDepartDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [hotelCheckIn, setHotelCheckIn] = useState<Date>();
  const [hotelCheckOut, setHotelCheckOut] = useState<Date>();
  const [hotelLocation, setHotelLocation] = useState("");
  const [hotelGuests, setHotelGuests] = useState("2");
  const [transDate, setTransDate] = useState<Date>();
  const [transferPickup, setTransferPickup] = useState("");
  const [transferDropoff, setTransferDropoff] = useState("");
  const [transferPassengers, setTransferPassengers] = useState("1");
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
        location: hotelLocation || "Dubai",
        checkIn: hotelCheckIn ? formatDateOnly(hotelCheckIn) : "",
        checkOut: hotelCheckOut ? formatDateOnly(hotelCheckOut) : "",
        adults: hotelGuests || "2",
        currency,
      });
      navigate(`/hotels-search?${params.toString()}`);
    }
    else if (activeTab === "transfers") {
      const params = new URLSearchParams({
        pickup: transferPickup || "Dubai International Airport",
        dropoff: transferDropoff || "Downtown Dubai",
        pickupDate: transDate ? formatDateOnly(transDate) : "",
        passengers: transferPassengers || "1",
        currency,
      });
      navigate(`/transfers-search?${params.toString()}`);
    }
    else if (activeTab === "visas") navigate("/visa-services");
    else if (activeTab === "umrah") navigate("/umrah-packages");
    else navigate("/tour-packages");
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
    <div className="relative z-10 bg-card rounded-2xl shadow-elevated max-w-6xl mx-auto animate-scale-in">
      {/* Tabs */}
      {visibleTabs.length > 1 && (
      <div className="flex bg-muted/60 rounded-t-2xl overflow-x-auto overflow-y-hidden">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === "umrah") {
                navigate("/umrah-packages");
                return;
              }
              if (tab.id === "visas") {
                navigate("/visa-services");
                return;
              }
              if (tab.id === "tours") {
                navigate("/tour-packages");
                return;
              }
              setActiveTab(tab.id);
            }}
            className={`flex-1 min-w-[4.5rem] shrink-0 flex items-center justify-center gap-1.5 px-3 sm:px-4 py-3.5 text-xs sm:text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-card text-primary border-b-2 border-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-card/60"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>
      )}

      <div className="p-5 space-y-4">
        {/* Flight-specific controls */}
        {activeTab === "flights" && (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center bg-muted/40 rounded-lg p-0.5">
                {tripTypes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTripType(t.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      tripType === t.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <TravelersClassPicker value={travelers} onChange={setTravelers} variant="compact" mode="travelers" className="w-40" />
                <TravelersClassPicker value={travelers} onChange={setTravelers} variant="compact" mode="cabin" className="w-44" />
              </div>
            </div>

            {/* Multi-city layout */}
            {tripType === "multicity" ? (
              <div className="space-y-3">
                {multiCitySegments.map((seg, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
                    <div className="relative">
                      {idx === 0 && <label className="text-xs font-medium text-muted-foreground mb-1 block">From</label>}
                      <div className="relative">
                        <AirportCombobox value={String(seg.from || "")} onChange={code => updateSegment(idx, "from", code)} placeholder="From airport" />
                      </div>
                    </div>
                    <div className="relative">
                      {idx === 0 && <label className="text-xs font-medium text-muted-foreground mb-1 block">To</label>}
                      <div className="relative">
                        <AirportCombobox value={String(seg.to || "")} onChange={code => updateSegment(idx, "to", code)} placeholder="To airport" />
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
                  <Button onClick={handleSearch} className="h-12 px-8 gradient-primary text-primary-foreground font-semibold rounded-xl">
                    <Search className="h-4 w-4 mr-2" /> Search Flights
                  </Button>
                </div>
              </div>
            ) : tripType === "oneway" ? (
              /* One-way: From | swap | To | Date | Search (compact, balanced) */
              <div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_1fr_auto] gap-3 items-center">
                  <div className="relative">
                    <AirportCombobox value={fromValue} onChange={code => { setFromValue(code); if (errors.from) setErrors(p => ({ ...p, from: undefined })); }} placeholder="From where?" invalid={!!errors.from} />
                  </div>
                  <div className="hidden md:flex items-center justify-center">
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
                    <AirportCombobox value={toValue} onChange={code => { setToValue(code); if (errors.to) setErrors(p => ({ ...p, to: undefined })); }} placeholder="To where?" invalid={!!errors.to} />
                  </div>
                  <DatePickerField date={departDate} onSelect={(d) => { setDepartDate(d); if (errors.depart) setErrors(p => ({ ...p, depart: undefined })); }} placeholder="Departure date" />
                  <Button
                    onClick={handleSearch}
                    disabled={!flightsValid}
                    className="h-12 px-6 gradient-primary text-primary-foreground font-semibold rounded-xl whitespace-nowrap disabled:opacity-50"
                  >
                    <Search className="h-4 w-4 mr-2" /> Search
                  </Button>
                </div>
                {(errors.from || errors.to || errors.depart) && (
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_1fr_auto] gap-3 text-xs text-destructive">
                    <p>{errors.from || ""}</p><span className="hidden md:block" /><p>{errors.to || ""}</p><p>{errors.depart || ""}</p><span className="hidden md:block" />
                  </div>
                )}
              </div>
            ) : (
              /* Round-trip: adds return date */
              <div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_1fr_1fr_auto] gap-3 items-center">
                  <div className="relative">
                    <AirportCombobox value={fromValue} onChange={code => { setFromValue(code); if (errors.from) setErrors(p => ({ ...p, from: undefined })); }} placeholder="From where?" invalid={!!errors.from} />
                  </div>
                  <div className="hidden md:flex items-center justify-center">
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
                    <AirportCombobox value={toValue} onChange={code => { setToValue(code); if (errors.to) setErrors(p => ({ ...p, to: undefined })); }} placeholder="To where?" invalid={!!errors.to} />
                  </div>
                  <DatePickerField date={departDate} onSelect={(d) => { setDepartDate(d); if (errors.depart) setErrors(p => ({ ...p, depart: undefined })); }} placeholder="Departure date" />
                  <DatePickerField date={returnDate} onSelect={(d) => { setReturnDate(d); if (errors.return) setErrors(p => ({ ...p, return: undefined })); }} placeholder="Return date" />
                  <Button
                    onClick={handleSearch}
                    disabled={!flightsValid}
                    aria-label="Search flights"
                    className="h-12 px-6 gradient-primary text-primary-foreground font-semibold rounded-xl whitespace-nowrap disabled:opacity-50"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {(errors.from || errors.to || errors.depart || errors.return) && (
                  <p className="mt-2 text-xs text-destructive">
                    {[errors.from, errors.to, errors.depart, errors.return].filter(Boolean).join(" • ")}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === "hotels" && (
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-center">
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input value={hotelLocation} onChange={(event) => setHotelLocation(event.target.value)} placeholder="City, hotel, or destination" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <DatePickerField date={hotelCheckIn} onSelect={setHotelCheckIn} placeholder="Check-in" />
            <DatePickerField date={hotelCheckOut} onSelect={setHotelCheckOut} placeholder="Check-out" />
            <div className="relative md:hidden">
              <Users className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input value={hotelGuests} onChange={(event) => setHotelGuests(event.target.value)} type="number" min={1} placeholder="Guests" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <Button onClick={handleSearch} className="h-12 px-6 gradient-primary text-primary-foreground font-semibold rounded-xl">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </div>
        )}




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

        {activeTab === "transfers" && (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center">
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input value={transferPickup} onChange={(event) => setTransferPickup(event.target.value)} placeholder="Pick-up location" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input value={transferDropoff} onChange={(event) => setTransferDropoff(event.target.value)} placeholder="Drop-off location" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <DatePickerField date={transDate} onSelect={setTransDate} placeholder="Select date" />
            <div className="relative md:hidden">
              <Users className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input value={transferPassengers} onChange={(event) => setTransferPassengers(event.target.value)} type="number" min={1} placeholder="Passengers" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <Button onClick={handleSearch} className="h-12 px-6 gradient-primary text-primary-foreground font-semibold rounded-xl">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
