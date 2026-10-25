import { UMRAH_DURATIONS, UMRAH_TIERS, type UmrahOffer } from "@/data/services/umrah";
import type { TravelersValue } from "@/components/public/TravelersClassPicker";

export const UMRAH_ROOM_TYPES = [
  { value: "sharing", label: "Sharing" },
  { value: "quad", label: "Quad" },
  { value: "triple", label: "Triple" },
  { value: "double", label: "Double" },
] as const;
export type UmrahRoomType = typeof UMRAH_ROOM_TYPES[number]["value"];
export interface UmrahSearchValues {
  city: string;
  month: string;
  tier: string;
  room: "any" | UmrahRoomType;
  duration: string;
  travelers: TravelersValue;
}
export const DEFAULT_UMRAH_SEARCH: UmrahSearchValues = {
  city: "any", month: "any", tier: "any", room: "any", duration: "any",
  travelers: { adults: 1, children: 0, infants: 0, cabin: "Economy" },
};
export function parseUmrahSearch(params: URLSearchParams): UmrahSearchValues {
  const count = (key: string, fallback: number, min: number) => {
    const value = Number(params.get(key));
    return Number.isSafeInteger(value) && value >= min ? value : fallback;
  };
  const adults = count("adults", 1, 1);
  const room = params.get("room") || "any";
  const month = params.get("month") || "any";
  const tier = params.get("tier") || "any";
  const duration = params.get("duration") || "any";
  return {
    city: params.get("city") || "any", month: /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : "any",
    tier: UMRAH_TIERS.some(option => option === tier) ? tier : "any", duration: UMRAH_DURATIONS.some(days => String(days) === duration) ? duration : "any",
    room: UMRAH_ROOM_TYPES.some(option => option.value === room) ? room as UmrahRoomType : "any",
    travelers: { adults, children: count("children", 0, 0), infants: Math.min(adults, count("infants", 0, 0)), cabin: "Economy" },
  };
}
export function serializeUmrahSearch(value: UmrahSearchValues): URLSearchParams {
  return new URLSearchParams({ city: value.city, month: value.month, tier: value.tier, room: value.room,
    duration: value.duration, adults: String(value.travelers.adults), children: String(value.travelers.children), infants: String(value.travelers.infants) });
}
export function matchesUmrahPreferences(offer: UmrahOffer, search: Pick<UmrahSearchValues, "month" | "room">): boolean {
  if (search.month !== "any" && !offer.departureDate?.startsWith(`${search.month}-`)) return false;
  if (search.room !== "any" && !(Number(offer.prices[search.room]) > 0)) return false;
  return true;
}
