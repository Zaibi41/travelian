import { describe, expect, it } from "vitest";
import { refundStatus } from "./fare-refund";

describe("refundStatus (#149)", () => {
  it("is unknown when the fare says nothing or only the fallback", () => {
    expect(refundStatus(undefined)).toBeNull();
    expect(refundStatus(null, "As per airline fare rules")).toBeNull();
    expect(refundStatus(undefined, "", null)).toBeNull();
  });
  it("reads refundable and non-refundable from the flag or the rule text", () => {
    expect(refundStatus(true)).toBe("refundable");
    expect(refundStatus(false, "Refundable")).toBe("non_refundable");
    expect(refundStatus(undefined, "Refundable with fee")).toBe("refundable");
    expect(refundStatus(undefined, "Non-Refundable")).toBe("non_refundable");
    expect(refundStatus(true, "No refund after departure")).toBe("non_refundable");
    expect(refundStatus(undefined, "Not refundable")).toBe("non_refundable");
  });
});
