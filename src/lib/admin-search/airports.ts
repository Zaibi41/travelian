// Airport suggestions for flight search origin and destination. The list lives in the frontend
// (src/data/airports.json, docs/airports-data.md): it starts loading when the Search page opens,
// is indexed once in memory, and every keystroke searches it synchronously with no network call.

export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  /** large, medium, small: larger airports rank first among equal matches. */
  type: string;
}

interface Entry {
  airport: Airport;
  iata: string;
  city: string;
  name: string;
  country: string;
  size: number;
}

export interface AirportIndex {
  entries: Entry[];
  byCode: Map<string, Airport>;
}

export const MIN_QUERY = 2;
export const MAX_RESULTS = 8;
const SIZE: Record<string, number> = { large: 0, medium: 1, small: 2 };

/** Lower case, accents removed, spaces collapsed: "  São  Paulo " -> "sao paulo". */
export function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function buildIndex(airports: Airport[]): AirportIndex {
  const entries = airports.map(airport => ({
    airport,
    iata: airport.iata.toLowerCase(),
    city: normalize(airport.city),
    name: normalize(airport.name),
    country: normalize(airport.country),
    size: SIZE[airport.type] ?? 3,
  }));
  return { entries, byCode: new Map(airports.map(airport => [airport.iata.toUpperCase(), airport])) };
}

/** Match tier (lower is better), or -1 for no match. */
function tier(entry: Entry, q: string) {
  if (entry.iata === q) return 0;                                   // exact IATA code
  if (entry.city.startsWith(q)) return 2;                           // city starts with the text
  if (entry.iata.startsWith(q)) return 3;                           // IATA code from 2 letters ("lh" -> LHE)
  if (entry.name.includes(q)) return 4;                             // airport name contains the text
  if (entry.country.startsWith(q) || entry.country.includes(` ${q}`)) return 5; // country
  return -1;
}

/** At most 8 airports: exact IATA, then city, then IATA prefix, airport name, country; larger airports first within a tier. */
export function searchAirports(index: AirportIndex, query: string, limit = MAX_RESULTS): Airport[] {
  const q = normalize(query);
  if (q.length < MIN_QUERY) return [];
  const found: { entry: Entry; tier: number }[] = [];
  for (const entry of index.entries) {
    const rank = tier(entry, q);
    if (rank >= 0) found.push({ entry, tier: rank });
  }
  found.sort((a, b) => a.tier - b.tier || a.entry.size - b.entry.size || a.entry.city.localeCompare(b.entry.city) || a.entry.iata.localeCompare(b.entry.iata));
  return found.slice(0, limit).map(item => item.entry.airport);
}

let ready: AirportIndex | null = null;
let loading: Promise<AirportIndex> | null = null;

/** Starts loading the list once (its own chunk, fetched with the Search page) and indexes it once. */
export function loadAirports(): Promise<AirportIndex> {
  loading ??= import("@/data/airports.json").then(module => {
    ready = buildIndex(module.default as Airport[]);
    return ready;
  });
  return loading;
}

/** The index if it has finished loading, else null. */
export const loadedAirports = () => ready;
