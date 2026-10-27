import { SearchShortcuts } from "../SearchShortcuts";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UMRAH_DEPARTURE_CITIES, UMRAH_DURATIONS, UMRAH_TIERS, type UmrahOffer } from "@/data/services/umrah";
import { type UmrahSearchValues } from "@/lib/umrah-search";

export function UmrahSearchBar({ value, onChange, onSearch, offers }: { value: UmrahSearchValues; onChange: (value: UmrahSearchValues) => void; onSearch: (value: UmrahSearchValues) => void; offers: UmrahOffer[] }) {
  const months = [...new Set(offers.map(offer => offer.departureDate?.slice(0, 7)).filter((month): month is string => !!month))].sort();
  const monthOptions = months.map(month => ({ value: month, label: new Date(`${month}-01T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) }));
  const fields = [
    { key: "city" as const, label: "Departure City", any: "Any city", options: [...new Set([...UMRAH_DEPARTURE_CITIES, ...offers.map(offer => offer.departureCity)])].map(city => ({ value: city, label: city })) },
    { key: "month" as const, label: "Travel Month", any: "Any month", options: monthOptions },
    { key: "tier" as const, label: "Package Type", any: "Any type", options: UMRAH_TIERS.map(tier => ({ value: tier, label: tier })) },
  ];
  return <form noValidate aria-label="Umrah package search" className="space-y-4" onSubmit={event => { event.preventDefault(); onSearch(value); }}>
    <SearchShortcuts label="Departure cities" options={[...new Set([...offers.map(offer => offer.departureCity), ...UMRAH_DEPARTURE_CITIES])].filter(Boolean).slice(0, 4)} value={value.city} onSelect={city => onChange({ ...value, city })} />
    <div className="umrah-search-fields grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
      {fields.map(field => <div key={field.key} className="min-w-0 space-y-1.5">
        <Label htmlFor={`umrah-search-${field.key}`} className="text-xs font-medium text-muted-foreground">{field.label}</Label>
        <Select value={value[field.key]} onValueChange={next => onChange({ ...value, [field.key]: next })}>
          <SelectTrigger id={`umrah-search-${field.key}`} aria-label={field.label} className="h-12 rounded-xl border-muted bg-muted/30"><SelectValue>{field.options.find(option => option.value === value[field.key])?.label || (value[field.key] === "any" ? field.any : value[field.key])}</SelectValue></SelectTrigger>
          <SelectContent><SelectItem value="any">{field.any}</SelectItem>{field.options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>)}
      <div className="min-w-0 space-y-1.5"><Label htmlFor="umrah-search-duration" className="text-xs font-medium text-muted-foreground">Duration</Label>
        <Select value={value.duration} onValueChange={duration => onChange({ ...value, duration })}><SelectTrigger id="umrah-search-duration" aria-label="Duration" className="h-12 rounded-xl border-muted bg-muted/30"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">Any duration</SelectItem>{UMRAH_DURATIONS.map(days => <SelectItem key={days} value={String(days)}>{days} Days</SelectItem>)}</SelectContent></Select>
      </div>
      <Button type="submit" className="unified-search-submit h-12 rounded-xl bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90 col-span-full lg:col-span-1"><Search className="mr-2 h-4 w-4" aria-hidden="true" />Search</Button>
    </div>
  </form>;
}
