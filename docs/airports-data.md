# Airport list (flight search suggestions)

`src/data/airports.json` feeds the From and To suggestions on Search > Flights
(`src/lib/admin-search/airports.ts`, `src/components/admin/search/AirportCombobox.tsx`).

- **Source:** a file Zohaib provided on 10 November 2026 (`airports (1).json`, 8,800 airports with
  iata, name, city, country, countryCode, type, lat, lng). **Its origin and licence are not
  recorded yet: Zohaib to confirm both** before go-live.
- **Trimmed copy:** keeps iata, name, city, country, countryCode and type; lat and lng are dropped,
  and entries without an IATA code are skipped (there were none). All 8,800 entries are kept:
  1,172 large, 3,397 medium, 4,231 small.
- **Size:** source 1,353,390 bytes; trimmed 1,103,150 bytes (about 161 kB gzipped as its own
  chunk). It is not in the main bundle: it starts loading when the Search page opens and is
  indexed once in memory; typing makes no request.
- **To refresh:** replace the file with the same six fields per airport (compact JSON), then run
  `npx vitest run src/lib/admin-search` and `PLAYWRIGHT_CHANNEL=chrome npx playwright test e2e/admin-airports.spec.ts`.
- The value sent to the gateway is still the 3-letter IATA code.
