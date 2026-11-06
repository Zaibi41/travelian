import { describe, expect, it } from "vitest";
import { maskDate, maskDocumentNumber, matchesMaskedDocument } from "./masking";

describe("identity masking (spec: last digits only; date of birth hidden)", () => {
  it("shows only the last 4 characters of a document number", () => {
    expect(maskDocumentNumber("PK1234567")).toBe("•••••4567");
    expect(maskDocumentNumber("  AB9876543  ")).toBe("•••••6543");
    expect(maskDocumentNumber("123")).toBe("•••");
    expect(maskDocumentNumber("")).toBe("-");
    expect(maskDocumentNumber(undefined)).toBe("-");
  });

  it("never shows any part of a date of birth", () => {
    expect(maskDate("1988-04-12")).not.toMatch(/\d/);
    expect(maskDate("")).toBe("-");
  });

  it("lets search match only the visible last digits", () => {
    expect(matchesMaskedDocument("PK1234567", "4567")).toBe(true);
    expect(matchesMaskedDocument("PK1234567", "567")).toBe(true);
    expect(matchesMaskedDocument("PK1234567", "PK1234567")).toBe(false); // full value needs the reveal permission
    expect(matchesMaskedDocument("PK1234567", "1234")).toBe(false); // hidden digits
    expect(matchesMaskedDocument("PK1234567", " ")).toBe(false);
  });
});
