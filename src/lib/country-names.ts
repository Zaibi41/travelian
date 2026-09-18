import { phoneCodes } from "@/data/phone-codes";

const phoneCodeMap = new Map<string, string>();
for (const item of phoneCodes) {
  if (item.iso && item.country) {
    phoneCodeMap.set(item.iso.toUpperCase(), item.country);
  }
}

let regionNames: Intl.DisplayNames | null = null;
try {
  if (typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function") {
    regionNames = new Intl.DisplayNames(["en"], { type: "region" });
  }
} catch {
  regionNames = null;
}

const countryNameCache = new Map<string, string>();

/**
 * Resolves an ISO 2-letter country code (or returns the given country string)
 * into a full English country name (e.g., 'IE' -> 'Ireland', 'US' -> 'United States', 'PK' -> 'Pakistan').
 */
export function getCountryName(isoCode?: string | null): string {
  if (!isoCode) return "";
  const code = isoCode.trim();
  if (!code) return "";

  const upper = code.toUpperCase();
  const cached = countryNameCache.get(upper);
  if (cached !== undefined) return cached;

  // 1. Try Intl.DisplayNames if valid 2-letter ISO
  if (regionNames && /^[A-Z]{2}$/.test(upper)) {
    try {
      const name = regionNames.of(upper);
      if (name) {
        countryNameCache.set(upper, name);
        return name;
      }
    } catch {
      // ignore and fallback
    }
  }

  // 2. Fallback to phoneCodes mapping
  const fallback = phoneCodeMap.get(upper);
  if (fallback) {
    countryNameCache.set(upper, fallback);
    return fallback;
  }

  // 3. If it's already a full country name or unknown code, return as-is
  countryNameCache.set(upper, code);
  return code;
}

/**
 * Formats an airport name and country into a clean subtitle string:
 * e.g., ("Dublin Airport", "IE") -> "Dublin Airport, Ireland"
 */
export function formatAirportSubtitle(airportName?: string | null, countryCode?: string | null): string {
  const name = airportName?.trim() || "";
  const country = getCountryName(countryCode);

  if (name && country) {
    if (name.toLowerCase().endsWith(country.toLowerCase())) {
      return name;
    }
    return `${name}, ${country}`;
  }

  return name || country;
}
