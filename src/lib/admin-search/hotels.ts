// Search > Hotels on the gateway (POST /v1/hotels/destinations, /v1/hotels/search). The search and its
// filters live in the URL. Prices, provider names and supplier cost come from the gateway as it decides
// per role; this file only builds requests, filters the list and formats what the gateway sent.

import { format, parseISO } from "date-fns";
import type { components } from "@/lib/gateway/schema";
import { gatewayPost, type GatewayOptions } from "@/lib/gateway/client";

type Schemas = components["schemas"];
export type HotelSearchView = Schemas["HotelSearchView"];
export type HotelView = Schemas["HotelView"];
export type HotelRateView = Schemas["HotelRateView"];
export type HotelMoney = Schemas["HotelMoney"];
export type DestinationView = Schemas["DestinationView"];

export const MAX_ROOMS = 9;
export const MAX_ADULTS_PER_ROOM = 6;
export const MAX_CHILDREN = 4;
export const MAX_NIGHTS = 30;
/** A child added in the Guests picker whose age hasn't been chosen yet (never sent or kept in the URL). */
export const NO_AGE = -1;
/** Mockup: Popular destinations. */
export const POPULAR_DESTINATIONS = ["Makkah", "Al Madinah", "Dubai", "Istanbul"] as const;

const UNAVAILABLE = "Hotel search isn't available right now. Try again in a few minutes.";
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export type StarFilter = "any" | "5" | "4" | "3" | "2" | "1";
export type PriceFilter = "any" | "under_100" | "100_250" | "250_500" | "over_500";
export type CancellationFilter = "any" | "free" | "non_refundable";

export interface HotelSearch {
  destination: string;
  /** Set when the destination was picked from the suggestions. */
  destinationKind?: "region" | "hotel";
  destinationId?: number;
  checkIn?: string;
  checkOut?: string;
  rooms: number;
  adults: number;
  /** One age (0-17) per child. */
  childAges: number[];
  stars: StarFilter;
  price: PriceFilter;
  cancellation: CancellationFilter;
}

export const EMPTY_HOTEL_SEARCH: HotelSearch = {
  destination: "", rooms: 1, adults: 2, childAges: [], stars: "any", price: "any", cancellation: "any",
};

const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

const int = (value: string | null, min: number, max: number, fallback: number) => {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
};

export function parseHotelSearch(params: URLSearchParams): HotelSearch {
  const rooms = int(params.get("rooms"), 1, MAX_ROOMS, 1);
  const kind = params.get("dk");
  const id = Number(params.get("did"));
  const checkIn = params.get("in") ?? "";
  const checkOut = params.get("out") ?? "";
  const ages = (params.get("ages") ?? "").split(",").filter(Boolean).map(Number)
    .filter(age => Number.isInteger(age) && age >= 0 && age <= 17).slice(0, MAX_CHILDREN);
  const known = (kind === "region" || kind === "hotel") && Number.isInteger(id) && id > 0;
  return {
    destination: (params.get("dest") ?? "").trim().slice(0, 120),
    destinationKind: known ? kind : undefined,
    destinationId: known ? id : undefined,
    checkIn: DATE.test(checkIn) ? checkIn : undefined,
    checkOut: DATE.test(checkOut) ? checkOut : undefined,
    rooms,
    adults: int(params.get("adults"), rooms, rooms * MAX_ADULTS_PER_ROOM, Math.max(2, rooms)),
    childAges: ages,
    stars: pick(params.get("stars"), ["any", "5", "4", "3", "2", "1"] as const, "any"),
    price: pick(params.get("price"), ["any", "under_100", "100_250", "250_500", "over_500"] as const, "any"),
    cancellation: pick(params.get("cancel"), ["any", "free", "non_refundable"] as const, "any"),
  };
}

const SEARCH_KEYS = ["dest", "dk", "did", "in", "out", "rooms", "adults", "ages", "stars", "price", "cancel"];

export function writeHotelSearch(params: URLSearchParams, search: HotelSearch): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const key of SEARCH_KEYS) next.delete(key);
  if (search.destination) next.set("dest", search.destination);
  if (search.destinationKind && search.destinationId) {
    next.set("dk", search.destinationKind);
    next.set("did", String(search.destinationId));
  }
  if (search.checkIn) next.set("in", search.checkIn);
  if (search.checkOut) next.set("out", search.checkOut);
  if (search.rooms !== 1) next.set("rooms", String(search.rooms));
  if (search.adults !== 2) next.set("adults", String(search.adults));
  if (search.childAges.length) next.set("ages", search.childAges.join(","));
  if (search.stars !== "any") next.set("stars", search.stars);
  if (search.price !== "any") next.set("price", search.price);
  if (search.cancellation !== "any") next.set("cancel", search.cancellation);
  return next;
}

export const nightsBetween = (checkIn?: string, checkOut?: string) =>
  checkIn && checkOut ? Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000) : 0;

