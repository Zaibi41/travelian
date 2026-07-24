import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Airport } from "@/data/airports";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  className?: string;
  invalid?: boolean;
}

const popularAirports: Airport[] = [
  { code: "LHE", city: "Lahore", name: "Allama Iqbal International Airport", country: "PK" },
  { code: "KHI", city: "Karachi", name: "Jinnah International Airport", country: "PK" },
  { code: "ISB", city: "Islamabad", name: "Islamabad International Airport", country: "PK" },
  { code: "SKT", city: "Sialkot", name: "Sialkot International Airport", country: "PK" },
  { code: "PEW", city: "Peshawar", name: "Bacha Khan International Airport", country: "PK" },
  { code: "MUX", city: "Multan", name: "Multan International Airport", country: "PK" },
  { code: "DXB", city: "Dubai", name: "Dubai International Airport", country: "AE" },
  { code: "JED", city: "Jeddah", name: "King Abdulaziz International Airport", country: "SA" },
  { code: "MED", city: "Madinah", name: "Prince Mohammad Bin Abdulaziz Airport", country: "SA" },
  { code: "RUH", city: "Riyadh", name: "King Khalid International Airport", country: "SA" },
  { code: "IST", city: "Istanbul", name: "Istanbul Airport", country: "TR" },
  { code: "DOH", city: "Doha", name: "Hamad International Airport", country: "QA" },
  { code: "AUH", city: "Abu Dhabi", name: "Zayed International Airport", country: "AE" },
  { code: "LHR", city: "London", name: "Heathrow Airport", country: "GB" },
  { code: "MAN", city: "Manchester", name: "Manchester Airport", country: "GB" },
  { code: "JFK", city: "New York", name: "John F Kennedy International Airport", country: "US" },
  { code: "YYZ", city: "Toronto", name: "Toronto Pearson International Airport", country: "CA" },
  { code: "KUL", city: "Kuala Lumpur", name: "Kuala Lumpur International Airport", country: "MY" },
  { code: "BKK", city: "Bangkok", name: "Suvarnabhumi Airport", country: "TH" },
  { code: "SIN", city: "Singapore", name: "Singapore Changi Airport", country: "SG" },
];

const popularAirportByCode = new Map(popularAirports.map(airport => [airport.code, airport]));
let airportCache: Airport[] | null = null;
let airportCachePromise: Promise<Airport[]> | null = null;

function loadAirportDataset() {
  if (airportCache) return Promise.resolve(airportCache);
  if (!airportCachePromise) {
    airportCachePromise = import("@/data/airports").then(module => {
      airportCache = module.airports;
      return module.airports;
    });
  }
  return airportCachePromise;
}

function airportMatches(airport: Airport, search: string) {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return `${airport.code} ${airport.city} ${airport.name} ${airport.country}`.toLowerCase().includes(needle);
}

export function AirportCombobox({ value, onChange, placeholder = "Select airport", className, invalid }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [allAirports, setAllAirports] = useState<Airport[] | null>(airportCache);
  const [isLoadingAirports, setIsLoadingAirports] = useState(false);
  const [loadError, setLoadError] = useState("");
  const selected = allAirports?.find(airport => airport.code === value) || popularAirportByCode.get(value);
  const label = selected ? `${selected.code} - ${selected.city}` : value || placeholder;

  const loadFullAirports = () => {
    if (allAirports || isLoadingAirports) return;
    setIsLoadingAirports(true);
    setLoadError("");
    loadAirportDataset()
      .then(setAllAirports)
      .catch(() => setLoadError("Airport list could not load. Try searching again."))
      .finally(() => setIsLoadingAirports(false));
  };

  const shownAirports = useMemo(() => {
    const source = allAirports || popularAirports;
    const matches = source.filter(airport => airportMatches(airport, query));
    const popularMatches = popularAirports.filter(airport => airportMatches(airport, query));
    const seen = new Set<string>();

    return [...popularMatches, ...matches]
      .filter(airport => {
        if (seen.has(airport.code)) return false;
        seen.add(airport.code);
        return true;
      })
      .slice(0, query.trim() ? 80 : 24);
  }, [allAirports, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-12 min-w-0 w-full justify-between overflow-hidden rounded-xl border-muted bg-muted/30 px-3 text-left text-sm font-normal",
            !selected && !value && "text-muted-foreground",
            invalid && "border-destructive",
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <Plane className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{label}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(420px,calc(100vw-2rem))] p-0"
        align="start"
        side="bottom"
        sideOffset={8}
        avoidCollisions={false}
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={(nextQuery) => {
              setQuery(nextQuery);
              if (nextQuery.trim().length >= 2) loadFullAirports();
            }}
            placeholder="Search city, airport, or IATA code..."
          />
          <CommandList>
            {!isLoadingAirports && !loadError && shownAirports.length === 0 && <CommandEmpty>No airport found.</CommandEmpty>}
            <CommandGroup heading="Airports">
              {shownAirports.map((airport) => (
                <CommandItem
                  key={airport.code}
                  value={`${airport.code} ${airport.city} ${airport.name} ${airport.country}`}
                  onSelect={() => {
                    onChange(airport.code);
                    setOpen(false);
                  }}
                  className="gap-2"
                >
                  <Check className={cn("h-4 w-4", value === airport.code ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{airport.code}</span>
                      <span className="truncate">{airport.city}</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{airport.name} - {airport.country}</p>
                  </div>
                </CommandItem>
              ))}
              {isLoadingAirports && (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading full airport directory...
                </div>
              )}
              {loadError && (
                <div className="px-3 py-3 text-sm text-destructive">{loadError}</div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function getAirportDisplay(code: string) {
  const airport = airportCache?.find(item => item.code === code) || popularAirportByCode.get(code);
  return airport ? `${airport.city} (${airport.code})` : code;
}
