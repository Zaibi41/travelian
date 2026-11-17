import { describe, expect, it } from "vitest";
import { formatDay, formatTime, parseDayFirst } from "./date-display";

describe("search flow dates", () => {
  it("shows dates day first and times in 24-hour form", () => {
    expect(formatDay("2026-11-24")).toBe("24 Nov 2026");
    expect(formatDay("2026-01-05")).toBe("5 Jan 2026");
    expect(formatDay("")).toBe("");
    expect(formatDay("not a date")).toBe("");
    expect(formatTime("2026-11-24T23:05")).toBe("23:05");
    expect(formatTime("2026-11-24T07:30")).toBe("07:30");
  });

  it("reads typed dates day first, never month first", () => {
    expect(parseDayFirst("24/11/2026")).toBe("2026-11-24");
    expect(parseDayFirst("5/1/2026")).toBe("2026-01-05");          // 5 January, not 1 May
    expect(parseDayFirst("24-11-2026")).toBe("2026-11-24");
    expect(parseDayFirst("24 Nov 2026")).toBe("2026-11-24");
    expect(parseDayFirst("24 november 2026")).toBe("2026-11-24");
    expect(parseDayFirst("2026-11-24")).toBe("2026-11-24");
  });

  it("refuses dates that don't exist", () => {
    expect(parseDayFirst("31/02/2026")).toBeNull();
    expect(parseDayFirst("11/24/2026")).toBeNull();                 // month first is not a valid day-first date
    expect(parseDayFirst("2026-02-30")).toBeNull();
    expect(parseDayFirst("tomorrow")).toBeNull();
    expect(parseDayFirst("")).toBeNull();
  });
});
