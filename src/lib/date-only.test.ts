import { describe, expect, it } from "vitest";
import { formatDateOnly, parseDateOnly } from "./date-only";

describe("date-only utilities", () => {
  it("preserves a selected travel date without UTC shifting", () => {
    const parsed = parseDateOnly("2026-06-04");

    expect(parsed).toBeDefined();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(5);
    expect(parsed?.getDate()).toBe(4);
    expect(formatDateOnly(parsed!)).toBe("2026-06-04");
  });

  it("rejects malformed travel dates", () => {
    expect(parseDateOnly("06/04/2026")).toBeUndefined();
    expect(parseDateOnly("")).toBeUndefined();
  });
});
