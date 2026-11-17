import { describe, expect, it } from "vitest";
import { umrahOffers } from "@/data/services/umrah";
import { DEFAULT_UMRAH_SEARCH, matchesUmrahPreferences, parseUmrahSearch, serializeUmrahSearch } from "./umrah-search";

describe("Umrah discovery preferences", () => {
  it("round-trips committed search preferences without changing package records", () => {
    const search = { ...DEFAULT_UMRAH_SEARCH, city: "Lahore", month: "2030-01", room: "double" as const, tier: "Economy", duration: "15", travelers: { adults: 2, children: 1, infants: 1, cabin: "Economy" } };
    expect(parseUmrahSearch(serializeUmrahSearch(search))).toEqual(search);
  });
  it("safely defaults malformed counts and caps infants at adults", () => {
    const parsed = parseUmrahSearch(new URLSearchParams("adults=-1&children=NaN&infants=5&room=invalid"));
    expect(parsed.travelers).toEqual({ adults: 1, children: 0, infants: 1, cabin: "Economy" });
    expect(parsed.room).toBe("any");
  });
  it("does not exclude offers when month and room are unspecified", () => {
    expect(umrahOffers.every(offer => matchesUmrahPreferences(offer, DEFAULT_UMRAH_SEARCH))).toBe(true);
  });
  it("matches the actual departure month and excludes unknown dates for a specified month", () => {
    const offer = { ...umrahOffers[0], departureDate: "2030-01-10" };
    expect(matchesUmrahPreferences(offer, { month: "2030-01", room: "any" })).toBe(true);
    expect(matchesUmrahPreferences(offer, { month: "2030-02", room: "any" })).toBe(false);
    expect(matchesUmrahPreferences({ ...offer, departureDate: undefined }, { month: "2030-01", room: "any" })).toBe(false);
  });
  it("requires an existing published rate for the selected room without inventing availability", () => {
    const offer = { ...umrahOffers[0], prices: { sharing: 250000 } };
    expect(matchesUmrahPreferences(offer, { month: "any", room: "sharing" })).toBe(true);
    expect(matchesUmrahPreferences(offer, { month: "any", room: "double" })).toBe(false);
    expect(offer.prices).toEqual({ sharing: 250000 });
  });
});
