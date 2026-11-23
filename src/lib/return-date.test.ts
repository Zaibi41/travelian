import { describe, expect, it } from "vitest";
import { keepReturnDate, returnDateError } from "./return-date";

const d = (iso: string) => new Date(`${iso}T00:00:00`);

describe("return date rules (#151)", () => {
  it("keeps a return on or after the departure and clears an earlier one", () => {
    expect(keepReturnDate(d("2026-12-08"), d("2026-12-10"))).toEqual(d("2026-12-10"));
    expect(keepReturnDate(d("2026-12-08"), d("2026-12-08"))).toEqual(d("2026-12-08"));
    expect(keepReturnDate(d("2026-12-08"), d("2026-12-01"))).toBeUndefined();
    expect(keepReturnDate(undefined, d("2026-12-01"))).toEqual(d("2026-12-01"));
    expect(keepReturnDate(d("2026-12-08"), undefined)).toBeUndefined();
  });

  it("says what is wrong with the return date", () => {
    expect(returnDateError(d("2026-12-08"), undefined)).toBe("Choose a return date");
    expect(returnDateError(d("2026-12-08"), d("2026-12-01"))).toBe("Return must be on or after 8 Dec");
    expect(returnDateError(d("2026-12-08"), d("2026-12-08"))).toBeUndefined();
    // Same day, different times: still the same day.
    expect(returnDateError(new Date("2026-12-08T15:00:00"), d("2026-12-08"))).toBeUndefined();
  });
});
