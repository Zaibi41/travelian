# Airport list (flight search suggestions)

`src/data/airports.json` is the **only** airport dataset (D36, 19 November 2026). It feeds the From and To suggestions on
Search > Flights (`src/lib/admin-search/airports.ts`, `src/components/admin/search/AirportCombobox.tsx`) and the public
site (`src/data/airports.ts` adapts it for `src/components/public/AirportCombobox.tsx` and the route labels). The old
public copy (8,804 airports) was removed; its 15 airports missing here (e.g. BNP Bannu, CWP Campbellpore, PBI Palm
Beach) were added (8,815 now); its one "[Duplicate]" entry was not.

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
- Clicking or focusing From/To before typing lists the popular airports (`POPULAR_AIRPORT_CODES`,
  the same 21 as the public site, in the same order); from 2 characters the full list is searched.
