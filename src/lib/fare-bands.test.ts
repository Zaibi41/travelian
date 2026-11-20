import { describe, expect, it } from "vitest";
import { classifyFares, formatFare } from "./fare-bands";

// #55: Low = within 10% of the cheapest, High = 25% or more above it, Avg = in between; all within 5%: one band.
const bandsOf = (...amounts: number[]) => [...classifyFares(amounts.map((amount, index) => [`d${index}`, amount] as const)).bands.values()];

describe("fare calendar colours", () => {
  it("Low up to exactly 10% above the cheapest, Avg just over it", () => {
    expect(bandsOf(10_000, 11_000, 11_001, 20_000)).toEqual(["low", "low", "avg", "high"]);
  });

  it("High from exactly 25% above the cheapest, Avg just under it", () => {
    expect(bandsOf(10_000, 12_499, 12_500, 30_000)).toEqual(["low", "avg", "high", "high"]);
  });

  it("all prices within 5% of each other: one band (Low), even where the 10% rule alone would differ", () => {
    const result = classifyFares([["a", 10_000], ["b", 10_300], ["c", 10_500]]);
    expect(result.uniform).toBe(true);
    expect([...result.bands.values()]).toEqual(["low", "low", "low"]);
  });

  it("just over 5% apart is not uniform", () => {
    const result = classifyFares([["a", 10_000], ["b", 10_501]]);
    expect(result.uniform).toBe(false);
    expect([...result.bands.values()]).toEqual(["low", "low"]); // 10,501 is still within 10%
  });

  it("a single price is Low and the cheapest", () => {
    expect(classifyFares([["a", 1_850_000]])).toEqual({ bands: new Map([["a", "low"]]), cheapest: 1_850_000, uniform: true });
  });

  it("equal prices are all Low", () => {
    expect(bandsOf(5_000, 5_000, 5_000)).toEqual(["low", "low", "low"]);
  });

  it("no prices: no bands and no cheapest", () => {
    expect(classifyFares([])).toEqual({ bands: new Map(), cheapest: null, uniform: false });
  });

  it("the legend amount is shown as Rs with thousands separators", () => {
    expect(formatFare(1_850_000)).toBe("Rs 18,500");
    expect(formatFare(40_000, "SAR")).toBe("SAR 400");
  });
});
