import { describe, expect, it } from "vitest";
import { dateFilterFromParam, dateRange } from "./date-range";

describe("finance date range", () => {
  it("defaults to All (no limits)", () => {
    expect(dateFilterFromParam(null)).toBe("all");
    expect(dateFilterFromParam("bogus")).toBe("all");
    expect(dateRange("all")).toEqual({});
  });
  it("uses Pakistan days (UTC+5)", () => {
    const lateUtc = new Date("2026-11-20T20:30:00Z"); // 21 Nov 01:30 PKT
    expect(dateRange("today", lateUtc)).toEqual({ date_from: "2026-11-21", date_to: "2026-11-21" });
    expect(dateRange("7d", lateUtc)).toEqual({ date_from: "2026-11-15", date_to: "2026-11-21" });
    expect(dateRange("month", lateUtc)).toEqual({ date_from: "2026-11-01", date_to: "2026-11-21" });
  });
});
