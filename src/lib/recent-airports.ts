// Airports the traveller (or agent) chose before, newest first, shown as "Recent searches" in the phone airport
// picker. Kept in this browser only (localStorage); a blocked or full storage simply means no recent list.

export interface RecentAirport {
  code: string;
  city: string;
  name: string;
  country?: string;
}

export const MAX_RECENT_AIRPORTS = 5;
const keyFor = (scope: "public" | "admin") => `travelian.recentAirports.${scope}.v1`;

export function readRecentAirports(scope: "public" | "admin"): RecentAirport[] {
  try {
    const raw = window.localStorage.getItem(keyFor(scope));
    const list: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list
      .filter((item): item is RecentAirport => !!item && typeof item.code === "string" && /^[A-Z]{3}$/.test(item.code)
        && typeof item.city === "string" && typeof item.name === "string")
      .slice(0, MAX_RECENT_AIRPORTS);
  } catch {
    return [];
  }
}

export function rememberRecentAirport(scope: "public" | "admin", airport: RecentAirport) {
  try {
    const entry: RecentAirport = { code: airport.code, city: airport.city, name: airport.name, ...(airport.country ? { country: airport.country } : {}) };
    const next = [entry, ...readRecentAirports(scope).filter(item => item.code !== entry.code)].slice(0, MAX_RECENT_AIRPORTS);
    window.localStorage.setItem(keyFor(scope), JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode, blocked or full): nothing to remember.
  }
}
