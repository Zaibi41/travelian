import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TravelersClassPicker } from "@/components/public/TravelersClassPicker";
import { UMRAH_DEPARTURE_CITIES, UMRAH_DURATIONS, UMRAH_TIERS, type UmrahOffer } from "@/data/services/umrah";
import { DEFAULT_UMRAH_SEARCH, UMRAH_ROOM_TYPES, type UmrahSearchValues } from "@/lib/umrah-search";

export function UmrahSearchBar({ value, onChange, onSearch, offers }: { value: UmrahSearchValues; onChange: (value: UmrahSearchValues) => void; onSearch: (value: UmrahSearchValues) => void; offers: UmrahOffer[] }) {
  const months = [...new Set(offers.map(offer => offer.departureDate?.slice(0, 7)).filter((month): month is string => !!month))].sort();
  const monthOptions = months.map(month => ({ value: month, label: new Date(`${month}-01T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) }));
  const fields = [
    { key: "city" as const, label: "Departure City", any: "Any city", options: [...new Set([...UMRAH_DEPARTURE_CITIES, ...offers.map(offer => offer.departureCity)])].map(city => ({ value: city, label: city })) },
    { key: "month" as const, label: "Travel Month", any: "Any month", options: monthOptions },
    { key: "tier" as const, label: "Package Type", any: "Any type", options: UMRAH_TIERS.map(tier => ({ value: tier, label: tier })) },
    { key: "room" as const, label: "Room Type", any: "Any room", options: UMRAH_ROOM_TYPES.filter(room => offers.some(offer => Number(offer.prices[room.value]) > 0)) },
  ];
  return <form noValidate aria-label="Umrah package search" className="space-y-4" onSubmit={event => { event.preventDefault(); onSearch(value); }}>
    <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {fields.map(field => <div key={field.key} className="min-w-0 space-y-1.5">
        <Label htmlFor={`umrah-search-${field.key}`} className="text-xs font-medium text-muted-foreground">{field.label}</Label>
        <Select value={value[field.key]} onValueChange={next => onChange({ ...value, [field.key]: next })}>
          <SelectTrigger id={`umrah-search-${field.key}`} aria-label={field.label} className="h-12 rounded-xl border-muted bg-muted/30"><SelectValue>{field.options.find(option => option.value === value[field.key])?.label || (value[field.key] === "any" ? field.any : value[field.key])}</SelectValue></SelectTrigger>
          <SelectContent><SelectItem value="any">{field.any}</SelectItem>{field.options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>)}
      <div className="min-w-0 space-y-1.5"><span id="umrah-travelers-label" className="text-xs font-medium text-muted-foreground">Travellers</span><TravelersClassPicker mode="travelers" value={value.travelers} onChange={travelers => onChange({ ...value, travelers })} className="h-12 rounded-xl border-muted bg-muted/30" /></div>
      <div className="min-w-0 space-y-1.5"><Label htmlFor="umrah-search-duration" className="text-xs font-medium text-muted-foreground">Duration</Label>
        <Select value={value.duration} onValueChange={duration => onChange({ ...value, duration })}><SelectTrigger id="umrah-search-duration" aria-label="Duration" className="h-12 rounded-xl border-muted bg-muted/30"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">Any duration</SelectItem>{UMRAH_DURATIONS.map(days => <SelectItem key={days} value={String(days)}>{days} Days</SelectItem>)}</SelectContent></Select>
      </div>
    </div>
    <p className="text-xs text-muted-foreground">Traveller preferences and final availability are confirmed by Travelian.</p>
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
      <a href="/umrah-packages#custom-umrah" className="inline-flex min-h-11 items-center justify-center rounded-md text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Request Custom Umrah</a>
      <Button type="button" variant="ghost" className="h-11 text-sm" onClick={() => { onChange(DEFAULT_UMRAH_SEARCH); onSearch(DEFAULT_UMRAH_SEARCH); }}>Clear search</Button>
      <Button type="submit" className="h-12 rounded-xl bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90"><Search className="mr-2 h-4 w-4" aria-hidden="true" />Search Umrah Packages</Button>
    </div>
  </form>;
}
