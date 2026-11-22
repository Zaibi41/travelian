// Flight results filters and sort kept in the URL (AGENTS.md: "filters kept in the URL"), #150.
// Repeated keys hold the chosen values: ?stop=nonstop&stop=1stop&dep=morning&bag=7%2B20+kg&airline=Emirates&sort=duration-asc
// Price is only written when narrowed: ?pmin=0&pmax=90000 (whole rupees, as the slider shows them).

export const FLIGHT_SORTS = [
  { value: "price-asc", label: "Price - Low to High", short: "Cheapest" },
  { value: "price-desc", label: "Price - High to Low", short: "Highest price" },
  { value: "duration-asc", label: "Shortest Duration", short: "Shortest" },
  { value: "duration-desc", label: "Longest Duration", short: "Longest" },
  { value: "departure-asc", label: "Departure - Early to Late", short: "Earliest" },
] as const;
export type FlightSort = (typeof FLIGHT_SORTS)[number]["value"];
export const DEFAULT_FLIGHT_SORT: FlightSort = "price-asc";

const STOPS = ["nonstop", "1stop", "2plus"];
const DEPARTURES = ["early", "morning", "afternoon", "evening"];

export type FlightResultFilters = {
  stops: string[];
  departureTimes: string[];
  baggage: string[];
  airlines: string[];
  sort: FlightSort;
  /** [min, max] when the URL narrows the price, else null (the full range of the results). */
  price: [number, number] | null;
};

/** The URL keys this module owns (everything else in the query is left alone). */
export const FILTER_PARAM_KEYS = ["stop", "dep", "bag", "airline", "sort", "pmin", "pmax"] as const;

const unique = (values: string[]) => [...new Set(values.map(value => value.trim()).filter(Boolean))];
const wholeNumber = (value: string | null) => (value !== null && /^\d+$/.test(value.trim()) ? Number(value) : null);

export function filtersFromParams(params: URLSearchParams): FlightResultFilters {
  const sort = params.get("sort");
  const pmin = wholeNumber(params.get("pmin"));
  const pmax = wholeNumber(params.get("pmax"));
  return {
    stops: unique(params.getAll("stop")).filter(value => STOPS.includes(value)),
    departureTimes: unique(params.getAll("dep")).filter(value => DEPARTURES.includes(value)),
    baggage: unique(params.getAll("bag")),
    airlines: unique(params.getAll("airline")),
    sort: FLIGHT_SORTS.some(option => option.value === sort) ? (sort as FlightSort) : DEFAULT_FLIGHT_SORT,
    price: pmin !== null || pmax !== null ? [pmin ?? 0, Math.max(pmax ?? Number.MAX_SAFE_INTEGER, pmin ?? 0)] : null,
  };
}

/** `params` with the filter keys replaced by `filters` (the default sort and a full price range are not written). */
export function withFilterParams(params: URLSearchParams, filters: FlightResultFilters): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const key of FILTER_PARAM_KEYS) next.delete(key);
  for (const value of filters.stops) next.append("stop", value);
  for (const value of filters.departureTimes) next.append("dep", value);
  for (const value of filters.baggage) next.append("bag", value);
  for (const value of filters.airlines) next.append("airline", value);
  if (filters.sort !== DEFAULT_FLIGHT_SORT) next.set("sort", filters.sort);
  if (filters.price) {
    next.set("pmin", String(Math.round(filters.price[0])));
    next.set("pmax", String(Math.round(filters.price[1])));
  }
  return next;
}

/** How many filters are chosen (the badge on the phone Filters button); a narrowed price counts as one. */
export function activeFilterCount(filters: Omit<FlightResultFilters, "sort">): number {
  return filters.stops.length + filters.departureTimes.length + filters.baggage.length + filters.airlines.length + (filters.price ? 1 : 0);
}

export const sortShortLabel = (sort: string) => FLIGHT_SORTS.find(option => option.value === sort)?.short ?? "Cheapest";
