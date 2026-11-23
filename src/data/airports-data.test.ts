import { describe, expect, it } from "vitest";
import airports from "./airports.json";
import { buildIndex, searchAirports, type Airport } from "@/lib/admin-search/airports";

// #39: the shared airport list names the city an airport serves, so "ATH" reads "Athens", not the municipality
// (Spata-Artemida) the airport stands in. Data only: the search and ranking code is unchanged.
const list = airports as Airport[];
const index = buildIndex(list);

describe("airport data: city names (#39)", () => {
  it("ATH is Athens, Greece", () => {
    const ath = list.find(airport => airport.iata === "ATH");
    expect(ath).toMatchObject({ city: "Athens", country: "Greece", name: "Athens Eleftherios Venizelos International Airport" });
    expect(list.some(airport => airport.city === "Spata-Artemida")).toBe(false);
  });

  it("searching ATH or Athens finds it under Athens", () => {
    expect(searchAirports(index, "ATH")[0]).toMatchObject({ iata: "ATH", city: "Athens" });
    expect(searchAirports(index, "athens").map(airport => airport.iata)).toContain("ATH");
  });
});
