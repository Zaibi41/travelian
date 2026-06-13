import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Building2, CalendarIcon, CheckCircle2, ChevronDown, FileCheck, Hotel, Landmark, Loader2, Map, Minus, Plane, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { SearchTabs } from "@/components/public/SearchTabs";
import { useAdmin } from "@/contexts/AdminStore";
import { useLocale } from "@/contexts/LocaleContext";
import type { Hotel as HotelModel, UmrahPackage } from "@/data/models";
import { isPublishedPackage, isPublishedUmrahPackage } from "@/lib/package-availability";
import { createBookingRequest } from "@/lib/booking-request-api";
import { cn } from "@/lib/utils";

const searchTabs = [
  { id: "flights", label: "Flights", icon: Plane },
  { id: "hotels", label: "Hotels", icon: Hotel },
  { id: "umrah", label: "Umrah", icon: Landmark },
  { id: "visas", label: "Visas", icon: FileCheck },
  { id: "tours", label: "Tours", icon: Map },
] as const;

type SearchTabId = typeof searchTabs[number]["id"];
type PackageCategory = Extract<UmrahPackage["category"], "umrah" | "tour" | "visa">;

function unique(values: Array<string | undefined>) {
  return Array.from(new Set(values.map(value => value?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));
}

function normalizeVisaType(value?: string) {
  const raw = String(value || "").trim();
  const lower = raw.toLowerCase();
  if (!lower) return "";
  if (lower.includes("visit") || lower.includes("tourist")) return "Visit";
  if (lower.includes("study") || lower.includes("student")) return "Study";
  if (lower.includes("work") || lower.includes("business")) return "Work Visa";
  return raw;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function DateInput({ label, value, min, onChange }: { label: string; value: string; min?: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-muted-foreground">{label}</Label>
      <div className="relative">
        <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="date" min={min || todayKey()} value={value} onChange={event => onChange(event.target.value)} className="h-12 rounded-xl pl-9" />
      </div>
    </div>
  );
}

function Counter({ label, sub, value, onChange, min = 0 }: { label: string; sub?: string; value: number; onChange: (value: number) => void; min?: number }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" size="icon" variant="outline" className="h-8 w-8 rounded-full" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}><Minus className="h-3.5 w-3.5" /></Button>
        <span className="w-6 text-center text-sm font-bold">{value}</span>
        <Button type="button" size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => onChange(value + 1)}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

function HotelGuestsPicker({
  rooms,
  adults,
  children,
  setRooms,
  setAdults,
  setChildren,
}: {
  rooms: number;
  adults: number;
  children: number;
  setRooms: (value: number) => void;
  setAdults: (value: number) => void;
  setChildren: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="flex h-12 w-full items-center gap-2 rounded-xl border border-input bg-background px-3 text-left text-sm transition-colors hover:border-primary/30"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{rooms} Room{rooms > 1 ? "s" : ""}, {adults + children} Guest{adults + children > 1 ? "s" : ""}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[200] mt-2 w-80 rounded-xl border bg-card p-4 shadow-elevated" role="dialog">
          <div className="space-y-4">
            <Counter label="Rooms" value={rooms} min={1} onChange={setRooms} />
            <Counter label="Adults" sub="12+ years" value={adults} min={1} onChange={setAdults} />
            <Counter label="Children" sub="2-11 years" value={children} onChange={setChildren} />
          </div>
          <Button size="sm" className="mt-4 w-full gradient-primary text-primary-foreground" onClick={() => setOpen(false)}>Done</Button>
        </div>
      )}
    </div>
  );
}

