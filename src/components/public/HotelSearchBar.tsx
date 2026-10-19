import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { addDays, format, startOfDay } from "date-fns";
import { CalendarIcon, ChevronDown, MapPin, Minus, Plus, Search, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateOnly, parseDateOnly } from "@/lib/date-only";

export interface HotelSearchValues {
  location: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
}

function StayDate({ label, value, minimum, onChange }: { label: string; value: string; minimum: Date; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const date = parseDateOnly(value);
  return <div className="min-w-0 space-y-1.5">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button type="button" variant="outline" aria-label={label} className="h-12 w-full justify-start gap-2 rounded-xl border-muted bg-muted/30 px-3 font-normal">
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">{date ? format(date, "EEE, dd MMM yyyy") : label}</span>
      </Button></PopoverTrigger>
      <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] p-0">
        <Calendar mode="single" selected={date} defaultMonth={date} disabled={day => startOfDay(day) < startOfDay(minimum)} initialFocus className="pointer-events-auto p-3" onSelect={next => { if (next) { onChange(formatDateOnly(next)); setOpen(false); } }} />
      </PopoverContent>
    </Popover>
  </div>;
}

const popularCities = [
  "Makkah", "Al Madinah", "Dubai", "Baku",
  "Lahore", "Istanbul", "Karachi", "Islamabad",
  "Kuala Lumpur", "New York", "London", "Brussels",
  "Bangkok", "Jeddah", "Phuket", "Doha",
  "Manama", "Skardu", "Tokyo", "Multan",
];

export function HotelSearchBar({ initialValues, onSearch, loading }: { initialValues: HotelSearchValues; onSearch: (values: HotelSearchValues) => void; loading: boolean }) {
  const [values, setValues] = useState(initialValues);
  const [open, setOpen] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const destRef = useRef<HTMLDivElement>(null);
  const [destRect, setDestRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { setValues(initialValues); setError(""); }, [initialValues]);
  useEffect(() => {
    if (!destOpen) return;
    const updateRect = () => {
      const rect = destRef.current?.getBoundingClientRect();
      if (rect) setDestRect({ left: rect.left, top: rect.bottom + 8, width: rect.width });
    };
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (destRef.current && !destRef.current.contains(event.target as Node)) setDestOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDestOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [destOpen]);
  const update = (next: Partial<HotelSearchValues>) => { setValues(current => ({ ...current, ...next })); setError(""); };
  return <form className="space-y-3" onSubmit={event => {
    event.preventDefault();
    if (!values.location.trim()) { setError("Enter a city or destination."); return; }
    if (!parseDateOnly(values.checkIn) || !parseDateOnly(values.checkOut) || values.checkIn < formatDateOnly(new Date()) || values.checkOut <= values.checkIn) { setError("Choose a check-in date from today and a later check-out date."); return; }
    onSearch({ ...values, location: values.location.trim() });
  }}>
    <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)_auto]">
      <div className="min-w-0 space-y-1.5">
        <label htmlFor="hotel-destination" className="text-xs font-medium text-muted-foreground">Destination</label>
        <div className="relative" ref={destRef}>
          <MapPin className="pointer-events-none absolute left-3 top-4 z-10 h-4 w-4 text-muted-foreground" />
          <Input id="hotel-destination" value={values.location} onChange={event => update({ location: event.target.value })} onFocus={() => setDestOpen(true)} placeholder="City or destination" className="h-12 rounded-xl border-muted bg-muted/30 pl-9 pr-9" autoComplete="off" />
          {values.location && (
            <button type="button" aria-label="Clear destination" onClick={event => { event.stopPropagation(); update({ location: "" }); }} className="absolute right-2.5 top-3.5 z-10 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
          {destOpen && destRect && createPortal(
            <div
              className="fixed z-[1120] max-h-72 overflow-y-auto rounded-2xl border bg-popover p-3 text-popover-foreground shadow-elevated"
              style={{
                left: Math.max(8, Math.min(destRect.left, window.innerWidth - destRect.width - 8)),
                top: destRect.top,
                width: destRect.width,
                maxWidth: "calc(100vw - 1rem)",
              }}
            >
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Search By City, District, Region, Hotel Name</p>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {(values.location.trim()
                  ? popularCities.filter(city => city.toLowerCase().includes(values.location.trim().toLowerCase()))
                  : popularCities
                ).map(city => (
                  <button key={city} type="button" className="truncate rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted" onClick={() => { update({ location: city }); setDestOpen(false); }}>
                    {city}
                  </button>
                ))}
              </div>
              {values.location.trim() && !popularCities.some(city => city.toLowerCase().includes(values.location.trim().toLowerCase())) && (
                <p className="mt-1 text-xs text-muted-foreground">No matching city suggestion — you can still search this destination.</p>
              )}
            </div>
          )}
        </div>
      </div>
      <StayDate label="Check-in" value={values.checkIn} minimum={new Date()} onChange={checkIn => { const date = parseDateOnly(checkIn); update({ checkIn, ...(date && values.checkOut <= checkIn ? { checkOut: formatDateOnly(addDays(date, 1)) } : {}) }); }} />
      <StayDate label="Check-out" value={values.checkOut} minimum={addDays(parseDateOnly(values.checkIn) || new Date(), 1)} onChange={checkOut => update({ checkOut })} />
      <div className="min-w-0 space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Guests &amp; Rooms</span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild><Button type="button" variant="outline" aria-label="Guests and rooms" className="h-12 w-full justify-between gap-2 rounded-xl border-muted bg-muted/30 px-3 font-normal"><Users className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">{values.adults + values.children} Guests, {values.rooms} Room{values.rooms === 1 ? "" : "s"}</span><ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /></Button></PopoverTrigger>
          <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
            <h2 className="mb-3 font-semibold">Guests &amp; Rooms</h2>
            {([{ key: "adults", label: "Adults", min: 1, max: 20 }, { key: "children", label: "Children", min: 0, max: 10 }, { key: "rooms", label: "Rooms", min: 1, max: values.adults }] as const).map(row => <div key={row.key} className="flex items-center justify-between gap-3 py-2"><span className="text-sm">{row.label}</span><div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label={`Remove ${row.label.toLowerCase()}`} disabled={values[row.key] <= row.min} onClick={() => { const count = values[row.key] - 1; update({ [row.key]: count, ...(row.key === "adults" ? { rooms: Math.min(values.rooms, count) } : {}) }); }}><Minus className="h-3.5 w-3.5" /></Button>
              <span className="w-5 text-center text-sm font-semibold">{values[row.key]}</span>
              <Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label={`Add ${row.label.toLowerCase()}`} disabled={values[row.key] >= row.max} onClick={() => update({ [row.key]: values[row.key] + 1 })}><Plus className="h-3.5 w-3.5" /></Button>
            </div></div>)}
            <Button type="button" className="mt-3 w-full" onClick={() => setOpen(false)}>Done</Button>
          </PopoverContent>
        </Popover>
      </div>
      <Button type="submit" disabled={loading} className="h-12 gap-2 rounded-xl px-6 font-semibold sm:col-span-2 lg:col-span-1"><Search className="h-4 w-4" />{loading ? "Searching…" : "Search Hotels"}</Button>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>;
}