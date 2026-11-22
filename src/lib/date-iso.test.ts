import { describe, expect, it } from "vitest";
import { dayFirstToIso, maskDayFirst } from "./date-iso";

describe("typed dates, day first (#155)", () => {
  it("adds the slashes as digits are typed", () => {
    expect(maskDayFirst("1")).toBe("1");
    expect(maskDayFirst("140")).toBe("14/0");
    expect(maskDayFirst("14031990")).toBe("14/03/1990");
    expect(maskDayFirst("14/03/1990999")).toBe("14/03/1990");
    expect(maskDayFirst("14-03-1990")).toBe("14/03/1990");
  });

  it("reads a whole real day, never month first", () => {
    expect(dayFirstToIso("14/03/1990")).toBe("1990-03-14");
    expect(dayFirstToIso("03/12/1990")).toBe("1990-12-03");
    expect(dayFirstToIso("31/02/1990")).toBeUndefined();
    expect(dayFirstToIso("14/13/1990")).toBeUndefined();
    expect(dayFirstToIso("14/03/19")).toBeUndefined();
  });
});