function HotelSearchPanel({ hotels }: { hotels: HotelModel[] }) {
  const { formatPrice } = useLocale();
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const activeHotels = hotels.filter(hotel => hotel.status === "active");
  const cities = unique(activeHotels.map(hotel => hotel.city));
  const filtered = activeHotels.filter(hotel => !submitted || !destination || hotel.city.toLowerCase().includes(destination.toLowerCase()) || hotel.name.toLowerCase().includes(destination.toLowerCase()));

  return (
    <div className="space-y-5">
      <Card className="shadow-card">
        <CardContent className="space-y-5 p-5">
          <div>
            <h2 className="text-xl font-bold font-display">Hotel Search</h2>
            <p className="mt-1 text-sm text-muted-foreground">Search active hotel inventory from Travelian database records.</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto]">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Destination</Label>
              <Input list="hotel-destinations" value={destination} onChange={event => setDestination(event.target.value)} placeholder="Destination" className="h-12 rounded-xl" />
              <datalist id="hotel-destinations">{cities.map(city => <option key={city} value={city} />)}</datalist>
            </div>
            <DateInput label="Check-in" value={checkIn} onChange={value => { setCheckIn(value); if (checkOut && value && checkOut <= value) setCheckOut(""); }} />
            <DateInput label="Check-out" value={checkOut} min={checkIn || todayKey()} onChange={setCheckOut} />
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Guests / Rooms</Label>
              <HotelGuestsPicker rooms={rooms} adults={adults} children={children} setRooms={setRooms} setAdults={setAdults} setChildren={setChildren} />
            </div>
            <Button className="h-12 self-end rounded-xl px-6" onClick={() => setSubmitted(true)}>Search Hotels</Button>
          </div>
        </CardContent>
      </Card>
      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No active hotels found" description="Published hotel records from the database will appear here. Try another destination or add active inventory from Hotel Inventory." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map(hotel => (
            <Card key={hotel.hotelId} className="shadow-card">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Hotel className="h-7 w-7" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{hotel.name}</h3>
                    <Badge variant="secondary">{hotel.starRating || 0} star</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{hotel.city}, {hotel.country}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{hotel.amenities?.slice(0, 4).join(" / ") || "Amenities available on request"}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="font-black text-primary">From {formatPrice(hotel.pricePerNight || 0)} / night</p>
                    <Button asChild size="sm" className="rounded-xl"><Link to={`/hotel/${hotel.hotelId}`}>View / Request</Link></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function RequestDialog({
  item,
  category,
  onClose,
}: {
  item: UmrahPackage | null;
  category: PackageCategory;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ customerName: "", phone: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const label = category === "umrah" ? "package" : category === "visa" ? "visa service" : "tour";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!item) return;
    if (!form.customerName.trim() || !form.phone.trim()) {
      toast.error("Name and phone number are required");
      return;
    }
    setSubmitting(true);
    try {
      await createBookingRequest({
        type: category,
        packageId: item.packageId,
        packageName: item.name,
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
      });
      setSubmitted(true);
      toast.success("Request saved in Booking Requests");
    } catch (error) {
      console.error(error);
      toast.error("Request could not be saved");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{submitted ? "Request saved" : `Request ${label}`}</DialogTitle>
          <DialogDescription>
            Submit the customer name and phone number so this {label} can be handled from Booking Requests.
          </DialogDescription>
        </DialogHeader>
        {submitted ? (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <p className="text-sm text-muted-foreground">The request for <strong>{item?.name}</strong> is saved in the Requests module. Admin notification email will be handled by the configured backend notification settings.</p>
            <Button className="w-full" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={submit}>
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-xs font-bold uppercase text-muted-foreground">Selected {label}</p>
              <p className="font-semibold">{item?.name}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-request-name">Name *</Label>
              <Input id="admin-request-name" value={form.customerName} onChange={event => setForm(current => ({ ...current, customerName: event.target.value }))} autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-request-phone">Phone number *</Label>
              <Input id="admin-request-phone" value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} autoComplete="tel" placeholder="+92 300 1234567" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-request-email">Email (optional)</Label>
              <Input id="admin-request-email" type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} autoComplete="email" />
            </div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Request"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ServiceSearchPanel({
  title,
  description,
  items,
  category,
}: {
  title: string;
  description: string;
  items: UmrahPackage[];
  category: PackageCategory;
}) {
  const { formatPrice } = useLocale();
  const [query, setQuery] = useState("");
  const [primary, setPrimary] = useState("all");
  const [secondary, setSecondary] = useState("all");
  const [duration, setDuration] = useState("all");
  const [requestItem, setRequestItem] = useState<UmrahPackage | null>(null);
  const published = items.filter(item => category === "umrah" ? isPublishedUmrahPackage(item) : isPublishedPackage(item, category));
  const primaryOptions = unique(published.map(item => category === "visa" ? item.city || item.name.split(" ")[0] : category === "tour" ? item.city : item.departureCity || item.city));
  const baseSecondaryOptions = unique(published.map(item => category === "visa" ? normalizeVisaType(item.packageType) : category === "tour" ? item.packageType : item.packageType || item.hotel || item.roomSharing));
  const secondaryOptions = category === "visa" ? unique([...baseSecondaryOptions, "Visit", "Study", "Work Visa"]) : baseSecondaryOptions;
  const durationOptions = unique(published.map(item => item.duration || item.processingTime));
  const filtered = published.filter(item => {
    const haystack = [
      item.name, item.description, item.duration, item.processingTime, item.city, item.departureCity, item.packageType,
      item.makkahHotel, item.madinahHotel, item.hotel, item.requiredDocuments?.join(" "), item.itineraryText,
    ].filter(Boolean).join(" ").toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (primary !== "all" && !haystack.includes(primary.toLowerCase())) return false;
    if (secondary !== "all" && category === "visa" && normalizeVisaType(item.packageType).toLowerCase() !== secondary.toLowerCase()) return false;
    if (secondary !== "all" && category !== "visa" && category !== "tour" && !haystack.includes(secondary.toLowerCase())) return false;
    if (duration !== "all" && !haystack.includes(duration.toLowerCase())) return false;
    return true;
  });
  const placeholder = category === "umrah"
    ? "Search package, hotel, city, or duration"
    : category === "visa"
      ? "Search country, visa type, or processing time"
      : "Search destination, itinerary, or duration";
  const buttonLabel = category === "umrah" ? "Search Umrah" : category === "visa" ? "Search Visas" : "Search Tours";
  const detailBase = category === "umrah" ? "umrah" : category === "visa" ? "visa" : "tour";

  return (
    <div className="space-y-5">
      <Card className="shadow-card">
        <CardContent className="space-y-5 p-5">
          <div>
            <h2 className="text-xl font-bold font-display">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <div className={cn("grid gap-3", category === "visa" ? "lg:grid-cols-[1.5fr_1fr_1fr_auto]" : category === "tour" ? "lg:grid-cols-[1.5fr_1fr_1fr_auto]" : "lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]")}>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Search</Label>
              <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={event => setQuery(event.target.value)} className="h-12 rounded-xl pl-9" placeholder={placeholder} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">{category === "visa" ? "Country" : category === "tour" ? "Destination" : "Departure city"}</Label>
              <Select value={primary} onValueChange={setPrimary}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder={category === "visa" ? "Country" : category === "tour" ? "Destination" : "Departure city"} /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem>{primaryOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {category !== "tour" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">{category === "visa" ? "Visa type" : "Hotel category"}</Label>
                <Select value={secondary} onValueChange={setSecondary}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder={category === "visa" ? "Visa type" : "Hotel category"} /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All</SelectItem>{secondaryOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {category !== "visa" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Duration" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All</SelectItem>{durationOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <Button className="h-12 self-end rounded-xl px-6">{buttonLabel}</Button>
          </div>
        </CardContent>
      </Card>
      {filtered.length === 0 ? (
        <EmptyState icon={category === "umrah" ? Landmark : category === "visa" ? FileCheck : Map} title={`No active ${title.toLowerCase()} found`} description="Only active, published database records are shown here." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map(item => (
            <Card key={item.packageId} className="shadow-card">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    {category === "umrah" ? <Landmark className="h-6 w-6" /> : category === "visa" ? <FileCheck className="h-6 w-6" /> : <Map className="h-6 w-6" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{item.name}</h3>
                      <Badge variant="secondary" className="capitalize">{item.packageType || category}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{[item.duration || item.processingTime, item.departureCity || item.city, item.travelDates].filter(Boolean).join(" / ") || "Details available on request"}</p>
                  </div>
                </div>
                {category === "umrah" && (
                  <div className="grid gap-2 rounded-2xl border bg-muted/30 p-3 text-sm">
                    <p><span className="font-bold">Makkah:</span> {item.makkahHotel || item.hotelOptions?.[0]?.makkahHotel || "On request"}</p>
                    <p><span className="font-bold">Madinah:</span> {item.madinahHotel || item.hotelOptions?.[0]?.madinahHotel || "On request"}</p>
                    <p className="text-muted-foreground">{item.transportIncluded ? "Transport included" : "Transport on request"}</p>
                  </div>
                )}
                {category === "visa" && (
                  <p className="text-sm text-muted-foreground">{item.requiredDocuments?.slice(0, 3).join(", ") || "Documents list available on request"}</p>
                )}
                {category === "tour" && (
                  <p className="text-sm text-muted-foreground">{item.itineraryText || item.hotelsText || item.description}</p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <p className="text-xl font-black text-primary">{formatPrice(item.basePrice || 0)}</p>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" className="rounded-xl"><Link to={`/${detailBase}/${item.packageId}`}>{category === "visa" ? "View Visa" : category === "tour" ? "View Tour" : "View Package"}</Link></Button>
                    <Button className="rounded-xl" onClick={() => setRequestItem(item)}>{category === "visa" ? "Request Visa" : category === "tour" ? "Request Tour" : "Request Package"}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <RequestDialog item={requestItem} category={category} onClose={() => setRequestItem(null)} />
    </div>
  );
}

export default function AdminSearchPage() {
  const [params, setParams] = useSearchParams();
  const { hotels, packages, tourPackages, visaPackages } = useAdmin();
  const tabParam = params.get("tab") as SearchTabId | null;
  const activeTab = useMemo(
    () => searchTabs.some((tab) => tab.id === tabParam) ? tabParam! : "flights",
    [tabParam],
  );

  useEffect(() => {
    if (!tabParam || !searchTabs.some((tab) => tab.id === tabParam)) {
      setParams({ tab: "flights" }, { replace: true });
    }
  }, [setParams, tabParam]);

  const setTab = (tab: SearchTabId) => setParams({ tab });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">Search live fares and published Travelian services. Inventory, pricing and supplier settings stay in their own admin modules.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border bg-card p-2 shadow-card">
        {searchTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={`inline-flex min-w-max items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
              activeTab === tab.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "flights" && (
        <SearchTabs initialTab="flights" visibleTabIds={["flights"]} flightResultsPath="/admin/flights-search" />
      )}
      {activeTab === "hotels" && <HotelSearchPanel hotels={hotels} />}
      {activeTab === "umrah" && (
        <ServiceSearchPanel title="Umrah Packages" description="Search published Umrah inventory and start an assisted package request." items={packages} category="umrah" />
      )}
      {activeTab === "visas" && (
        <ServiceSearchPanel title="Visa Services" description="Search active visa services by country, visa type, processing time, or documents." items={visaPackages} category="visa" />
      )}
      {activeTab === "tours" && (
        <ServiceSearchPanel title="Tour Packages" description="Search active domestic and international tour packages from Travelian inventory." items={tourPackages} category="tour" />
      )}
    </div>
  );
}
