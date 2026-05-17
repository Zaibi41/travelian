import { useState } from "react";
import { Hotel, Plane, UsersRound, Car, Package, Search, MapPin, Users, ChevronDown, ArrowLeftRight, Plus, CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TravelersClassPicker, type TravelersValue } from "@/components/public/TravelersClassPicker";

const tabs = [
  { id: "flights", label: "Flights", icon: Plane },
  { id: "hotels", label: "Hotels", icon: Hotel },
  { id: "packages", label: "Packages", icon: Package },
  { id: "groupbooking", label: "Group Booking", icon: UsersRound },
  { id: "transfers", label: "Transfers", icon: Car },
];

const tripTypes = [
  { id: "oneway", label: "One-way" },
  { id: "roundtrip", label: "Round-trip" },
  { id: "multicity", label: "Multi-city" },
];

const cabinClasses = ["Economy", "Premium Economy", "Business Class", "First Class"];

interface MultiCitySegment {
  from: string;
  to: string;
  date: Date | undefined;
}

function DatePickerField({ date, onSelect, placeholder }: { date: Date | undefined; onSelect: (d: Date | undefined) => void; placeholder: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={cn(
          "flex items-center gap-2 w-full h-12 bg-muted/30 border border-muted rounded-xl px-3 text-sm text-left transition-colors hover:border-primary/30",
          !date && "text-muted-foreground"
        )}>
          <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          {date ? format(date, "MMM dd, yyyy") : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={onSelect} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}

export function SearchTabs() {
  const [activeTab, setActiveTab] = useState("flights");
  const [tripType, setTripType] = useState("oneway"); // default One-way
  const [travelers, setTravelers] = useState<TravelersValue>({ adults: 1, children: 0, infants: 0, cabin: "Economy" });
  const [departDate, setDepartDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [hotelCheckIn, setHotelCheckIn] = useState<Date>();
  const [hotelCheckOut, setHotelCheckOut] = useState<Date>();
  const [pkgDate, setPkgDate] = useState<Date>();
  const [actDate, setActDate] = useState<Date>();
  const [transDate, setTransDate] = useState<Date>();
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
    if (!fromValue.trim()) next.from = "Origin is required";
    if (!toValue.trim()) next.to = "Destination is required";
    if (fromValue.trim() && toValue.trim() && fromValue.trim().toLowerCase() === toValue.trim().toLowerCase()) {
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
    fromValue.trim().length > 0 &&
    toValue.trim().length > 0 &&
    fromValue.trim().toLowerCase() !== toValue.trim().toLowerCase() &&
    !!departDate && departDate >= today &&
    (tripType !== "roundtrip" || (!!returnDate && !!departDate && returnDate >= departDate));

  const handleSearch = () => {
    if (activeTab === "flights") {
      if (!validateFlights()) return;
      const params = new URLSearchParams({
        from: fromValue, to: toValue,
        depart: departDate ? departDate.toISOString().slice(0, 10) : "",
        ...(tripType === "roundtrip" && returnDate ? { return: returnDate.toISOString().slice(0, 10) } : {}),
        adults: String(travelers.adults), children: String(travelers.children), infants: String(travelers.infants),
        cabin: travelers.cabin, trip: tripType,
      });
      navigate(`/flights-search?${params.toString()}`);
      return;
    }
    if (activeTab === "hotels") navigate("/hotels-search");
    else if (activeTab === "packages") navigate("/umrah-packages");
    else if (activeTab === "groupbooking") navigate("/contact?type=group");
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
      <div className="flex bg-muted/60 rounded-t-2xl overflow-hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all duration-200 ${
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
              <div className="relative" ref={passengerRef}>
                <button
                  type="button"
                  onClick={() => setShowPassengers(!showPassengers)}
                  className="flex items-center gap-2 text-xs font-medium text-foreground bg-muted/40 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span className="whitespace-nowrap">{totalPassengers} Traveler{totalPassengers > 1 ? 's' : ''}, {cabin}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showPassengers && (
                  <div className="absolute top-full left-0 mt-2 bg-card border rounded-xl shadow-elevated p-4 z-20 w-80">
                    <div className="space-y-3">
                      {[
                        { label: "Adults", sub: "12+ years", value: adults, set: setAdults, min: 1 },
                        { label: "Children", sub: "2-11 years", value: children, set: setChildren, min: 0 },
                        { label: "Infants", sub: "Under 2", value: infants, set: setInfants, min: 0 },
                      ].map(p => (
                        <div key={p.label} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">{p.label}</p>
                            <p className="text-[10px] text-muted-foreground">{p.sub}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => p.set(Math.max(p.min, p.value - 1))}
                              className="h-7 w-7 rounded-full border flex items-center justify-center text-sm hover:bg-muted disabled:opacity-40"
                              disabled={p.value <= p.min}
                            >−</button>
                            <span className="text-sm font-semibold w-5 text-center">{p.value}</span>
                            <button
                              type="button"
                              onClick={() => p.set(p.value + 1)}
                              className="h-7 w-7 rounded-full border flex items-center justify-center text-sm hover:bg-muted"
                            >+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Cabin Class</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {cabinClasses.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setCabin(c)}
                            className={`text-xs px-2 py-2 rounded-md transition-all text-center ${
                              cabin === c ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                            }`}
                          >{c}</button>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" className="w-full mt-3 gradient-primary text-primary-foreground" onClick={() => setShowPassengers(false)}>
                      Done
                    </Button>
                  </div>
                )}
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
                        <Plane className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="City or airport"
                          className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm"
                          value={seg.from}
                          onChange={e => updateSegment(idx, "from", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="relative">
                      {idx === 0 && <label className="text-xs font-medium text-muted-foreground mb-1 block">To</label>}
                      <div className="relative">
                        <Plane className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground rotate-90" />
                        <Input
                          placeholder="City or airport"
                          className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm"
                          value={seg.to}
                          onChange={e => updateSegment(idx, "to", e.target.value)}
                        />
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
                    <Plane className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={fromValue}
                      onChange={e => { setFromValue(e.target.value); if (errors.from) setErrors(p => ({ ...p, from: undefined })); }}
                      placeholder="From where?"
                      aria-invalid={!!errors.from}
                      className={cn("pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm", errors.from && "border-destructive")}
                    />
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
                    <Plane className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground rotate-90" />
                    <Input
                      value={toValue}
                      onChange={e => { setToValue(e.target.value); if (errors.to) setErrors(p => ({ ...p, to: undefined })); }}
                      placeholder="To where?"
                      aria-invalid={!!errors.to}
                      className={cn("pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm", errors.to && "border-destructive")}
                    />
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
                    <Plane className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={fromValue}
                      onChange={e => { setFromValue(e.target.value); if (errors.from) setErrors(p => ({ ...p, from: undefined })); }}
                      placeholder="From where?"
                      aria-invalid={!!errors.from}
                      className={cn("pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm", errors.from && "border-destructive")}
                    />
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
                    <Plane className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground rotate-90" />
                    <Input
                      value={toValue}
                      onChange={e => { setToValue(e.target.value); if (errors.to) setErrors(p => ({ ...p, to: undefined })); }}
                      placeholder="To where?"
                      aria-invalid={!!errors.to}
                      className={cn("pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm", errors.to && "border-destructive")}
                    />
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
              <Input placeholder="City, hotel, or destination" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <DatePickerField date={hotelCheckIn} onSelect={setHotelCheckIn} placeholder="Check-in" />
            <DatePickerField date={hotelCheckOut} onSelect={setHotelCheckOut} placeholder="Check-out" />
            <Button onClick={handleSearch} className="h-12 px-6 gradient-primary text-primary-foreground font-semibold rounded-xl">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </div>
        )}

        {activeTab === "packages" && (
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-center">
            <div className="relative">
              <Package className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Umrah, Hajj, or custom package..." className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <DatePickerField date={pkgDate} onSelect={setPkgDate} placeholder="Travel date" />
            <div className="relative">
              <Users className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Travelers" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <Button onClick={handleSearch} className="h-12 px-6 gradient-primary text-primary-foreground font-semibold rounded-xl">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </div>
        )}

        {activeTab === "groupbooking" && (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-center">
            <div className="relative">
              <Plane className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="From" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <div className="relative">
              <Plane className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground rotate-90" />
              <Input placeholder="To" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <DatePickerField date={actDate} onSelect={setActDate} placeholder="Travel date" />
            <div className="relative">
              <UsersRound className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input type="number" min={10} placeholder="Group size (10+)" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <Button onClick={handleSearch} className="h-12 px-6 gradient-primary text-primary-foreground font-semibold rounded-xl">
              <Search className="h-4 w-4 mr-2" /> Inquire
            </Button>
          </div>
        )}

        {activeTab === "transfers" && (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center">
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pick-up location" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Drop-off location" className="pl-9 h-12 bg-muted/30 border-muted rounded-xl text-sm" />
            </div>
            <DatePickerField date={transDate} onSelect={setTransDate} placeholder="Select date" />
            <Button onClick={handleSearch} className="h-12 px-6 gradient-primary text-primary-foreground font-semibold rounded-xl">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
