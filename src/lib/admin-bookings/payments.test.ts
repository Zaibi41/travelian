import { describe, expect, it } from "vitest";
import { isClockTime, paisaToInput, receivedAtIso, recordedByLabel, rupeesToPaisa } from "./payments";

describe("rupeesToPaisa (input parsing only; the gateway checks the amount)", () => {
  it.each([
    ["15316", 1_531_600], ["15,316", 1_531_600], ["Rs 15,316.5", 1_531_650], ["rs.15316.50", 1_531_650], ["0.01", 1], [" 1,000,000 ", 100_000_000],
  ])("%s -> %i paisa", (input, paisa) => expect(rupeesToPaisa(input)).toBe(paisa));

  it.each(["", "0", "0.00", "-5", "12.345", "1e5", "abc", "12.", ".5", "15 316"])("refuses %j", input => expect(rupeesToPaisa(input)).toBeNull());

  it("is exact for amounts that floating point gets wrong", () => {
    expect(rupeesToPaisa("0.29")).toBe(29);
    expect(rupeesToPaisa("1234567.89")).toBe(123_456_789);
  });
});

describe("paisaToInput", () => {
  it("whole rupees without decimals, otherwise two decimals", () => {
    expect(paisaToInput(1_531_600)).toBe("15316");
    expect(paisaToInput(1_531_605)).toBe("15316.05");
  });
});

describe("received at", () => {
  it("24-hour times only", () => {
    expect(isClockTime("14:05")).toBe(true);
    expect(isClockTime("00:00")).toBe(true);
    expect(isClockTime("24:00")).toBe(false);
    expect(isClockTime("2:05")).toBe(false);
    expect(isClockTime("2:05 PM")).toBe(false);
  });

  it("local date and time become one instant; impossible dates are refused", () => {
    const iso = receivedAtIso("2026-11-10", "14:05")!;
    const back = new Date(iso);
    expect([back.getFullYear(), back.getMonth(), back.getDate(), back.getHours(), back.getMinutes()]).toEqual([2026, 10, 10, 14, 5]);
    expect(receivedAtIso("2026-02-30", "10:00")).toBeNull();
    expect(receivedAtIso(undefined, "10:00")).toBeNull();
    expect(receivedAtIso("2026-11-10", "25:00")).toBeNull();
  });
});

describe("recordedByLabel", () => {
  it("shows the role the gateway sends", () => {
    expect(recordedByLabel("super_admin")).toBe("Super Admin");
    expect(recordedByLabel(null)).toBe("—");
  });
});
