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
  /** Place in POPULAR_AIRPORT_CODES (the main airports), or a large number. */
  popular: number;
  pakistan: boolean;
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

// Military and other non-commercial fields (#157): an air base, air force base, army or naval air field, RAF station
// and the like, unless the name also says it is an airport or a civil terminal (joint-use fields such as "Baghdad
// International Airport / New Al Muthana Air Base" stay). Not offered in search; a code already chosen still shows.
const MILITARY = /\b(air ?base|air force|afb|naval|navy|army|military|raf|rmaf|marine corps|air station|heliport|jasdf|jmsdf)\b/i;
const CIVIL = /\b(airport|international|civil)\b/i;
export const isCommercialAirport = (airport: Pick<Airport, "name">) => !MILITARY.test(airport.name) || CIVIL.test(airport.name);

const POPULAR_RANK = new Map<string, number>();
const toEntry = (airport: Airport): Entry => ({
  airport,
  iata: airport.iata.toLowerCase(),
  city: normalize(airport.city),
  name: normalize(airport.name),
  country: normalize(airport.country),
  size: SIZE[airport.type] ?? 3,
  popular: POPULAR_RANK.get(airport.iata.toUpperCase()) ?? 999,
  pakistan: airport.countryCode === "PK",
});

export function buildIndex(airports: Airport[]): AirportIndex {
  const entries = airports.filter(isCommercialAirport).map(toEntry);
  return { entries, byCode: new Map(airports.map(airport => [airport.iata.toUpperCase(), airport])) };
}

/** Match tier (lower is better), or -1 for no match. */
function tier(entry: Entry, q: string) {
  if (entry.iata === q && entry.size <= 1) return 0;                // exact code of a large or medium airport
  if (entry.iata === q) return 2;                                   // a small airport's exact code: with the city matches, after larger airports
  if (entry.city.startsWith(q)) return 2;                           // city starts with the text
  if (entry.city.includes(` ${q}`) || entry.city.includes(`(${q}`)) return 2; // a later word of the city ("Pendik, Istanbul")
  if (entry.iata.startsWith(q)) return 3;                           // IATA code from 2 letters ("lh" -> LHE)
  if (entry.name.includes(q)) return 4;                             // airport name contains the text
  if (entry.country.startsWith(q) || entry.country.includes(` ${q}`)) return 5; // country
  return -1;
}

function rank(entries: Entry[], q: string, limit: number): Airport[] {
  const found: { entry: Entry; tier: number }[] = [];
  for (const entry of entries) {
    const level = tier(entry, q);
    if (level >= 0) found.push({ entry, tier: level });
  }
  const exact = (entry: Entry) => (entry.iata === q ? 0 : 1);
  const sameCity = (entry: Entry) => (entry.city === q ? 0 : 1);
  found.sort((a, b) => a.tier - b.tier
    || a.entry.popular - b.entry.popular                       // main airports first ("dub" -> DXB, "lah" -> LHE)
    || Number(b.entry.pakistan) - Number(a.entry.pakistan)     // then Pakistan's
    || sameCity(a.entry) - sameCity(b.entry)                   // "Dubai" before "Dubai(Jebel Ali)"
    || a.entry.size - b.entry.size || exact(a.entry) - exact(b.entry)
    || a.entry.city.localeCompare(b.entry.city) || a.entry.iata.localeCompare(b.entry.iata));
  return found.slice(0, limit).map(item => item.entry.airport);
}

/** The one airport ranking for every From / To field (admin and website, dropdown and phone picker, #157), at most
 *  `limit` airports: exact code (large or medium airport), then city prefix (a small airport's exact code sits here),
 *  IATA prefix, airport name, country. Within a tier: the main (popular) airports, then Pakistan's, then an exact city
 *  name, then larger airports. Military fields are not in the index. From 2 characters. */
export function searchAirports(index: AirportIndex, query: string, limit = MAX_RESULTS): Airport[] {
  const q = normalize(query);
  if (q.length < MIN_QUERY) return [];
  return rank(index.entries, q, limit);
}

/** The same ranking over a short list (e.g. the popular airports before the full list has loaded), from 1 character. */
export function rankAirports(airports: Airport[], query: string, limit = MAX_RESULTS): Airport[] {
  const q = normalize(query);
  if (!q) return [];
  return rank(airports.filter(isCommercialAirport).map(toEntry), q, limit);
}

/** Shown when the field is opened before typing: the same airports, in the same order, as the
 *  public site's From and To list. Codes missing from the list are skipped. */
export const POPULAR_AIRPORT_CODES = [
  "LHE", "KHI", "ISB", "SKT", "PEW", "MUX", "DXB", "JED", "MED", "RUH", "IST", "DOH",
  "AUH", "ATH", "LHR", "MAN", "JFK", "YYZ", "KUL", "BKK", "SIN",
];
POPULAR_AIRPORT_CODES.forEach((code, place) => POPULAR_RANK.set(code, place));

export function popularAirports(index: AirportIndex): Airport[] {
  return POPULAR_AIRPORT_CODES.flatMap(code => index.byCode.get(code) ?? []);
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
