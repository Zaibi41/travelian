import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
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
    airportCachePromise = import("@/data/airports").then(module => module.loadPublicAirports()).then(list => {
      airportCache = list.map(resolveAirport);
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
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const pointerFocus = useRef(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();
  const fieldRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [allAirports, setAllAirports] = useState<Airport[] | null>(airportCache);
  const [isLoadingAirports, setIsLoadingAirports] = useState(false);
  const [loadError, setLoadError] = useState("");
  const matchedAirport = allAirports?.find(airport => airport.code === value);
  const selected = (matchedAirport ? resolveAirport(matchedAirport) : undefined) || popularAirportByCode.get(value);
  const FieldIcon = iconVariant === "departure" ? PlaneTakeoff : PlaneLanding;
  const label = selected ? `${selected.code} ${selected.city}` : value;

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

  useEffect(() => { setActiveIndex(0); }, [query, open]);
  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-active="true"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const selectAirport = (airport: Airport) => {
    onChange(airport.code);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={fieldRef} className={cn(
          "flex h-12 min-w-0 w-full items-center gap-2 rounded-xl border border-muted-foreground/80 bg-muted/30 px-3 text-sm",
          keyboardFocus && "ring-2 ring-ring ring-offset-2",
          invalid && "border-destructive", className,
        )}>
          <FieldIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            id={id}
            role="combobox"
            aria-label={placeholder}
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open && shownAirports[activeIndex] ? `${listId}-${shownAirports[activeIndex].code}` : undefined}
            aria-invalid={invalid || undefined}
            autoComplete="off"
            style={{ outline: "none" }}
            placeholder={placeholder}
            value={open ? query : label}
            onPointerDown={() => { pointerFocus.current = true; setKeyboardFocus(false); }}
            onFocus={() => { setKeyboardFocus(!pointerFocus.current); pointerFocus.current = false; setQuery(""); setOpen(true); }}
            onBlur={() => { setKeyboardFocus(false); pointerFocus.current = false; }}
            onClick={() => setOpen(true)}
            onChange={event => {
              setQuery(event.target.value);
              setOpen(true);
              if (event.target.value.trim().length >= 2) loadFullAirports();
            }}
            onKeyDown={event => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                if (!open) { setOpen(true); return; }
                setActiveIndex(current => Math.max(0, Math.min(shownAirports.length - 1, current + (event.key === "ArrowDown" ? 1 : -1))));
              } else if (event.key === "Enter" && open) {
                event.preventDefault();
                if (shownAirports[activeIndex]) selectAirport(shownAirports[activeIndex]);
              } else if (event.key === "Escape" && open) {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
              } else if (event.key === "Tab") setOpen(false);
            }}
            className="h-full min-w-0 flex-1 truncate !border-0 !bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
          <ChevronsUpDown aria-hidden="true" className="pointer-events-none h-4 w-4 shrink-0 opacity-50" />
        </div>
      </PopoverAnchor>
      <PopoverContent data-scroll-into-view=""
        onOpenAutoFocus={event => event.preventDefault()}
        onCloseAutoFocus={event => event.preventDefault()}
        onInteractOutside={event => { if (fieldRef.current?.contains(event.target as Node)) event.preventDefault(); }}
        style={{ overflowY: "hidden" }}
        className="flex flex-col w-[var(--radix-popover-trigger-width)] min-w-[min(20rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] p-0"
        align="start"
        sideOffset={8}
      >
        <div ref={listRef} id={listId} role="listbox" aria-label="Airports" className="min-h-0 max-h-80 flex-1 overflow-y-auto p-1">
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Airports</p>
          {!isLoadingAirports && !loadError && shownAirports.length === 0 && <p className="py-6 text-center text-sm">No airport found.</p>}
          {shownAirports.map((airport, index) => (
            <button
              key={airport.code}
              id={`${listId}-${airport.code}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              data-active={activeIndex === index}
              tabIndex={-1}
              onMouseDown={event => event.preventDefault()}
              onClick={() => selectAirport(airport)}
              onPointerMove={() => setActiveIndex(index)}
              className={cn("flex w-full min-w-0 items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm", activeIndex === index && "bg-accent text-accent-foreground")}
            >
              <Check aria-hidden="true" className={cn("h-4 w-4 shrink-0", value === airport.code ? "opacity-100" : "opacity-0")} />
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-2"><span className="shrink-0 font-semibold">{airport.code}</span><span className="truncate">{airport.city}</span></span>
                <span className="block truncate text-xs text-muted-foreground">{formatAirportSubtitle(airport.name, airport.country)}</span>
              </span>
            </button>
          ))}
          {isLoadingAirports && <div role="status" className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Loading full airport directory...</div>}
          {loadError && <p role="status" className="px-3 py-3 text-sm text-destructive">{loadError}</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function getAirportDisplay(code: string) {
  const matched = airportCache?.find(item => item.code === code);
  const airport = (matched ? resolveAirport(matched) : undefined) || popularAirportByCode.get(code);
  return airport ? `${airport.code} ${airport.city}` : code;
}