/** Destination, both dates, check-out after check-in, at most 30 nights. */
export function stayProblem(search: HotelSearch): string | null {
  if (search.destination.trim().length < 2) return "Enter a destination.";
  if (!search.checkIn || !search.checkOut) return "Choose check-in and check-out dates.";
  const nights = nightsBetween(search.checkIn, search.checkOut);
  if (nights < 1) return "Check-out must be after check-in.";
  if (nights > MAX_NIGHTS) return `A stay can be at most ${MAX_NIGHTS} nights.`;
  if (search.childAges.some(age => age === NO_AGE)) return "Choose each child's age in Guests and rooms.";
  return null;
}

export const isCompleteHotelSearch = (search: HotelSearch) => stayProblem(search) === null;

/** Adults spread as evenly as possible over the rooms; children stay with the first room. */
export function roomsRequest(search: HotelSearch) {
  const base = Math.floor(search.adults / search.rooms);
  const extra = search.adults % search.rooms;
  return Array.from({ length: search.rooms }, (_, index) => ({
    adults: base + (index < extra ? 1 : 0),
    children_ages: index === 0 ? search.childAges : [],
  }));
}

export const guestsLabel = (search: Pick<HotelSearch, "adults" | "childAges" | "rooms">) => {
  const guests = search.adults + search.childAges.length;
  return `${guests} guest${guests === 1 ? "" : "s"}, ${search.rooms} room${search.rooms === 1 ? "" : "s"}`;
};

export const suggestDestinations = (query: string, options?: GatewayOptions) =>
  gatewayPost("/v1/hotels/destinations", { query }, { unavailableMessage: UNAVAILABLE, ...options });

export const searchHotels = (search: HotelSearch, options?: GatewayOptions) =>
  gatewayPost(
    "/v1/hotels/search",
    {
      destination: search.destination,
      destination_kind: search.destinationKind ?? null,
      destination_id: search.destinationId ?? null,
      check_in: search.checkIn!,
      check_out: search.checkOut!,
      rooms: roomsRequest(search),
    },
    { unavailableMessage: UNAVAILABLE, ...options },
  );

// ---------- filters (display only: over the rates the gateway returned) ----------

const PRICE_RANGES: Record<Exclude<PriceFilter, "any">, [number, number]> = {
  under_100: [0, 100], "100_250": [100, 250], "250_500": [250, 500], over_500: [500, Infinity],
};

export function priceOptions(currency?: string) {
  const unit = currency ?? "";
  const money = (value: number) => `${unit} ${value}`.trim();
  return [
    { value: "any", label: "Any" },
    { value: "under_100", label: `Under ${money(100)} a night` },
    { value: "100_250", label: `${money(100)}–${money(250)} a night` },
    { value: "250_500", label: `${money(250)}–${money(500)} a night` },
    { value: "over_500", label: `Over ${money(500)} a night` },
  ];
}

export const STAR_OPTIONS = [
  { value: "any", label: "Any" },
  ...[5, 4, 3, 2, 1].map(stars => ({ value: String(stars), label: `${stars} star${stars === 1 ? "" : "s"}` })),
];

export const CANCELLATION_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "free", label: "Free cancellation" },
  { value: "non_refundable", label: "Non-refundable" },
];

function rateMatches(rate: HotelRateView, search: HotelSearch) {
  if (search.cancellation === "free" && rate.cancellation !== "free_until") return false;
  if (search.cancellation === "non_refundable" && rate.cancellation !== "non_refundable") return false;
  if (search.price !== "any") {
    const [low, high] = PRICE_RANGES[search.price];
    const perNight = rate.per_night.amount_minor / 100;
    if (perNight < low || perNight >= high) return false;
  }
  return true;
}

export interface HotelRow {
  hotel: HotelView;
  /** The cheapest rate that passes the filters (the gateway sends rates cheapest first). */
  rate: HotelRateView;
}

export function hotelRows(hotels: HotelView[], search: HotelSearch): HotelRow[] {
  const rows: HotelRow[] = [];
  for (const hotel of hotels) {
    if (search.stars !== "any" && hotel.star_rating !== Number(search.stars)) continue;
    const rate = hotel.rates.find(item => rateMatches(item, search));
    if (rate) rows.push({ hotel, rate });
  }
  return rows;
}

// ---------- display ----------

/** "USD 96.00" (cents kept: hotel rates are often below 100); PKR as "Rs 12,500". */
export function hotelMoney(money: HotelMoney) {
  const whole = money.amount_minor / 100;
  if (money.currency === "PKR") return `Rs ${Math.round(whole).toLocaleString("en-PK")}`;
  return `${money.currency} ${whole.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** The supplier's free-cancellation time has no zone; RateHawk gives it in UTC. */
export function cancellationText(rate: HotelRateView) {
  if (rate.cancellation === "free_until" && rate.free_cancellation_until) {
    // Shown as the supplier's own wall time, labelled UTC (no conversion to the browser's zone).
    const when = parseISO(rate.free_cancellation_until.replace(/(Z|[+-]00:?00)$/, ""));
    if (Number.isFinite(when.getTime())) return `Free cancellation until ${format(when, "d MMM yyyy, HH:mm")} UTC`;
  }
  if (rate.cancellation === "non_refundable") return "Non-refundable";
  return "Cancellation charges apply";
}

export const hotelSubline = (hotel: HotelView) =>
  [hotel.star_rating ? `${hotel.star_rating} star${hotel.star_rating === 1 ? "" : "s"}` : null, hotel.city].filter(Boolean).join(" · ");
