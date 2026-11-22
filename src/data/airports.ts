// One airport dataset for the public site and the admin (D36): src/data/airports.json (docs/airports-data.md), loaded
// once as its own chunk by the shared loader. This module only adapts it to the public picker's shape.
import { loadAirports, loadedAirports } from "@/lib/admin-search/airports";

export interface Airport {
  code: string;
  name: string;
  city: string;
  /** ISO 3166 alpha-2. */
  country: string;
}

const toPublic = (airport: { iata: string; name: string; city: string; countryCode: string }): Airport => ({
  code: airport.iata, name: airport.name, city: airport.city, country: airport.countryCode,
});

let all: Airport[] | null = null;

export async function loadPublicAirports(): Promise<Airport[]> {
  const index = await loadAirports();
  all ??= Array.from(index.byCode.values()).map(toPublic);
  return all;
}

/** The airport for a code once the list has loaded (call loadPublicAirports() first), else undefined. */
export function airportByCode(code: string): Airport | undefined {
  const found = loadedAirports()?.byCode.get(code.trim().toUpperCase());
  return found ? toPublic(found) : undefined;
}

/** City and country name (full words, e.g. "United Arab Emirates") for a code, from the same list; undefined before it loads. */
export function airportPlace(code: string): { code: string; city?: string; country?: string } | undefined {
  const found = loadedAirports()?.byCode.get(code.trim().toUpperCase());
  return found ? { code: found.iata.toUpperCase(), city: found.city?.trim() || undefined, country: found.country?.trim() || undefined } : undefined;
}
