import { describe, expect, it } from "vitest";
import { activeFilterCount, DEFAULT_FLIGHT_SORT, filtersFromParams, sortShortLabel, withFilterParams } from "./flight-result-filters";

describe("flight result filters in the URL (#150)", () => {
  it("reads repeated keys, drops unknown values and duplicates", () => {
    const filters = filtersFromParams(new URLSearchParams("stop=nonstop&stop=nonstop&stop=9stops&dep=morning&dep=night&bag=7%2B20+kg&airline=Emirates&airline=Qatar+Airways&sort=duration-asc"));
    expect(filters).toEqual({
      stops: ["nonstop"], departureTimes: ["morning"], baggage: ["7+20 kg"], airlines: ["Emirates", "Qatar Airways"], sort: "duration-asc", price: null,
    });
  });

  it("falls back to the default sort and no price filter", () => {
    const filters = filtersFromParams(new URLSearchParams("from=LHE&sort=nonsense&pmin=abc"));
    expect(filters.sort).toBe(DEFAULT_FLIGHT_SORT);
    expect(filters.price).toBeNull();
  });

  it("reads a price range; a max under the min becomes the min", () => {
    expect(filtersFromParams(new URLSearchParams("pmin=1000&pmax=90000")).price).toEqual([1000, 90000]);
    expect(filtersFromParams(new URLSearchParams("pmin=5000&pmax=10")).price).toEqual([5000, 5000]);
    expect(filtersFromParams(new URLSearchParams("pmax=20000")).price).toEqual([0, 20000]);
  });

  it("writes only filter keys, keeps the search, skips the default sort", () => {
    const base = new URLSearchParams("from=LHE&to=DXB&stop=2plus&sort=price-desc");
    const next = withFilterParams(base, { stops: ["nonstop"], departureTimes: [], baggage: [], airlines: ["Airblue, Ltd"], sort: "price-asc", price: null });
    expect(next.toString()).toBe("from=LHE&to=DXB&stop=nonstop&airline=Airblue%2C+Ltd");
    expect(base.get("stop")).toBe("2plus"); // the input is not changed
  });

  it("round-trips", () => {
    const filters = { stops: ["1stop"], departureTimes: ["evening"], baggage: ["No Baggage"], airlines: ["PIA"], sort: "departure-asc" as const, price: [0, 50000] as [number, number] };
    expect(filtersFromParams(withFilterParams(new URLSearchParams(), filters))).toEqual(filters);
  });

  it("counts active filters and names the sort", () => {
    expect(activeFilterCount({ stops: ["nonstop"], departureTimes: [], baggage: ["x"], airlines: ["A", "B"], price: [0, 1] })).toBe(5);
    expect(activeFilterCount({ stops: [], departureTimes: [], baggage: [], airlines: [], price: null })).toBe(0);
    expect(sortShortLabel("duration-asc")).toBe("Shortest");
    expect(sortShortLabel("unknown")).toBe("Cheapest");
  });
});
