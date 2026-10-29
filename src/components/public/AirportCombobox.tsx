import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2, PlaneLanding, PlaneTakeoff } from "lucide-react";
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
import { formatAirportSubtitle, getCountryName } from "@/lib/country-names";
import { cn } from "@/lib/utils";

interface Props {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  className?: string;
  invalid?: boolean;
  iconVariant?: "departure" | "arrival";
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
  { code: "ISL", city: "Istanbul", name: "Istanbul Atatürk Airport", country: "TR" },
  { code: "DOH", city: "Doha", name: "Hamad International Airport", country: "QA" },
  { code: "AUH", city: "Abu Dhabi", name: "Zayed International Airport", country: "AE" },
  { code: "ATH", city: "Athens", name: "Athens International Airport", country: "GR" },
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

/** Prefer curated commercial city labels over geographic municipality names in the raw dataset. */
function resolveAirport(airport: Airport): Airport {
  return popularAirportByCode.get(airport.code) ?? airport;
}

function loadAirportDataset() {
  if (airportCache) return Promise.resolve(airportCache);
  if (!airportCachePromise) {
    airportCachePromise = import("@/data/airports").then(module => {
      airportCache = module.airports.map(resolveAirport);
      return airportCache;
    });
  }
  return airportCachePromise;
}

function airportMatchScore(airport: Airport, search: string) {
  const needle = search.trim().toLowerCase();
  if (!needle) return 0;
  const code = airport.code.toLowerCase();
  const city = airport.city.toLowerCase();
  const name = airport.name.toLowerCase();
  const countryCode = airport.country.toLowerCase();
  const countryName = getCountryName(airport.country).toLowerCase();
  if (code === needle) return 0;
  if (code.startsWith(needle)) return 1;
  if (city.startsWith(needle)) return 2;
  if (name.startsWith(needle)) return 3;
  if (countryName.startsWith(needle) || countryCode.startsWith(needle)) return 4;
  if (city.includes(needle)) return 5;
  if (name.includes(needle)) return 6;
  if (countryName.includes(needle)) return 7;
  return Number.POSITIVE_INFINITY;
}

export function AirportCombobox({ id, value, onChange, placeholder = "Select airport", className, invalid, iconVariant = "departure" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [allAirports, setAllAirports] = useState<Airport[] | null>(airportCache);
  const [isLoadingAirports, setIsLoadingAirports] = useState(false);
  const [loadError, setLoadError] = useState("");
  const matchedAirport = allAirports?.find(airport => airport.code === value);
  const selected = (matchedAirport ? resolveAirport(matchedAirport) : undefined) || popularAirportByCode.get(value);
  const FieldIcon = iconVariant === "departure" ? PlaneTakeoff : PlaneLanding;
  const label = selected ? `${selected.code} ${selected.city}` : value || placeholder;

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
    const trimmedQuery = query.trim();
    const matches = source
      .map(airport => ({ airport, score: airportMatchScore(airport, trimmedQuery) }))
      .filter(({ score }) => Number.isFinite(score))
      .sort((a, b) => a.score - b.score || a.airport.code.localeCompare(b.airport.code))
      .map(({ airport }) => airport);
    const popularMatches = trimmedQuery
      ? []
      : popularAirports;
    const seen = new Set<string>();

    return [...popularMatches, ...matches]
      .filter(airport => {
        if (seen.has(airport.code)) return false;
        seen.add(airport.code);
        return true;
      })
      .slice(0, trimmedQuery ? 80 : 24);
  }, [allAirports, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
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
            <FieldIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{label}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        style={{ overflowY: "hidden" }}
        className="flex flex-col max-h-[min(var(--radix-popover-content-available-height),24rem)] w-[var(--radix-popover-trigger-width)] min-w-[min(20rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden p-0"
        align="start"
        side="bottom"
        sideOffset={8}
        collisionPadding={16}
      >
        <Command shouldFilter={false} className="h-auto min-h-0 [&_[cmdk-input-wrapper]]:shrink-0">
          <CommandInput
            value={query}
            onValueChange={(nextQuery) => {
              setQuery(nextQuery);
              if (nextQuery.trim().length >= 2) loadFullAirports();
            }}
            placeholder="Search city, airport, or IATA code..."
          />
          <CommandList className="min-h-0 max-h-[min(calc(var(--radix-popover-content-available-height)-3.25rem),20rem)]">
            {!isLoadingAirports && !loadError && shownAirports.length === 0 && <CommandEmpty>No airport found.</CommandEmpty>}
            <CommandGroup heading="Airports">
              {shownAirports.map((airport) => {
                const countryName = getCountryName(airport.country);
                const subtitle = formatAirportSubtitle(airport.name, airport.country);
                return (
                  <CommandItem
                    key={airport.code}
                    value={`${airport.code} ${airport.city} ${airport.name} ${countryName} ${airport.country}`}
                    onSelect={() => {
                      onChange(airport.code);
                      setOpen(false);
                    }}
                    className="min-w-0 gap-2"
                  >
                    <Check className={cn("h-4 w-4", value === airport.code ? "opacity-100" : "opacity-0")} />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 font-semibold">{airport.code}</span>
                        <span className="truncate">{airport.city}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
                    </div>
                  </CommandItem>
                );
              })}
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
  const matched = airportCache?.find(item => item.code === code);
  const airport = (matched ? resolveAirport(matched) : undefined) || popularAirportByCode.get(code);
  return airport ? `${airport.code} ${airport.city}` : code;
}
