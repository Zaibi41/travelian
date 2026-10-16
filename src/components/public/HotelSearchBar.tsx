import { useEffect, useState } from "react";
import { addDays, format, startOfDay } from "date-fns";
import { CalendarIcon, ChevronDown, MapPin, Minus, Plus, Search, Users } from "lucide-react";
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

export function HotelSearchBar({ initialValues, onSearch, loading }: { initialValues: HotelSearchValues; onSearch: (values: HotelSearchValues) => void; loading: boolean }) {
  const [values, setValues] = useState(initialValues);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setValues(initialValues); setError(""); }, [initialValues]);
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
        <div className="relative"><MapPin className="pointer-events-none absolute left-3 top-4 h-4 w-4 text-muted-foreground" /><Input id="hotel-destination" value={values.location} onChange={event => update({ location: event.target.value })} placeholder="City or destination" className="h-12 rounded-xl border-muted bg-muted/30 pl-9" /></div>
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