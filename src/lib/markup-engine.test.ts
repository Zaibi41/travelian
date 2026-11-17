import { describe, expect, it } from "vitest";
import { calculateSellingPrice } from "@/lib/markup-engine";

describe("calculateSellingPrice", () => {
  it("supports a signed PKR adjustment", () => {
    const pricing = calculateSellingPrice(25_000, { percentage: 0, fixedAmount: -500, minimumMargin: 0 });

    expect(pricing.finalSellingPrice).toBe(24_500);
    expect(pricing.markupAmount).toBe(-500);
    expect(pricing.profit).toBe(-500);
  });

  it("preserves a configured minimum margin", () => {
    const pricing = calculateSellingPrice(25_000, { percentage: 0, fixedAmount: -500, minimumMargin: 750 });

    expect(pricing.finalSellingPrice).toBe(25_750);
  });
});
